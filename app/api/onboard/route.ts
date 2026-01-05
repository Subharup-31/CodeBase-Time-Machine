import { NextResponse } from "next/server";
import { fetchRepoTree, fetchFileContent } from "@/lib/git";
import { generateOnboardingReport } from "@/lib/gemini";
import { getRepoByName } from "@/lib/repoRegistry";

export async function POST(req: Request) {
    try {
        const { repoName } = await req.json();

        if (!repoName) {
            return NextResponse.json({ error: "Repo name is required" }, { status: 400 });
        }

        const repo = getRepoByName(repoName);
        if (!repo) {
            return NextResponse.json({ error: "Repo not found" }, { status: 404 });
        }

        const repoUrl = repo.url;

        // 1. Fetch File Tree
        // Get all files, but maybe limit if too large? 
        // fetchRepoTree returns all files recursively.
        const tree = await fetchRepoTree(repoUrl, false);

        // Limit tree output to avoid token limits if repo is huge
        const fileList = tree.slice(0, 500).map(f => f.path).join("\n");
        const treeSummary = tree.length > 500 ? `${fileList}\n...(and ${tree.length - 500} more files)` : fileList;

        // 2. Fetch Key Files
        const priorityFiles = [
            "README.md",
            "package.json",
            "tsconfig.json",
            "next.config.js",
            "next.config.ts",
            "vite.config.ts",
            "vite.config.js",
            "app/page.tsx",
            "app/layout.tsx",
            "src/App.tsx",
            "src/index.tsx",
            "src/main.tsx",
            "index.js",
            "server.js",
            "requirements.txt",
            "pyproject.toml",
            "main.py",
            "app.py"
        ];

        let context = `File Structure:\n${treeSummary}\n\n`;

        // Fetch content for priority files
        let fetchedCount = 0;
        for (const file of priorityFiles) {
            // Check if file exists in tree (case insensitive)
            const foundFile = tree.find(f => f.path.toLowerCase() === file.toLowerCase());
            if (foundFile) {
                try {
                    const content = await fetchFileContent(repoUrl, foundFile.path);
                    // Truncate large files
                    const truncatedContent = content.length > 10000 ? content.slice(0, 10000) + "\n...(truncated)" : content;
                    context += `File: ${foundFile.path}\nContent:\n${truncatedContent}\n\n---\n\n`;
                    fetchedCount++;
                } catch (e) {
                    console.warn(`Failed to fetch content for ${file}`, e);
                }
            }
        }

        // If very few priority files found, maybe fetch a few random source files?
        // For now, rely on the tree and whatever priority files exist.

        // 3. Generate Report
        const report = await generateOnboardingReport(repoName, context);

        return NextResponse.json({ report });

    } catch (error) {
        console.error("Error in /api/onboard:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
