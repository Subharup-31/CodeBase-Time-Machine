import { NextResponse } from "next/server";
import { addRepo, repoExists } from "@/lib/repoRegistry";
import { getCollectionName, ensureRepoCollection } from "@/lib/qdrant";
import { runPipeline } from "@/lib/lamatic";

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

        // 3. Trigger initial processing (optional, but good UX)
        // We'll run it in background or await it depending on preference. 
        // For now, let's await it to ensure it works before confirming.
        // Note: runPipeline needs to be updated to accept collectionName!
        // We'll update runPipeline next. For now, let's assume it works or we'll fix it.

        // Actually, let's just return success and let the user trigger processing separately or 
        // we can call the process API internally. 
        // Better yet, let's just register it here. The user can "Process" it via the main process API.

        return NextResponse.json({ success: true, message: "Repository added successfully", collection: collectionName });

    } catch (error) {
        console.error("Error adding repo:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
