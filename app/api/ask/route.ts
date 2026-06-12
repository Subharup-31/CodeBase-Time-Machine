import { z } from 'zod';
import { getRepoByName, getAllRepos } from "@/lib/repoRegistry";
import { runOrchestrator } from "@/lib/agentEngine";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";
import fs from 'fs';
import path from 'path';
import { getSingleEmbedding } from "@/lib/openrouter";
import { storeChatMemory, retrieveChatMemories } from "@/lib/pinecone";

const AskRequestSchema = z.object({
    query: z.string().trim().min(1, { message: "Please provide a question." }),
    activeRepo: z.string().optional(),
    history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        repo: z.string().optional()
    })).optional(),
    chatId: z.string().optional(),
    activeSymbolId: z.string().optional()
});

// Safe lazy initialization — avoids module-level crash if env vars are absent
function getRedis(): Redis | null {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
    return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
}

function getSystemRules(): string {
    try {
        const ctmPath = path.join(process.cwd(), 'ctm.json');
        if (fs.existsSync(ctmPath)) {
            const raw = fs.readFileSync(ctmPath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed.rules && Array.isArray(parsed.rules)) {
                return `[Workspace Rules from ctm.json]:\n${parsed.rules.map((r: string) => `- ${r}`).join('\n')}`;
            }
        }
    } catch (e) {
        console.warn("[Ask] Error reading ctm.json workspace rules:", e);
    }
    return "";
}

