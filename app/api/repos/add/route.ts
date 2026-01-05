import { NextResponse } from "next/server";
import { addRepo, repoExists } from "@/lib/repoRegistry";
import { getCollectionName, ensureRepoCollection } from "@/lib/qdrant";
import { processRepository } from "@/lib/repoProcessor";

export async function POST(req: Request) {
    try {
        const { repoUrl, displayName } = await req.json();

        if (!repoUrl || !displayName) {
            return NextResponse.json({ success: false, message: "Repo URL and Display Name are required" }, { status: 400 });
        }

        if (repoExists(displayName)) {
            return NextResponse.json({ success: false, message: "Repo with this name already exists" }, { status: 409 });
        }

        const collectionName = getCollectionName(displayName);

        // 1. Ensure collection exists
        await ensureRepoCollection(collectionName);

        // 2. Add to registry
        addRepo({
            name: displayName,
            url: repoUrl,
            collection: collectionName,
            createdAt: new Date().toISOString(),
        });

        // 3. Trigger processing
        // We await this so the user knows when it's ready. 
        // In a production app, this might be a background job.
        await processRepository(repoUrl, collectionName);

        return NextResponse.json({ success: true, message: "Repository added and processed successfully", collection: collectionName });

    } catch (error) {
        console.error("Error adding repo:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
