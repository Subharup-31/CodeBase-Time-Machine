import { NextResponse } from "next/server";
import { getRepoByName, getAllRepos } from "@/lib/repoRegistry";
import { detectMode } from "@/lib/detectMode";
import { searchVectors, getCollectionName } from "@/lib/qdrant";
import { generateAnswerWithContext, embedText, expandKeywordsWithAI, generateTestPlan, generateSecurityAudit, generateCodeHealthReport, generateDebugReport, generateFlowModeAnswer } from "@/lib/gemini";
import { analyzeCodeFlow } from "@/lib/flowEngine";
import { generateFlowPrompt } from "@/lib/prompt.flow";
import { fetchRepoTree, fetchFileCommits, resolveFilePathByName, fetchCommitHistory, fetchCommitDetails, searchCode, fetchFileContent } from "@/lib/git";

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

        // 3. Detect Mode (Flow vs Timeline vs Command vs Test)
        const mode = detectMode(cleanQuery);

        console.log(`Query: "${cleanQuery}" | Mode: ${mode} | Repo: ${activeRepoName}`);

        // --- COMMAND MODE ---
        // ... (existing command mode logic)

        // --- TIMELINE MODE ---
        // ... (existing timeline mode logic)

        // --- TEST MODE (NEW) ---
        if (mode === "test") {
            console.log("[Ask] Test mode detected");

            // Fetch file list to give context about project structure
            const allFiles = await fetchRepoTree(repoUrl, false);
            const fileList = allFiles.slice(0, 50).map(f => `- ${f.path}`).join("\n");

            // Also try to read key configuration files to help detect project type
            const keyFiles = ["package.json", "requirements.txt", "index.html", "next.config.js", "vite.config.js", "Dockerfile"];
            let contextContent = `Project Structure (first 50 files):\n${fileList}\n\n`;

            // Try to fetch content of key files if they exist
            // We use a simplified approach: just try to resolve and fetch
            for (const filename of keyFiles) {
                try {
                    const resolved = await resolveFilePathByName(repoUrl, filename);
                    if (resolved) {
                        const commits = await fetchFileCommits(repoUrl, resolved, 1);
                        // We strictly don't have a direct "fetchFileContent" in the imports above, 
                        // but searchCode could work, or we rely on just knowing they exist.
                        // Actually, looking at imports, we don't have a direct 'fetchContent' imported in this file.
                        // We can reuse 'CodeChunk' logic or just rely on structure. 
                        // For better results, let's rely on structure + user query context.
                        contextContent += `File exists: ${filename}\n`;
                    }
                } catch (e) {
                    // Ignore missing files
                }
            }

            const answer = await generateTestPlan(activeRepoName || "Repository", contextContent);

            return NextResponse.json({
                mode: "test",
                repo: activeRepoName,
                answer,
                mermaid: answer.includes("graph TD") || answer.includes("sequenceDiagram") ? "mermaid" : null
            });
        }

        // --- SECURITY MODE ---
        if (mode === "security") {
            console.log("[Ask] Security mode detected");

            // 1. Fetch File Structure (Context Layer 1)
            const allFiles = await fetchRepoTree(repoUrl, false);
            const fileList = allFiles.slice(0, 50).map(f => `- ${f.path}`).join("\n");

            let contextContent = `Project File Structure (first 50 files):\n${fileList}\n\n`;

            // 2. Fetch Key Config Files (Context Layer 2)
            const keyFiles = ["package.json", "requirements.txt", "Dockerfile", ".env.example", "next.config.js", "vite.config.js"];

            for (const filename of keyFiles) {
                try {
                    const resolved = await resolveFilePathByName(repoUrl, filename);
                    if (resolved) {
                        const content = await fetchFileContent(repoUrl, resolved);
                        if (content) {
                            contextContent += `File: ${resolved}\nContent:\n${content.slice(0, 5000)}\n\n---\n\n`;
                        }
                    }
                } catch (e) {
                    // Ignore missing files
                }
            }

            // 3. Vector Search (Context Layer 3 - Specific Logic)
            const queryEmbedding = await embedText(query);
            const chunks = await searchVectors(collectionName, queryEmbedding, 5);
            if (chunks.length > 0) {
                contextContent += `Random Code Snippets for Security Check:\n${chunks.map(c => `File: ${c.filePath}\n${c.text}`).join("\n\n")}`;
            }

            const answer = await generateSecurityAudit(activeRepoName || "Repository", contextContent);

            return NextResponse.json({
                mode: "security",
                repo: activeRepoName,
                answer,
                mermaid: answer.includes("graph") || answer.includes("sequenceDiagram") ? "mermaid" : null
            });
        }

        // --- CODE HEALTH MODE ---
        if (mode === "health") {
            console.log("[Ask] Health mode detected");

            // 1. Fetch File Structure (Context Layer 1)
            const allFiles = await fetchRepoTree(repoUrl, false);
            const fileList = allFiles.slice(0, 50).map(f => `- ${f.path}`).join("\n");

            let contextContent = `Project File Structure (first 50 files):\n${fileList}\n\n`;

            // 2. Fetch Key Config Files (Context Layer 2)
            const keyFiles = ["package.json", "README.md", "tsconfig.json", "next.config.js", "vite.config.js", "requirements.txt", "Dockerfile"];

            for (const filename of keyFiles) {
                try {
                    const resolved = await resolveFilePathByName(repoUrl, filename);
                    if (resolved) {
                        const content = await fetchFileContent(repoUrl, resolved);
                        if (content) {
                            contextContent += `File: ${resolved}\nContent:\n${content.slice(0, 5000)}\n\n---\n\n`;
                        }
                    }
                } catch (e) {
                    // Ignore missing files
                }
            }

            // 3. Vector Search (Context Layer 3 - Specific Logic)
            const queryEmbedding = await embedText(query);
            const chunks = await searchVectors(collectionName, queryEmbedding, 5);
            if (chunks.length > 0) {
                contextContent += `Random Code Snippets for Quality Check:\n${chunks.map(c => `File: ${c.filePath}\n${c.text}`).join("\n\n")}`;
            }

            const answer = await generateCodeHealthReport(activeRepoName || "Repository", contextContent);

            return NextResponse.json({
                mode: "health",
                repo: activeRepoName,
                answer,
                mermaid: answer.includes("graph") || answer.includes("radar") ? "mermaid" : null
            });
        }

        // --- DEBUG MODE ---
        if (mode === "debug") {
            console.log("[Ask] Debug mode detected");

            // 1. Keyword Extraction & Expansion (NLP)
            const stopWords = ["why", "is", "the", "not", "working", "broken", "fail", "failing", "error", "bug", "issue", "regression", "fix", "help", "me", "with", "does", "how", "what", "when", "did", "break", "stopped"];
            const rawKeywords = cleanQuery.toLowerCase().split(/\s+/).filter((w: string) => !stopWords.includes(w) && w.length > 2);

            let searchTerms = rawKeywords;
            if (rawKeywords.length > 0) {
                try {
                    console.log("[Debug] Expanding keywords:", rawKeywords);
                    searchTerms = await expandKeywordsWithAI(rawKeywords);
                    console.log("[Debug] Expanded to:", searchTerms);
                } catch (e) {
                    console.warn("[Debug] Keyword expansion failed", e);
                }
            }

            // 2. Search for Code Context
            // We search using the ORIGINAL query (semantic) AND the expanded keywords (lexical emphasis)
            const queryEmbedding = await embedText(cleanQuery + " " + searchTerms.join(" "));
            const chunks = await searchVectors(collectionName, queryEmbedding, 8);

            // CRITICAL: Not Found Handling
            if (chunks.length === 0) {
                const topic = rawKeywords.length > 0 ? rawKeywords.join(", ") : "the requested feature";
                return NextResponse.json({
                    mode: "debug",
                    repo: activeRepoName,
                    answer: `I analyzed the repository for "${topic}" but could not find any relevant code or files.\n\nIt's possible that:\n1. The feature named "${topic}" does not exist in this codebase.\n2. It is named differently (try using technical terms).\n3. The code has not been indexed yet.`
                });
            }

            const codeContext = chunks.map(c => `File: ${c.filePath}\nContent:\n${c.text}`).join("\n\n---\n\n");

            // 3. Fetch Recent Commit Context (for "When did it break?")
            let commitContext = "No commit history available.";
            try {
                const history = await fetchCommitHistory(repoUrl, 20);
                if (history && history.length > 0) {
                    commitContext = history.map(c =>
                        `Commit: ${c.sha.slice(0, 7)} | Date: ${c.date} | Author: ${c.author}\nMessage: ${c.message}\n`
                    ).join("\n");
                }
            } catch (e) {
                console.warn("[Debug] Failed to fetch commit history", e);
            }

            // 4. Generate Debug Report
            const answer = await generateDebugReport(
                activeRepoName || "Repository",
                cleanQuery,
                codeContext,
                commitContext
            );

            return NextResponse.json({
                mode: "debug",
                repo: activeRepoName,
                answer,
                mermaid: answer.includes("graph") || answer.includes("sequenceDiagram") ? "mermaid" : null
            });
        }

        // --- FLOW MODE (EXISTING LOGIC) ---
        // 3. Handle Command Mode (File Listing)
        if (mode === "command") {
            // ... (existing command logic)
        }

        // ... (remaining flow mode logic)
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
            let rawFileName = fileNameMatch ? fileNameMatch[1] : null;

            // --- SMART FILE DETECTION ---
            if (!rawFileName) {
                const lowerQ = cleanQuery.toLowerCase();
                const stopWords = ["when", "was", "the", "added", "introduced", "fixed", "removed", "changed", "bug", "feature", "in", "on", "at", "to", "for", "how", "does", "work", "show", "me"];
                const keywords = lowerQ.split(/\s+/).filter((w: string) => !stopWords.includes(w) && w.length > 2);

                if (keywords.length > 0) {
                    console.log("[Timeline] Smart Detection: Looking for files matching keywords:", keywords);

                    // 1. Keyword Expansion (AI Powered)
                    let searchTerms: string[] = keywords;
                    try {
                        console.log("[Timeline] Expanding keywords with AI...");
                        searchTerms = await expandKeywordsWithAI(keywords);
                        console.log("[Timeline] AI Expanded keywords:", searchTerms);
                    } catch (e) {
                        console.error("[Timeline] AI expansion failed, using original keywords", e);
                    }
                    console.log("[Timeline] Expanded keywords:", searchTerms);

                    // 2. Fuzzy File Search (Tree)
                    try {
                        const tree = await fetchRepoTree(repoUrl, true); // Filtered tree
                        // Prioritize exact keyword matches in filename
                        const fuzzyMatch = tree.find((node: any) => {
                            const name = node.path.split("/").pop()?.toLowerCase() || "";
                            return searchTerms.some((term: string) => name.includes(term));
                        });

                        if (fuzzyMatch) {
                            console.log("[Timeline] Smart Detection: Found fuzzy file match:", fuzzyMatch.path);
                            rawFileName = fuzzyMatch.path;
                        }
                    } catch (e: any) {
                        console.error("[Timeline] Smart Detection: Tree search failed", e.message || e);
                    }

                    // 3. Code Content Search (GitHub Search API)
                    if (!rawFileName) {
                        try {
                            // Search for the first significant keyword
                            const query = searchTerms[0] as string;
                            console.log("[Timeline] Smart Detection: Searching code for:", query);
                            const codeMatches = await searchCode(repoUrl, query);

                            if (codeMatches.length > 0) {
                                console.log("[Timeline] Smart Detection: Found code match:", codeMatches[0]);
                                rawFileName = codeMatches[0];
                            }
                        } catch (e: any) {
                            console.error("[Timeline] Smart Detection: Code search failed", e.message || e);
                        }
                    }
                }
            }

            // --- REPO-LEVEL QUERIES (No specific file) ---
            if (!rawFileName) {
                const lowerQ = cleanQuery.toLowerCase();

                // A) Last Commit / Latest Commit
                if (/\b(last|latest)\s+commit\b/.test(lowerQ) || /\bwhat\s+changed\b/.test(lowerQ)) {
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

                    const diffSummary = details.files.slice(0, 5).map(f => `• ${f.status}: ${f.filename} (+${f.additions} -${f.deletions})`).join("\n");
                    const extraFiles = details.files.length > 5 ? `\n...and ${details.files.length - 5} more files.` : "";

                    const answer = `Summary:
The last commit was made on ${details.date.split("T")[0]} by ${details.author}.

Details:
• SHA: ${details.sha.slice(0, 7)}
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
                if (/\b(all\s+commits|history|log|commits)\b/.test(lowerQ)) {
                    const history = await fetchCommitHistory(repoUrl);
                    if (!history || history.length === 0) {
                        return NextResponse.json({
                            mode: "timeline",
                            repo: activeRepoName,
                            answer: "This repository has no commit history."
                        });
                    }

                    const list = history.map(c => `• ${c.date.split("T")[0]}: ${c.message.split("\n")[0]} - ${c.author} (${c.sha.slice(0, 7)})`).join("\n");

                    return NextResponse.json({
                        mode: "timeline",
                        repo: activeRepoName,
                        answer: `Here are the recent commits for @${activeRepoName}:\n\n${list}`
                    });
                }

                // C) Count Commits (Approximation based on recent fetch)
                if (/\b(how\s+many\s+commits|count)\b/.test(lowerQ)) {
                    const history = await fetchCommitHistory(repoUrl);
                    return NextResponse.json({
                        mode: "timeline",
                        repo: activeRepoName,
                        answer: `I found ${history.length} recent commits in @${activeRepoName}. (Note: This is a partial list retrieved from the API).`
                    });
                }

                // D) Keyword Search Fallback (e.g. "when was login added")
                const stopWords = ["when", "was", "the", "added", "introduced", "fixed", "removed", "changed", "bug", "feature", "in", "on", "at", "to", "for", "how", "does", "work"];
                const keywords = lowerQ.split(/\s+/).filter((w: string) => !stopWords.includes(w) && w.length > 2);

                if (keywords.length > 0) {
                    console.log("[Timeline] Attempting keyword search for:", keywords);
                    // Fetch more history for searching
                    const history = await fetchCommitHistory(repoUrl, 50);

                    const matches = history.filter(c => {
                        const msg = c.message.toLowerCase();
                        return keywords.some((k: string) => msg.includes(k));
                    });

                    if (matches.length > 0) {
                        const list = matches.slice(0, 5).map(c => `• **${c.date.split("T")[0]}**: ${c.message.split("\n")[0]} - *${c.author}* (\`${c.sha.slice(0, 7)}\`)`).join("\n");
                        return NextResponse.json({
                            mode: "timeline",
                            repo: activeRepoName,
                            answer: `I found these commits related to "${keywords.join(", ")}":\n\n${list}\n\n(Searched last 50 commits)`
                        });
                    } else {
                        return NextResponse.json({
                            mode: "timeline",
                            repo: activeRepoName,
                            answer: `I searched the last 50 commits for "${keywords.join(", ")}" but didn't find any matches. Try specifying a file name if you know it.`
                        });
                    }
                }

                // Fallback if no file and no specific repo command
                return NextResponse.json({
                    mode: "timeline",
                    repo: activeRepoName,
                    answer: "Timeline mode supports file-based questions (e.g., \"when was login.html added?\"), repo-level queries (e.g., \"show last commit\"), or keyword searches (e.g., \"when was login added\"). Please be more specific."
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

            answerLines.push(`Here is the commit timeline for ${resolvedPath} in @${activeRepoName}:`);
            answerLines.push("");
            answerLines.push(`• First added: ${oldest.date} by ${oldest.authorName}`);
            answerLines.push(`  - Commit: ${oldest.sha.slice(0, 7)}`);
            answerLines.push(`  - Message: ${oldest.message.split("\n")[0]}`);
            answerLines.push(`  - Link: ${oldest.htmlUrl}`);
            answerLines.push("");
            answerLines.push(`• Last modified: ${newest.date} by ${newest.authorName}`);
            answerLines.push(`  - Commit: ${newest.sha.slice(0, 7)}`);
            answerLines.push(`  - Message: ${newest.message.split("\n")[0]}`);
            answerLines.push(`  - Link: ${newest.htmlUrl}`);
            answerLines.push("");
            answerLines.push(`• Total commits touching this file: ${totalCommits}`);

            // Optional: include a short history preview
            const historyPreview = commits.slice(0, 5).map((c, index) => {
                return `  ${index + 1}. [${c.date}] ${c.authorName} — ${c.message.split("\n")[0]} (${c.sha.slice(0, 7)})`;
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
        // 3. Handle Command Mode (File Listing)
        if (mode === "command") {
            console.log("[Ask] Command mode detected");

            // Fetch ALL files (filter=false)
            const allFiles = await fetchRepoTree(repoUrl, false);

            // Parse limit from query (e.g. "list 10 files")
            const limitMatch = query.match(/(\d+)\s+files?/);
            const limit = limitMatch ? parseInt(limitMatch[1]) : allFiles.length;

            const filesToShow = allFiles.slice(0, limit);
            const fileList = filesToShow.map(f => `- ${f.path}`).join("\n");

            const answer = `Here are the files in ${activeRepoName}:\n\n${fileList}\n\n${limit < allFiles.length ? `(Showing ${limit} of ${allFiles.length} files)` : `(Total ${allFiles.length} files)`}`;

            return NextResponse.json({
                mode: "command",
                repo: activeRepoName,
                answer,
                context: []
            });
        }

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

        // Use the dedicated Flow Mode answer generator to avoid context conflicts
        const answer = await generateFlowModeAnswer(prompt);

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
