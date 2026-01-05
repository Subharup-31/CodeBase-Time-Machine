import { NextResponse } from "next/server";
import { fetchRepoTree } from "@/lib/git";
import { getRepoByName } from "@/lib/repoRegistry";

export async function GET(req: Request, { params }: { params: { repoName: string } }) {
    try {
        const { repoName } = params;
        const repo = getRepoByName(repoName);

        if (!repo) {
            return NextResponse.json({ error: "Repo not found in registry" }, { status: 404 });
        }

        const files = await fetchRepoTree(repo.url);

        return NextResponse.json({
            repo: repoName,
            url: repo.url,
            fileCount: files.length,
            files: files.map(f => f.path)
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to list files", details: error }, { status: 500 });
    }
}
