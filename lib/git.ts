import { Octokit } from "octokit";
import { GitFileNode, CommitInfo } from "@/types";

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
});

function parseRepoUrl(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
        throw new Error("Invalid GitHub URL");
    }
    return { owner: match[1], repo: match[2].replace(".git", "") };
}

export async function fetchRepoTree(repoUrl: string): Promise<GitFileNode[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);

    try {
        // 1. Get default branch
        const { data: repoData } = await octokit.request("GET /repos/{owner}/{repo}", {
            owner,
            repo,
        });
        const defaultBranch = repoData.default_branch;

        // 2. Get tree recursively
        const { data: treeData } = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
            owner,
            repo,
            tree_sha: defaultBranch,
            recursive: "1",
        });

        // 3. Filter for files (blobs) and map to GitFileNode
        return treeData.tree
            .filter((node) => node.type === "blob")
            .map((node) => ({
                path: node.path || "",
                type: "file",
            }));
    } catch (error) {
        console.error("Error fetching repo tree:", error);
        throw error;
    }
}

export async function fetchFileContent(repoUrl: string, filePath: string): Promise<string> {
    const { owner, repo } = parseRepoUrl(repoUrl);

    try {
        const { data } = await octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
            owner,
            repo,
            path: filePath,
        });

        if (Array.isArray(data) || data.type !== "file" || !data.content) {
            throw new Error("Not a file or no content");
        }

        // Content is base64 encoded
        return Buffer.from(data.content, "base64").toString("utf-8");
    } catch (error) {
        console.error(`Error fetching file content for ${filePath}:`, error);
        return "";
    }
}

export async function fetchCommitHistory(repoUrl: string): Promise<CommitInfo[]> {
    const { owner, repo } = parseRepoUrl(repoUrl);

    try {
        const { data } = await octokit.request("GET /repos/{owner}/{repo}/commits", {
            owner,
            repo,
            per_page: 20, // Limit to last 20 commits for now
        });

        return data.map((commit) => ({
            sha: commit.sha,
            message: commit.commit.message,
            date: commit.commit.author?.date || "",
            author: commit.commit.author?.name || "Unknown",
        }));
    } catch (error) {
        console.error("Error fetching commit history:", error);
        return [];
    }
}
