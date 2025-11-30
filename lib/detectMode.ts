export type Mode = "timeline" | "flow" | "command";

export function detectMode(query: string): Mode {
    const lowerQuery = query.toLowerCase();

    // Command detection
    if (lowerQuery.match(/^(list|show)\s+(\d+\s+)?files?/)) {
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
