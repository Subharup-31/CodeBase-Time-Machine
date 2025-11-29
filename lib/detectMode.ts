export type Mode = "timeline" | "flow";

export function detectMode(query: string): Mode {
    const timelineKeywords = ["when", "introduced", "commit", "added", "removed", "bug", "origin", "first", "changed", "history", "who"];
    const flowKeywords = ["how", "flow", "explain", "architecture", "structure", "logic", "what happens", "work", "understand"];

    const lowerQuery = query.toLowerCase();

    // Check for timeline keywords first
    if (timelineKeywords.some(k => lowerQuery.includes(k))) {
        return "timeline";
    }

    // Check for flow keywords
    if (flowKeywords.some(k => lowerQuery.includes(k))) {
        return "flow";
    }

    // Default to flow if ambiguous, as it's more likely what a user wants for general questions
    return "flow";
}
