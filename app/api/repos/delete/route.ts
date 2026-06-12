import { NextResponse } from "next/server";
import { deleteRepo, getRepoByName } from "@/lib/repoRegistry";
import { deleteRepoNamespace } from "@/lib/pinecone";

export async function POST(req: Request) {
    try {
        const { name } = await req.json();

        if (!name) {
            return NextResponse.json({ success: false, message: "Repo name is required" }, { status: 400 });
        }

        const repo = await getRepoByName(name);
        if (!repo) {
            return NextResponse.json({ success: false, message: "Repo not found" }, { status: 404 });
        }

        // 1. Delete Pinecone namespace vectors
        await deleteRepoNamespace(repo.namespace);

        // 2. Delete from registry
        await deleteRepo(name);

        return NextResponse.json({ success: true, message: "Repository deleted successfully" });

    } catch (error) {
        console.error("Error deleting repo:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
