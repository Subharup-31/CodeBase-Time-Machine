import fs from "fs";
import path from "path";

export interface RepoMetadata {
    name: string;
    url: string;
    collection: string;
    createdAt: string;
}

const REPO_FILE_PATH = path.join(process.cwd(), "repos.json");

function ensureFile() {
    if (!fs.existsSync(REPO_FILE_PATH)) {
        // Auto-register the legacy "codebase" collection as "Default"
        const defaultRepo = [{
            name: "Default",
            url: "Legacy/Pre-Phase-3",
            collection: "codebase",
            createdAt: new Date().toISOString()
        }];
        fs.writeFileSync(REPO_FILE_PATH, JSON.stringify(defaultRepo, null, 2));
    }
}

export function getAllRepos(): RepoMetadata[] {
    ensureFile();
    try {
        const data = fs.readFileSync(REPO_FILE_PATH, "utf-8");
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
            console.error("repos.json is not an array, resetting.");
            return [];
        }
        // Basic validation to filter out invalid entries
        return parsed.filter(r => typeof r === 'object' && r !== null && typeof r.name === 'string');
    } catch (error) {
        console.error("Error reading repos.json:", error);
        return [];
    }
}

export function addRepo(repo: RepoMetadata): void {
    const repos = getAllRepos();
    // Avoid duplicates by name
    if (repos.some((r) => r.name === repo.name)) {
        throw new Error(`Repo with name ${repo.name} already exists`);
    }
    repos.push(repo);
    fs.writeFileSync(REPO_FILE_PATH, JSON.stringify(repos, null, 2));
}

export function deleteRepo(name: string): void {
    let repos = getAllRepos();
    repos = repos.filter((r) => r.name !== name);
    fs.writeFileSync(REPO_FILE_PATH, JSON.stringify(repos, null, 2));
}

export function getRepoByName(name: string): RepoMetadata | undefined {
    const repos = getAllRepos();
    return repos.find((r) => r.name.toLowerCase() === name.toLowerCase());
}

export function repoExists(name: string): boolean {
    return !!getRepoByName(name);
}
