import { Octokit } from "octokit";
import { GitFileNode, CommitInfo } from "@/types";

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
});

export function parseGithubRepo(url: string): { owner: string; repo: string } {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
        throw new Error("Invalid GitHub URL");
    }
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

// Alias for backward compatibility if needed, or just replace usages.
// The existing code uses parseRepoUrl, so we can just export the new one and update internal calls.
const parseRepoUrl = parseGithubRepo;

const BINARY_EXTENSIONS = new Set([
    "png", "jpg", "jpeg", "gif", "webp", "svg", "mp4", "mp3", "ico", "exe", "pdf",
    "zip", "tar", "gz", "7z", "rar", "jar", "war", "ear", "class", "pyc", "woff", "woff2", "ttf", "eot",
    // Documentation extensions to ignore
    "md", "txt", "rtf", "docx", "doc", "odt"
]);

const IGNORED_FILES = new Set([
    "license", "changelog", "contributing", "readme", "notice", "authors", "patents", "copying"
]);

export interface FileCommit {
    sha: string;
    authorName: string;
    authorEmail: string | null;
    date: string;          // ISO timestamp
    message: string;
    htmlUrl: string;       // direct URL to the commit on GitHub
}

export async function fetchRepoTree(repoUrl: string, filter: boolean = true): Promise<GitFileNode[]> {
    const { owner, repo } = parseGithubRepo(repoUrl);

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

        // 3. Filter for files (blobs)
        return treeData.tree
            .filter((node) => {
                if (node.type !== "blob" || !node.path) return false;

                // If filtering is disabled, return all files
                if (!filter) return true;

                const fileName = node.path.split("/").pop()?.toLowerCase();
                if (!fileName) return false;

                // Check exact ignored filenames (without extension logic if they have none, or just basename)
                // We check the full basename (e.g. "license", "license.txt")
                // But usually license is just LICENSE.
                // Let's check if the basename *starts with* or *is* one of the ignored files?
                // The user said "LICENSE, CHANGELOG".
                if (IGNORED_FILES.has(fileName.split(".")[0])) return false;

                const ext = fileName.split(".").pop();

                // If no extension (e.g. Dockerfile), keep it unless it's in IGNORED_FILES
                if (!ext || fileName.indexOf(".") === -1) {
                    if (IGNORED_FILES.has(fileName)) return false;
                    return true;
                }

                // Check extensions
                return !BINARY_EXTENSIONS.has(ext);
            })
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
    const { owner, repo } = parseGithubRepo(repoUrl);

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

export async function fetchCommitHistory(repoUrl: string, limit: number = 20): Promise<CommitInfo[]> {
    const { owner, repo } = parseGithubRepo(repoUrl);

    try {
        const { data } = await octokit.request("GET /repos/{owner}/{repo}/commits", {
            owner,
            repo,
            per_page: limit, // Limit to specified number of commits
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

export async function fetchFileCommits(
    repoUrl: string,
    filePath: string,
    limit: number = 20
): Promise<FileCommit[]> {
    const { owner, repo } = parseGithubRepo(repoUrl);

    try {
        const { data } = await octokit.request("GET /repos/{owner}/{repo}/commits", {
            owner,
            repo,
            path: filePath,
            per_page: limit,
            headers: {
                "X-GitHub-Api-Version": "2022-11-28",
            }
        });

        return data.map((commit: any) => ({
            sha: commit.sha,
            authorName: commit.commit.author?.name || "Unknown",
            authorEmail: commit.commit.author?.email || null,
            date: commit.commit.author?.date || "",
            message: commit.commit.message,
            htmlUrl: commit.html_url,
        }));
    } catch (error) {
        console.error(`Error fetching commits for ${filePath}:`, error);
        return [];
    }
}

export async function resolveFilePathByName(
    repoUrl: string,
    fileName: string
): Promise<string | null> {
    try {
        const files = await fetchRepoTree(repoUrl);

        // 1. Look for exact match by basename
        const matches = files.filter(f => f.path.split("/").pop() === fileName);

        if (matches.length === 0) {
            return null;
        }

        // 2. Prefer root file if available
        const rootMatch = matches.find(f => f.path === fileName);
        if (rootMatch) {
            return rootMatch.path;
        }

        // 3. Otherwise pick the first match
        return matches[0].path;
    } catch (error) {
        console.error("Error resolving file path:", error);
        return null;
    }
}

export interface CommitDetails {
    sha: string;
    message: string;
    author: string;
    date: string;
    htmlUrl: string;
    stats: {
        total: number;
        additions: number;
        deletions: number;
    };
    files: {
        filename: string;
        status: string; // "modified", "added", "removed"
        additions: number;
        deletions: number;
    }[];
}

export async function fetchCommitDetails(repoUrl: string, sha: string): Promise<CommitDetails | null> {
    const { owner, repo } = parseGithubRepo(repoUrl);
    try {
        const { data } = await octokit.request("GET /repos/{owner}/{repo}/commits/{ref}", {
            owner,
            repo,
            ref: sha
        });

        return {
            sha: data.sha,
            message: data.commit.message,
            author: data.commit.author?.name || "Unknown",
            date: data.commit.author?.date || "",
            htmlUrl: data.html_url,
            stats: {
                total: data.stats?.total || 0,
                additions: data.stats?.additions || 0,
                deletions: data.stats?.deletions || 0,
            },
            files: data.files?.map((f: any) => ({
                filename: f.filename,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions
            })) || []
        };
    } catch (error) {
        console.error("Error fetching commit details:", error);
        return null;
    }
}

export interface RepoStats {
    name: string;
    description: string | null;
    stars: number;
    forks: number;
    openIssues: number;
    lastUpdate: string;
    pushedAt: string;
    size: number;
    defaultBranch: string;
}

export async function fetchRepoStats(repoUrl: string): Promise<RepoStats | null> {
    const { owner, repo } = parseGithubRepo(repoUrl);
    try {
        const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
            owner,
            repo,
        });

        return {
            name: data.name,
            description: data.description,
            stars: data.stargazers_count,
            forks: data.forks_count,
            openIssues: data.open_issues_count,
            lastUpdate: data.updated_at,
            pushedAt: data.pushed_at,
            size: data.size,
            defaultBranch: data.default_branch,
        };
    } catch (error) {
        console.error("Error fetching repo stats:", error);
        return null;
    }
}

export async function searchCode(repoUrl: string, query: string): Promise<string[]> {
    const { owner, repo } = parseGithubRepo(repoUrl);
    try {
        const { data } = await octokit.request("GET /search/code", {
            q: `${query} repo:${owner}/${repo}`,
            per_page: 5
        });

        return data.items.map((item: any) => item.path);
    } catch (error) {
        console.error("Error searching code:", error);
        return [];
    }
}
