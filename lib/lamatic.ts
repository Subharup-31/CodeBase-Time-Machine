import { fetchRepoTree, fetchFileContent, fetchCommitHistory } from "./git";
import { chunkText } from "./chunker";
import { embedText } from "./gemini";
import { storeVectors } from "./qdrant";

export async function runPipeline(repoUrl: string, collectionName: string = "codebase"): Promise<boolean> {
    console.log(`Starting pipeline for ${repoUrl} into collection ${collectionName}`);

    try {
        // 1. Fetch history (just to verify repo access and get latest commit info)
        const commits = await fetchCommitHistory(repoUrl);
        if (commits.length === 0) {
            console.error("No commits found");
            return false;
        }
        const latestCommit = commits[0];
        console.log(`Latest commit: ${latestCommit.sha}`);

        // 2. Fetch all files in the repo
        const files = await fetchRepoTree(repoUrl);
        console.log(`Found ${files.length} files`);

        let processedFiles = 0;

        for (const file of files) {
            // Skip non-code files or large assets
            // Skip empty paths
            if (!file.path) continue;

            try {
                const content = await fetchFileContent(repoUrl, file.path);
                if (!content) continue;

                // 3. Chunk text
                const chunks = chunkText(content, file.path, latestCommit.sha);

                // 4. Embed and store
                // Process in batches to avoid rate limits if needed, but for now sequential is safer
                for (const chunk of chunks) {
                    chunk.embedding = await embedText(chunk.text);
                }

                await storeVectors(collectionName, chunks);
                processedFiles++;
            } catch (err) {
                console.error(`Failed to process file ${file.path}:`, err);
            }
        }

        console.log(`Pipeline complete. Processed ${processedFiles} files.`);
        return true;
    } catch (error) {
        console.error("Pipeline failed:", error);
        return false;
    }
}


