import { NextResponse } from "next/server";
import { getAllRepos } from "@/lib/repoRegistry";
import { getCollectionStats } from "@/lib/pinecone";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const repos = await getAllRepos();

        // Enrich with indexed status from Qdrant (in parallel)
        const enriched = await Promise.all(
            repos.map(async (repo) => {
                const stats = await getCollectionStats(repo.collection);
                return {
                    ...repo,
                    indexed: stats.exists && stats.vectorCount > 0,
                    vectorCount: stats.vectorCount,
                };
            })
        );

        return NextResponse.json({ success: true, repos: enriched });
    } catch (error) {
        console.error("Error listing repos:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
