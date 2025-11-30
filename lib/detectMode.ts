export type Mode = "timeline" | "flow" | "command";

export function detectMode(query: string): Mode {
    const lowerQuery = query.toLowerCase();

    // Command detection
    // Matches: "list files", "list 5 files", "list any 5 files", "show me files", "give me a list of files"
    if (lowerQuery.match(/^(list|show|give|get|what)(\s+(me|us))?(\s+(a|the|any|some|top|recent))?(\s+list\s+of)?(\s+(all|repo))?\s*(\d+\s*)?files?/)) {
        return "command";
    }

    const timelineKeywords = [
        "when", "commit", "added", "introduced", "changed", "bug", "removed", "origin",
        "history", "log", "updated", "last commit", "commits"
    ];

    const flowKeywords = [
        "how", "flow", "explain", "logic", "architecture", "what happens", "walk me through"
    ];

    // Check for timeline keywords using regex for word boundaries
    if (timelineKeywords.some(k => new RegExp(`\\b${k}\\b`).test(lowerQuery))) {
        return "timeline";
    }

    // Check for flow keywords (not strictly necessary since it's the default, but good for clarity)
    if (flowKeywords.some(k => new RegExp(`\\b${k}\\b`).test(lowerQuery))) {
        return "flow";
    }

    // Default to flow if ambiguous
    return "flow";
}
