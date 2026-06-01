import { fetchCommitHistory, fetchCommitDetails } from "./git";
import { getEmbeddings, callOpenRouter } from "./openrouter";
import { storeVectors } from "./pinecone";
import { CodeChunk } from "@/types";
import { v4 as uuidv4 } from "uuid";

export interface ProgressEvent {
    message: string;
    percent: number; // 0-100
}

/**
 * Uses an LLM to generate a semantic summary of a code diff.
 * Explains WHAT changed, not just the raw patch lines.
 * Only runs if ENABLE_SEMANTIC_SUMMARIES=true in env.
 */
async function generateDiffSummary(
    filename: string,
    commitMessage: string,
    patch: string
): Promise<string> {
    if (process.env.ENABLE_SEMANTIC_SUMMARIES !== 'true') return '';
    const truncatedPatch = patch.slice(0, 1500);
    try {
        const response = await callOpenRouter([
            {
                role: "system",
                content: "You are a senior software engineer. Given a code diff, provide a 2-3 sentence semantic summary of what actually changed in terms of behavior, logic, or structure. Be specific and technical. Do not describe the diff format itself."
            },
            {
                role: "user",
                content: `File: ${filename}\nCommit Message: ${commitMessage}\n\nDiff:\n${truncatedPatch}\n\nSummarize what changed semantically in 2-3 sentences:`
            }
        ], {
            model: "meta-llama/llama-3.2-3b-instruct:free"
        });
        return response.content || '';
    } catch (e) {
        return ''; // Graceful fallback — no summary
    }
}

/**
 * Indexes the evolution (commits and diff patches) of a repository.
 */
export async function processRepositoryEvolution(
    repoUrl: string,
    collectionName: string,
    commitLimit: number = 30,
    onProgress?: (e: ProgressEvent) => void
): Promise<number> {
    console.log(`[Evolution] Processing repo evolution: ${repoUrl} -> Collection: ${collectionName}`);
    onProgress?.({ message: `Fetching last ${commitLimit} commits from GitHub...`, percent: 0 });

    // 1. Fetch recent commit history
    const commits = await fetchCommitHistory(repoUrl, commitLimit);
    console.log(`[Evolution] Found ${commits.length} commits`);
    onProgress?.({ message: `Found ${commits.length} commits. Processing diffs...`, percent: 10 });

    if (commits.length === 0) {
        console.warn("[Evolution] No commits found to index.");
        return 0;
    }

    const chunks: CodeChunk[] = [];
    let processedCommits = 0;

    // 2. Fetch details (diffs) for each commit in parallel
    const commitDetails = await Promise.all(
        commits.map(async (commit) => {
            try {
                console.log(`[Evolution] Fetching details for commit: ${commit.sha.slice(0, 7)}...`);
                const details = await fetchCommitDetails(repoUrl, commit.sha);

                processedCommits++;
                onProgress?.({
                    message: `Analyzed ${processedCommits}/${commits.length} commits...`,
                    percent: 10 + Math.floor((processedCommits / commits.length) * 40),
                });

                return details;
            } catch (err) {
                console.error(`[Evolution] Error fetching commit details for ${commit.sha}:`, err);
                return null;
            }
        })
    );

    for (const details of commitDetails) {
        if (!details || !details.files) continue;

        for (const file of details.files) {
            if (!file.patch || file.patch.trim().length === 0) {
                continue; // Skip files with no diff content (e.g. binary files, simple renames)
            }

            // If patch is extremely large, split it by diff hunks or slice it
            const maxPatchLen = 3000;
            let patchContent = file.patch;
            let isTruncated = false;

            if (patchContent.length > maxPatchLen) {
                patchContent = patchContent.slice(0, maxPatchLen);
                isTruncated = true;
            }

            // Format the code evolution chunk text
            const semanticSummary = await generateDiffSummary(
                file.filename,
                details.message.split("\n")[0],
                patchContent
            );

            const formattedText = [
                `Commit: ${details.sha.slice(0, 7)}`,
                `Author: ${details.author}`,
                `Date: ${details.date}`,
                `Message: ${details.message.split("\n")[0]}`,
                `File: ${file.filename}`,
                `Action: ${file.status}`,
                semanticSummary ? `Semantic Summary: ${semanticSummary}` : "",
                `Diff Patch${isTruncated ? " (Truncated)" : ""}:`,
                patchContent
            ].filter(Boolean).join("\n");

            chunks.push({
                id: uuidv4(),
                text: formattedText,
                filePath: file.filename,
                commit: details.sha
            });
        }
    }

    if (chunks.length === 0) {
        console.warn("[Evolution] No code diffs were found to index.");
        return 0;
    }

    console.log(`[Evolution] Total diff chunks generated: ${chunks.length}. Generating embeddings...`);
    onProgress?.({ message: `Generated ${chunks.length} diff chunks. Creating embeddings...`, percent: 50 });

    // 3. Generate embeddings in batches of 100 to prevent API rate limits
    const batchSize = 100;
    const totalBatches = Math.ceil(chunks.length / batchSize);
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchTexts = batch.map(c => c.text);
        const batchNum = Math.floor(i / batchSize) + 1;

        try {
            console.log(`[Evolution] Generating embeddings for batch ${batchNum}/${totalBatches}...`);
            onProgress?.({
                message: `Embedding commit diffs (batch ${batchNum}/${totalBatches})...`,
                percent: 50 + Math.floor((batchNum / totalBatches) * 40),
            });
            const embeddings = await getEmbeddings(batchTexts);

            // Assign embeddings back to chunk objects
            for (let j = 0; j < batch.length; j++) {
                batch[j].embedding = embeddings[j];
            }
        } catch (err) {
            console.error("[Evolution] Failed to generate embeddings for batch:", err);
            throw err;
        }
    }

    // 4. Store vectors in Qdrant
    console.log(`[Evolution] Storing ${chunks.length} vectors in Qdrant...`);
    onProgress?.({ message: `Storing ${chunks.length} diff vectors in knowledge base...`, percent: 92 });
    await storeVectors(collectionName, chunks);

    onProgress?.({ message: `Commit history indexed! ${chunks.length} changes mapped.`, percent: 100 });
    console.log("[Evolution] Evolution indexing complete!");
    return chunks.length;
}


