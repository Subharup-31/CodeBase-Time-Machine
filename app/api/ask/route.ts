import { z } from 'zod';
import { getRepoByName, getAllRepos } from "@/lib/repoRegistry";
import { runOrchestrator } from "@/lib/agentEngine";
import { Redis } from "@upstash/redis";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

const AskRequestSchema = z.object({
    query: z.string().trim().min(1, { message: "Please provide a question." }),
    activeRepo: z.string().optional()
});

// Safe lazy initialization — avoids module-level crash if env vars are absent
function getRedis(): Redis | null {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
    return new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
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
    const { query, activeRepo: activeRepoParam } = parseResult.data;

    // Resolve the target repo:
    // Priority: 1) @RepoName mention in query  2) activeRepo param  3) first indexed repo
    const repoMatch = query.match(/@([\w-]+)/);
    let cleanQuery = query;
    let activeRepoName: string | null = null;
    let collectionName = "";
    let repoUrl = "";

    if (repoMatch) {
        const requestedName = repoMatch[1];
        const repo = await getRepoByName(requestedName);
        if (repo) {
            activeRepoName = repo.name;
            collectionName = repo.collection;
            repoUrl = repo.url;
            cleanQuery = query.replace(repoMatch[0], "").trim();
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
    } else if (activeRepoParam) {
        const repo = await getRepoByName(activeRepoParam);
        if (repo) {
            activeRepoName = repo.name;
            collectionName = repo.collection;
            repoUrl = repo.url;
        }
    }

    if (!activeRepoName) {
        // Fall back to first repo
        const allRepos = await getAllRepos();
        if (allRepos.length > 0) {
            const repo = allRepos[0];
            activeRepoName = repo.name;
            collectionName = repo.collection;
            repoUrl = repo.url;
        } else {
            return new Response(
                `data: ${JSON.stringify({ type: "meta", repo: null })}\n\ndata: ${JSON.stringify({
                    type: "chunk",
                    text: "No repositories indexed yet. Go to Time Machine, paste a GitHub URL, and index a repository first.",
                })}\n\ndata: ${JSON.stringify({ type: "done" })}\n\n`,
                { headers: { "Content-Type": "text/event-stream" } }
            );
        }
    }

    const cacheKey = `ask:${activeRepoName}:${crypto.createHash('sha256').update(cleanQuery).digest('hex')}`;

    console.log(`[Ask] Query: "${cleanQuery}" | Repo: ${activeRepoName} | Collection: ${collectionName}`);

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
                    await runOrchestrator(cleanQuery, repoUrl, collectionName, user.id, (token) => {
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

                                                                                            
