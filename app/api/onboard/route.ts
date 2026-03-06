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

        const repo = await getRepoByName(repoName);
        if (!repo) {
            return NextResponse.json({ error: "Repo not found" }, { status: 404 });
        }

        const repoUrl = repo.url;

        // 1. Fetch File Tree
        const tree = await fetchRepoTree(repoUrl, false);

        // Limit tree output to avoid token limits if repo is huge
        const fileList = tree.slice(0, 500).map(f => f.path).join("\n");
        const treeSummary = tree.length > 500 ? `${fileList}\n...(and ${tree.length - 500} more files)` : fileList;

        // 2. Fetch Key Files
        const priorityFiles = [
            "README.md", "package.json", "tsconfig.json", "next.config.js", "next.config.ts",
            "vite.config.ts", "vite.config.js", "app/page.tsx", "app/layout.tsx", "src/App.tsx",
            "src/index.tsx", "src/main.tsx", "index.js", "server.js", "requirements.txt",
            "pyproject.toml", "main.py", "app.py"
        ];

        let context = `File Structure:\n${treeSummary}\n\n`;

        const foundFiles = tree.filter(f => 
            priorityFiles.some(pf => pf.toLowerCase() === f.path.toLowerCase())
        );

        const fetchWithTimeout = async (path: string, timeout = 5000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const content = await fetchFileContent(repoUrl, path);
                clearTimeout(id);
                return { path, content: content.length > 10000 ? content.slice(0, 10000) + "\n...(truncated)" : content };
            } catch (e) {
                clearTimeout(id);
                return { path, content: null };
            }
        };

        const results = await Promise.all(foundFiles.map(f => fetchWithTimeout(f.path)));
        results.forEach(res => {
            if (res.content) {
                context += `File: ${res.path}\nContent:\n${res.content}\n\n---\n\n`;
            }
        });

        // 3. Generate Report
        let report;
        try {
            report = await generateOnboardingReport(repoName, context);
        } catch (e) {
            console.error("AI Generation failed:", e);
            report = "Unable to generate AI report at this time. Please check the repository structure above.";
        }

        return NextResponse.json({ report });

    } catch (error) {
        console.error("Error in /api/onboard:", error);
        return NextResponse.json({ report: "An error occurred while processing the repository." });
    }
}
