import { NextResponse } from "next/server";
import { deleteRepo, getRepoByName } from "@/lib/repoRegistry";
import { deleteRepoCollection } from "@/lib/qdrant";

export async function POST(req: Request) {
    try {
        const { name } = await req.json();

        if (!name) {
            return NextResponse.json({ success: false, message: "Repo name is required" }, { status: 400 });
        }

        const repo = getRepoByName(name);
        if (!repo) {
            return NextResponse.json({ success: false, message: "Repo not found" }, { status: 404 });
        }

        // 1. Delete collection
        await deleteRepoCollection(repo.collection);

        // 2. Delete from registry
        deleteRepo(name);

        return NextResponse.json({ success: true, message: "Repository deleted successfully" });

    } catch (error) {
        console.error("Error deleting repo:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
