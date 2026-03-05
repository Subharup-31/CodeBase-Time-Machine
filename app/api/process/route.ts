import { z } from 'zod';
import { addRepo, repoExists, getRepoByName } from "@/lib/repoRegistry";
import { getCollectionName } from "@/lib/pinecone";
import { parseGithubRepo } from "@/lib/git";
import { inngest } from "@/lib/inngest/client";
import { createClient } from "@/lib/supabase/server";

const ProcessRequestSchema = z.object({
    repoUrl: z.string().url().refine(url => /^https?:\/\/github\.com\/[^/]+\/[^/]+/.test(url), {
        message: 'Must be a valid GitHub repository URL'
    }),
    displayName: z.string().min(1).max(100).optional()
});

function autoDetectName(repoUrl: string, providedName?: string): string {
    if (providedName && providedName.trim()) {
        return providedName.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
    }
    try {
        const { owner, repo } = parseGithubRepo(repoUrl);
        // e.g. "owner/repo" → use repo name only, cleaned
        return repo.replace(/[^a-zA-Z0-9_-]/g, "-");
    } catch {
        return "repo-" + Date.now();
    }
}

export async function POST(req: Request) {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    let rawBody: unknown;
    try {
        rawBody = await req.json();
    } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
    }

    const parseResult = ProcessRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
        return new Response(
            JSON.stringify({ error: parseResult.error.issues[0].message }),
            { status: 400 }
        );
    }
    const { repoUrl, displayName: providedName } = parseResult.data;

    const displayName = autoDetectName(repoUrl, providedName);
    const collectionName = getCollectionName(displayName);

    try {
        // Check if already indexed
        const existing = await getRepoByName(displayName);
        if (existing) {
            // Update status to pending
            const { error: updateError } = await supabase
                .from('repositories')
                .update({ status: 'pending', progress: 0, progress_message: 'Queued for re-indexing...' })
                .eq('id', existing.id);

            if (updateError) throw updateError;
        } else {
            // Register it
            await addRepo({
                name: displayName,
                url: repoUrl,
                collection: collectionName,
                createdAt: new Date().toISOString(),
                status: 'pending',
                progress: 0,
                progressMessage: 'Queued for indexing...'
            });
        }

        // Trigger background job
        await inngest.send({
            name: "repo/index.requested",
            data: {
                userId: user.id,
                repoUrl,
                repoName: displayName
            }
        });

        return new Response(
            JSON.stringify({ message: "Indexing queued successfully", repoName: displayName }),
            { status: 200 }
        );
    } catch (err: unknown) {
        console.error("[Process] Queuing error:", err);
        const message = err instanceof Error ? err.message : "An unexpected error occurred.";
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500 }
        );
    }
}
