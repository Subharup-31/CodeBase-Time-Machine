import { NextResponse } from "next/server";
import { getRepoByName, getAllRepos } from "@/lib/repoRegistry";
import { detectMode } from "@/lib/detectMode";
import { searchVectors, getCollectionName } from "@/lib/qdrant";
import { generateAnswerWithContext, embedText } from "@/lib/gemini";
import { analyzeCodeFlow } from "@/lib/flowEngine";
import { generateFlowPrompt } from "@/lib/prompt.flow";
import { fetchRepoTree, fetchFileCommits, resolveFilePathByName, fetchCommitHistory, fetchCommitDetails } from "@/lib/git";

export async function POST(req: Request) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ answer: "Please provide a question." }, { status: 400 });
        }

        // 1. Extract Repo Name (@RepoName)
        const repoMatch = query.match(/@(\w+)/);
        let activeRepoName = null;
        let cleanQuery = query;
        let collectionName = "";
        let repoUrl = "";

        if (repoMatch) {
            const requestedRepo = repoMatch[1];
            const repo = getRepoByName(requestedRepo);

            if (repo) {
                activeRepoName = repo.name;
                collectionName = getCollectionName(repo.name);
                repoUrl = repo.url;
                cleanQuery = query.replace(repoMatch[0], "").trim();
            } else {
                const allRepos = getAllRepos().map(r => `@${r.name}`).join(", ");
                return NextResponse.json({
                    answer: `Repository '@${requestedRepo}' not found. Available repos: ${allRepos || "None"}.`
                });
            }
        } else {
            return NextResponse.json({
                answer: "Please specify a repository using @RepoName (e.g., @sweetcrave how does auth work?)."
            });
        }

        // 3. Detect Mode (Flow vs Timeline vs Command)
        const mode = detectMode(cleanQuery);

        console.log(`Query: "${cleanQuery}" | Mode: ${mode} | Repo: ${activeRepoName}`);

        // --- COMMAND MODE ---
        if (mode === "command") {
            if (cleanQuery.toLowerCase().includes("list files")) {
                try {
                    const files = await fetchRepoTree(repoUrl);
                    const fileListArray = files
                        .slice(0, 50)
                        .map(f => f.path);

                    return NextResponse.json({
                        mode: "command",
                        command: "list_files",
                        repo: activeRepoName,
                        answer: `Here are the top ${fileListArray.length} files in ${activeRepoName}:\n\n${fileListArray.join("\n")}`,
                        files: fileListArray
                    });
                } catch (e) {
                    console.error("Command execution failed:", e);
                    return NextResponse.json({ answer: "Failed to fetch file list from GitHub." });
                }
            }
            return NextResponse.json({
                mode: "command",
                repo: activeRepoName,
                answer: "Command not recognized. Try 'list files'."
            });
        }

        // --- TIMELINE MODE (REAL GITHUB HISTORY) ---
        if (mode === "timeline") {
            console.log("[Timeline] Handling timeline query", { repo: activeRepoName, cleanQuery });

            if (!repoUrl) {
                return NextResponse.json({
                    mode: "timeline",
                    repo: activeRepoName,
                    answer: `Cannot resolve timeline because the repository URL is missing for @${activeRepoName}.`
                });
            }

            // 1) Try to detect a file name from the query
            const fileNameMatch = cleanQuery.match(/([a-zA-Z0-9_\-\/]+\.(js|ts|tsx|jsx|html|css|json))/);
            const rawFileName = fileNameMatch ? fileNameMatch[1] : null;

            // --- REPO-LEVEL QUERIES (No specific file) ---
            if (!rawFileName) {
                const lowerQ = cleanQuery.toLowerCase();

                // A) Last Commit / Latest Commit
                if (lowerQ.includes("last commit") || lowerQ.includes("latest commit") || lowerQ.includes("what changed")) {
                    const history = await fetchCommitHistory(repoUrl);
                    if (!history || history.length === 0) {
                        return NextResponse.json({
                            mode: "timeline",
                            repo: activeRepoName,
                            answer: "This repository has no commit history."
                        });
                    }
                    const lastCommit = history[0];
                    const details = await fetchCommitDetails(repoUrl, lastCommit.sha);

                    if (!details) {
                        return NextResponse.json({
                            mode: "timeline",
                            repo: activeRepoName,
                            answer: `Found the last commit (${lastCommit.sha.slice(0, 7)}) but could not fetch details.`
                        });
                    }

                    const diffSummary = details.files.slice(0, 5).map(f => `• ${f.status}: \`${f.filename}\` (+${f.additions} -${f.deletions})`).join("\n");
                    const extraFiles = details.files.length > 5 ? `\n...and ${details.files.length - 5} more files.` : "";

                    const answer = `Summary:
The last commit was made on **${details.date.split("T")[0]}** by **${details.author}**.

Details:
• SHA: \`${details.sha.slice(0, 7)}\`
• Message: ${details.message.split("\n")[0]}
• Date: ${details.date}
• Link: ${details.htmlUrl}

Diff Summary:
• Total: +${details.stats.additions} -${details.stats.deletions} lines
${diffSummary}${extraFiles}`;

                    return NextResponse.json({
                        mode: "timeline",
                        repo: activeRepoName,
                        answer
                    });
                }

                // B) All Commits / History / Log
                if (lowerQ.includes("all commits") || lowerQ.includes("history") || lowerQ.includes("log") || lowerQ.includes("commits")) {
                    const history = await fetchCommitHistory(repoUrl);
                    if (!history || history.length === 0) {
                        return NextResponse.json({
                            mode: "timeline",
                            repo: activeRepoName,
                            answer: "This repository has no commit history."
                        });
                    }

                    const list = history.map(c => `• **${c.date.split("T")[0]}**: ${c.message.split("\n")[0]} - *${c.author}* (\`${c.sha.slice(0, 7)}\`)`).join("\n");

                    return NextResponse.json({
                        mode: "timeline",
                        repo: activeRepoName,
                        answer: `Here are the recent commits for @${activeRepoName}:\n\n${list}`
                    });
                }

                // C) Count Commits (Approximation based on recent fetch)
                if (lowerQ.includes("how many commits") || lowerQ.includes("count")) {
                    const history = await fetchCommitHistory(repoUrl);
                    return NextResponse.json({
                        mode: "timeline",
                        repo: activeRepoName,
                        answer: `I found **${history.length}** recent commits in @${activeRepoName}. (Note: This is a partial list retrieved from the API).`
                    });
                }

                // Fallback if no file and no specific repo command
                return NextResponse.json({
                    mode: "timeline",
                    repo: activeRepoName,
                    answer: "Timeline mode supports file-based questions (e.g., \"when was login.html added?\") or repo-level queries (e.g., \"show last commit\", \"show history\"). Please be more specific."
                });
            }

            // --- FILE-LEVEL QUERIES (Existing Logic) ---
            const fileName = rawFileName.trim();

            // 2) Resolve the REAL file path inside the repo using the tree
            let resolvedPath: string | null = null;
            try {
                resolvedPath = await resolveFilePathByName(repoUrl, fileName);
            } catch (e) {
                console.error("[Timeline] Failed to resolve file path", e);
                return NextResponse.json({
                    mode: "timeline",
                    repo: activeRepoName,
                    answer: `Something went wrong while searching for ${fileName} in this repository.`
                });
            }

            if (!resolvedPath) {
                return NextResponse.json({
                    mode: "timeline",
                    repo: activeRepoName,
                    answer: `The file "${fileName}" does not exist in this repository.`
                });
            }

            // 3) Fetch commits for this specific file
            let commits;
            try {
                commits = await fetchFileCommits(repoUrl, resolvedPath, 20);
            } catch (e) {
                console.error("[Timeline] Failed to fetch file commits", e);
                return NextResponse.json({
                    mode: "timeline",
                    repo: activeRepoName,
                    answer: `Unable to fetch commit history for "${resolvedPath}".`
                });
            }

            if (!commits || commits.length === 0) {
                return NextResponse.json({
                    mode: "timeline",
                    repo: activeRepoName,
                    answer: `This file exists (${resolvedPath}), but commit history is not available from GitHub.`
                });
            }

            // 4) Compute addedAt and lastModifiedAt
            const newest = commits[0];
            const oldest = commits[commits.length - 1];
            const totalCommits = commits.length;

            const answerLines: string[] = [];

            answerLines.push(`Here is the commit timeline for \`${resolvedPath}\` in @${activeRepoName}:`);
            answerLines.push("");
            answerLines.push(`• First added: **${oldest.date}** by **${oldest.authorName}**`);
            answerLines.push(`  - Commit: \`${oldest.sha.slice(0, 7)}\``);
            answerLines.push(`  - Message: ${oldest.message.split("\n")[0]}`);
            answerLines.push(`  - Link: ${oldest.htmlUrl}`);
            answerLines.push("");
            answerLines.push(`• Last modified: **${newest.date}** by **${newest.authorName}**`);
            answerLines.push(`  - Commit: \`${newest.sha.slice(0, 7)}\``);
            answerLines.push(`  - Message: ${newest.message.split("\n")[0]}`);
            answerLines.push(`  - Link: ${newest.htmlUrl}`);
            answerLines.push("");
            answerLines.push(`• Total commits touching this file: **${totalCommits}**`);

            // Optional: include a short history preview
            const historyPreview = commits.slice(0, 5).map((c, index) => {
                return `  ${index + 1}. [${c.date}] ${c.authorName} — ${c.message.split("\n")[0]} (\`${c.sha.slice(0, 7)}\`)`;
            });

            if (historyPreview.length > 0) {
                answerLines.push("");
                answerLines.push("Recent history:");
                answerLines.push(...historyPreview);
            }

            const answerText = answerLines.join("\n");

            return NextResponse.json({
                mode: "timeline",
                repo: activeRepoName,
                file: resolvedPath,
                answer: answerText,
                timeline: {
                    file: resolvedPath,
                    addedAt: oldest.date,
                    addedBy: oldest.authorName,
                    addedCommit: oldest.sha,
                    lastModifiedAt: newest.date,
                    lastModifiedBy: newest.authorName,
                    lastModifiedCommit: newest.sha,
                    totalCommits,
                    commits
                }
            });
        }

        // --- FLOW MODE (EXISTING LOGIC) ---
        // 4. Generate Embedding for Query
        const queryEmbedding = await embedText(cleanQuery);

        // 5. Search Qdrant (Retrieve top 12 chunks)
        const rawChunks = await searchVectors(collectionName, queryEmbedding, 12);

        // Filter out markdown/docs
        const chunks = rawChunks.filter(c => {
            const lower = c.filePath.toLowerCase();
            return !lower.endsWith(".md") && !lower.endsWith(".markdown") && !lower.includes("readme");
        });

        // Debug log for retrieved chunks
        console.log("[Flow] Retrieved chunks:", chunks.map(c => ({ file: c.filePath, size: c.text.length, score: c.score })));

        // 6. Analyze Code Flow (Merge chunks & extract logic)
        const flowAnalysis = analyzeCodeFlow(chunks);

        // 7. Generate Prompt & Get Answer
        const contextText = chunks.map(c => `File: ${c.filePath}\n${c.text}`).join("\n\n");
        const prompt = generateFlowPrompt(cleanQuery, flowAnalysis, contextText);

        // Use the generic answer generator but pass the prompt as the query to bypass strict context if needed
        const answer = await generateAnswerWithContext(prompt, []); // Empty chunks to avoid double context

        return NextResponse.json({
            mode: "flow",
            repo: activeRepoName,
            answer,
            mermaid: flowAnalysis.empty ? null : "graph TD;",
            context: chunks
        });

    } catch (error) {
        console.error("Error in /api/ask:", error);
        return NextResponse.json({ answer: "Error processing request" }, { status: 500 });
    }
}
