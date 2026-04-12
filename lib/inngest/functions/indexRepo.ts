import { inngest } from "../client";
import { processRepositoryEvolution } from "@/lib/evolutionIndexer";
import { processRepositoryPhylogenetics } from "@/lib/phylogeneticIndexer";
import { createAdminClient } from "@/lib/supabase/serviceRole";
import { getCollectionName, ensureRepoCollection } from "@/lib/pinecone";

// Helper to update progress in Supabase
async function updateRepoProgress(
    userId: string,
    repoName: string,
    patch: { status?: string; progress?: number; progressMessage?: string; indexedAt?: string }
) {
    const adminClient = createAdminClient();
    
    const updateData: any = {};
    if (patch.status !== undefined) updateData.status = patch.status;
    if (patch.progress !== undefined) updateData.progress = patch.progress;
    if (patch.progressMessage !== undefined) updateData.progress_message = patch.progressMessage;
    if (patch.indexedAt !== undefined) updateData.indexed_at = patch.indexedAt;

    await adminClient
        .from('repositories')
        .update(updateData)
        .eq('name', repoName)
        .eq('user_id', userId);
}

export const indexRepository = inngest.createFunction(
    { 
        id: "index-repository", 
        name: "Index Repository", 
        retries: 2,
        triggers: [{ event: "repo/index.requested" }]
    },
    async ({ event, step }) => {
        const { userId, repoUrl, repoName } = event.data;
        const collectionName = getCollectionName(repoName);

        try {
            // 1. Initial State Update
            await step.run("set-status-indexing", async () => {
                await ensureRepoCollection(collectionName);
                await updateRepoProgress(userId, repoName, { 
                    status: 'indexing', 
                    progress: 5, 
                    progressMessage: "Starting indexing process..." 
                });
            });

            // 2. Process Evolution (Diffs)
            const evolutionChunks = await step.run("process-evolution", async () => {
                let lastUpdate = Date.now();
                return await processRepositoryEvolution(
                    repoUrl,
                    collectionName,
                    80, // index last 80 commits
                    async (e) => {
                        // Throttle updates to Supabase to every 2 seconds
                        const now = Date.now();
                        if (now - lastUpdate > 2000) {
                            lastUpdate = now;
                            await updateRepoProgress(userId, repoName, {
                                progress: 5 + Math.floor(e.percent * 0.43),
                                progressMessage: e.message
                            });
                        }
                    }
                );
            });

            // 3. Process Phylogenetics (Symbols)
            const symbolChunks = await step.run("process-phylogenetics", async () => {
                let lastUpdate = Date.now();
                return await processRepositoryPhylogenetics(
                    repoUrl,
                    collectionName,
                    100, // analyze last 100 commits for symbol lineage (was 25)
                    userId,
                    async (e) => {
                        // Throttle updates
                        const now = Date.now();
                        if (now - lastUpdate > 2000) {
                            lastUpdate = now;
                            await updateRepoProgress(userId, repoName, {
                                progress: 49 + Math.floor(e.percent * 0.49),
                                progressMessage: e.message
                            });
                        }
                    }
                );
            });

            // 4. Mark as Ready
            await step.run("set-status-ready", async () => {
                const totalChunks = evolutionChunks + symbolChunks;
                await updateRepoProgress(userId, repoName, {
                    status: 'ready',
                    progress: 100,
                    progressMessage: `Indexed ${totalChunks} chunks successfully.`,
                    indexedAt: new Date().toISOString()
                });
            });

            return { success: true, evolutionChunks, symbolChunks };
        } catch (err: any) {
            // Mark repo as errored so UI shows error state
            await step.run("set-status-error", async () => {
                const adminClient = createAdminClient();
                await adminClient
                    .from('repositories')
                    .update({
                        status: 'error',
                        progress_message: `Indexing failed: ${err?.message || 'Unknown error'}`,
                        error_message: err?.message || 'Unknown error'
                    })
                    .eq('name', repoName)
                    .eq('user_id', userId);
            });
            throw err; // Re-throw so Inngest retries
        }
    }
);

                                                                                                              
