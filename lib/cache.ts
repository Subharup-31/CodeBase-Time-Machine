import fs from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache");

if (!fs.existsSync(CACHE_DIR)) {
    try {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    } catch (e) {
        console.warn("Failed to create cache directory", e);
    }
}

export function getCachedReport(repoName: string, type: "test-plan" | "security-audit" | "code-health" | "debug-report"): string | null {
    try {
        const safeRepoName = repoName.replace(/[^a-zA-Z0-9-_]/g, "_");
        const filePath = path.join(CACHE_DIR, `${safeRepoName}_${type}.md`);

        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            // Cache valid for 24 hours
            if (Date.now() - stats.mtimeMs < 24 * 60 * 60 * 1000) {
                return fs.readFileSync(filePath, "utf-8");
            }
        }
    } catch (error) {
        console.error("Error reading cache:", error);
    }
    return null;
}

export function saveCachedReport(repoName: string, type: "test-plan" | "security-audit" | "code-health" | "debug-report", content: string) {
    try {
        const safeRepoName = repoName.replace(/[^a-zA-Z0-9-_]/g, "_");
        const filePath = path.join(CACHE_DIR, `${safeRepoName}_${type}.md`);
        fs.writeFileSync(filePath, content, "utf-8");
    } catch (error) {
        console.error("Error saving cache:", error);
    }
}