function sseChunk(payload: object): Uint8Array {
    return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(req: Request) {
    // Auth guard — prevents anonymous callers from draining OpenRouter credits
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return new Response("Unauthorized", { status: 401 });
    }

    const redis = getRedis();

    let rawBody: unknown;
    try {
        rawBody = await req.json();
    } catch {
        return new Response("Invalid JSON body", { status: 400 });
    }

    const parseResult = AskRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
        return new Response(
            `data: ${JSON.stringify({ type: "error", message: parseResult.error.issues[0].message })}\n\n`,
            { status: 400, headers: { "Content-Type": "text/event-stream" } }
        );
    }
    const { query, activeRepo: activeRepoParam, history, chatId, activeSymbolId } = parseResult.data;

    // Resolve target repo:
    const repoMatch = query.match(/@([\w-]+)/);
    let cleanQuery = query;
    let activeRepoName: string | null = null;
    let namespaceName = "";
    let repoUrl = "";

    if (repoMatch) {
        const requestedName = repoMatch[1];
        const repo = await getRepoByName(requestedName);
        if (repo) {
            activeRepoName = repo.name;
            namespaceName = repo.namespace;
            repoUrl = repo.url;

            const mention = repoMatch[0];
            if (query.startsWith(mention)) {
                cleanQuery = query.slice(mention.length).trim();
            } else {
                cleanQuery = query.replace(mention, requestedName).trim();
            }
        } else {
            const reposList = await getAllRepos();
            const allRepos = reposList.map((r) => `@${r.name}`).join(", ");
            return new Response(
                `data: ${JSON.stringify({
                    type: "meta",
                    repo: null,
                })}\n\ndata: ${JSON.stringify({
                    type: "chunk",
                    text: `Repository '@${requestedName}' not found. Available repos: ${allRepos || "None — index one first!"}`,
                })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
                { headers: { "Content-Type": "text/event-stream" } }
            );
        }
    } else {
        // No explicit mention in current query. Look for context in history.
        let historicalRepoName: string | undefined;
        if (history && history.length > 0) {
            // Traverse history backwards to find the last message with a repo context
            for (let i = history.length - 1; i >= 0; i--) {
                if (history[i].repo) {
                    historicalRepoName = history[i].repo;
                    break;
                }
            }
        }

        const targetRepoName = historicalRepoName || activeRepoParam;

        if (targetRepoName) {
            const repo = await getRepoByName(targetRepoName);
            if (repo) {
                activeRepoName = repo.name;
                namespaceName = repo.namespace;
                repoUrl = repo.url;
            }
        }
    }

    if (!activeRepoName) {
        const allRepos = await getAllRepos();
        if (allRepos.length === 1) {
            // Exactly one repo, use it automatically
            const repo = allRepos[0];
            activeRepoName = repo.name;
            namespaceName = repo.namespace;
            repoUrl = repo.url;
        } else if (allRepos.length > 1) {
            // Multiple repos, ask the user to clarify
            const allReposMentions = allRepos.map((r) => `@${r.name}`).join(", ");
            return new Response(
                `data: ${JSON.stringify({
                    type: "meta",
                    repo: null,
                })}\n\ndata: ${JSON.stringify({
                    type: "chunk",
                    text: `Which repository would you like to ask about? Please mention it in your query using \`@reponame\`. \n\nAvailable repositories:\n${allRepos.map(r => `- **@${r.name}**`).join('\n')}`,
                })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
                { headers: { "Content-Type": "text/event-stream" } }
            );
        } else {
            // Zero repos
            return new Response(
                `data: ${JSON.stringify({ type: "meta", repo: null })}\n\ndata: ${JSON.stringify({
                    type: "chunk",
                    text: "You haven't indexed any repositories yet. Please go to the **Repository Manager** to add and index a repository.",
                })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
                { headers: { "Content-Type": "text/event-stream" } }
            );
        }
    }

    // Retrieve workspace rules and past memory context
    const workspaceRules = getSystemRules();
    let memoryContext = "";
    if (chatId) {
        try {
            const queryVec = await getSingleEmbedding(cleanQuery);
            const pastMemories = await retrieveChatMemories(chatId, queryVec, 3, activeSymbolId);
            if (pastMemories.length > 0) {
                memoryContext = `[Relevant Past Messages from this Chat]:\n${pastMemories.map(m => `- ${m.role}: ${m.content}`).join('\n')}\n\n`;
            }
        } catch (e) {
            console.error("[Ask] Error retrieving chat memory:", e);
        }
    }

    let cleanQueryWithMemory = cleanQuery;
    if (workspaceRules || memoryContext) {
        cleanQueryWithMemory = `${workspaceRules ? workspaceRules + '\n\n' : ''}${memoryContext ? memoryContext : ''}User Question: ${cleanQuery}`;
    }

    const cacheKey = `ask:${activeRepoName}:${crypto.createHash('sha256').update(cleanQueryWithMemory).digest('hex')}`;

    console.log(`[Ask] Query: "${cleanQuery}" | Repo: ${activeRepoName} | Namespace: ${namespaceName}`);

    // Check Redis Cache (only if Redis is configured)
    if (redis) {
        try {
            const cachedResponse = await redis.get<string>(cacheKey);
            if (cachedResponse) {
                console.log(`[Ask] Cache HIT for query: "${cleanQuery}"`);
                const stream = new ReadableStream({
                    start(controller) {
                        const send = (payload: object) => {
                            try {
                                controller.enqueue(sseChunk(payload));
                            } catch {}
                        };
                        send({ type: "meta", repo: activeRepoName, mode: "agent", cached: true });
                        send({ type: "chunk", text: cachedResponse });
                        send({ type: "done" });
                        controller.close();
                    }
                });
                return new Response(stream, {
                    headers: {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache, no-transform",
                        Connection: "keep-alive",
                        "X-Accel-Buffering": "no",
                    },
                });
            }
        } catch (e) {
            console.error("[Ask] Redis cache read error:", e);
        }
    }

    const stream = new ReadableStream({
        async start(controller) {
            const send = (payload: object) => {
                try {
                    controller.enqueue(sseChunk(payload));
                } catch {
                    // Stream already closed
                }
            };

            try {
                // Send metadata immediately so UI can start rendering the bubble
                send({ type: "meta", repo: activeRepoName, mode: "agent" });

                // Send periodic keep-alive pings to prevent gateway timeouts (e.g. Vercel 504)
                const pingInterval = setInterval(() => {
                    send({ type: "ping" });
                }, 15000);

                let fullResponse = "";

                try {
                    // Run the orchestrator — this will stream tokens in real-time if supported
                    await runOrchestrator(cleanQueryWithMemory, repoUrl, namespaceName, user.id, (token) => {
                        fullResponse += token;
                        send({ type: "chunk", text: token });
                    });
                    clearInterval(pingInterval);

                    // Cache the completed response in Redis for 24 hours (if Redis is configured)
                    if (redis) {
                        try {
                            await redis.setex(cacheKey, 86400, fullResponse);
                        } catch (redisErr) {
                            console.error("[Ask] Redis cache write error:", redisErr);
                        }
                    }

                    // Store user query and assistant response in Pinecone memory asynchronously
                    if (chatId) {
                        try {
                            const userEmbed = await getSingleEmbedding(cleanQuery);
                            await storeChatMemory(chatId, crypto.randomUUID(), "user", cleanQuery, userEmbed, activeSymbolId);
                            
                            if (fullResponse) {
                                const assistantEmbed = await getSingleEmbedding(fullResponse);
                                await storeChatMemory(chatId, crypto.randomUUID(), "assistant", fullResponse, assistantEmbed, activeSymbolId);
                            }
                        } catch (e) {
                            console.error("[Ask] Error storing chat memory:", e);
                        }
                    }

                    send({ type: "done" });
                } catch (err) {
                    clearInterval(pingInterval);
                    throw err;
                }
            } catch (err: any) {
                console.error("[Ask] Error:", err);
                send({ type: "error", message: err?.message || "An error occurred while generating the answer." });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}

                                                                                                        
