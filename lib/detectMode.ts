export type Mode = "timeline" | "flow" | "command";

export function detectMode(query: string): Mode {
    const lowerQuery = query.toLowerCase();

    // Command detection
    // Matches: "list files", "list all files", "show me files", "give me a list of files", "what files exist"
    if (lowerQuery.match(/^(list|show|give|get|what)(\s+(me|us))?(\s+(a|the))?(\s+list\s+of)?(\s+(all|repo))?\s+(\d+\s+)?files?/)) {
        return "command";
    }

    const timelineKeywords = [
        "when", "commit", "added", "introduced", "changed", "bug", "removed", "origin",
        "history", "log", "updated", "last commit", "commits"
    ];

    const flowKeywords = [
        "how", "flow", "explain", "logic", "architecture", "what happens", "walk me through"
    ];

    // Check for timeline keywords
    if (timelineKeywords.some(k => lowerQuery.includes(k))) {
        return "timeline";
    }

    // Check for flow keywords (not strictly necessary since it's the default, but good for clarity)
    if (flowKeywords.some(k => lowerQuery.includes(k))) {
        return "flow";
    }

    // Default to flow if ambiguous
    return "flow";
}
