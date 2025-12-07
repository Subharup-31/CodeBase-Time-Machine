import { NextResponse } from "next/server";
import { ensureRepoCollection, getCollectionName } from "@/lib/qdrant";
import { addRepo, getRepoByName } from "@/lib/repoRegistry";
import { processRepository } from "@/lib/repoProcessor";

export async function POST(req: Request) {
    try {
        const { repoUrl, displayName } = await req.json();

        if (!repoUrl) {
            return NextResponse.json({ success: false, message: "Repo URL is required" }, { status: 400 });
        }

        // Determine repo name
        const name = displayName || repoUrl.split("/").pop() || "unknown-repo";
        const collectionName = getCollectionName(name);

        console.log(`🚀 Processing repo: ${name} -> Collection: ${collectionName}`);

        // Register repo
        const existing = getRepoByName(name);
        if (!existing) {
            addRepo({
                name,
                url: repoUrl,
                collection: collectionName,
                createdAt: new Date().toISOString()
            });
        }

        // Ensure collection exists
        await ensureRepoCollection(collectionName);

        // Process repository (fetch, chunk, embed, store)
        const totalChunks = await processRepository(repoUrl, collectionName);

        return NextResponse.json({
            success: true,
            message: `Repo processed successfully`,
            repo: name,
            collection: collectionName,
            chunks: totalChunks
        });

    } catch (error) {
        console.error("❌ Error in /api/process:", error);
        return NextResponse.json({ success: false, message: "Processing failed" }, { status: 500 });
    }
}
