export type Mode = "timeline" | "flow" | "command" | "test" | "security" | "health" | "debug";

export function detectMode(query: string): Mode {
    const lowerQuery = query.toLowerCase();

    // Command detection
    // Matches: "list files", "list 5 files", "list any 5 files", "show me files", "give me a list of files"
    if (lowerQuery.match(/^(list|show|give|get|what)(\s+(me|us))?(\s+(a|the|any|some|top|recent))?(\s+list\s+of)?(\s+(all|repo))?\s*(\d+\s*)?files?/)) {
        return "command";
    }

    const testKeywords = [
        "test case", "test cases", "generate tests", "create tests", "test plan", "qa audit", "qa plan", "write tests"
    ];

    const securityKeywords = [
        "security audit", "security scan", "vulnerability report", "analyze vulnerabilities", "check security", "security check"
    ];

    const healthKeywords = [
        "code health", "health score", "quality score", "maintainability score", "code quality", "health report"
    ];

    const debugKeywords = [
        "break", "broke", "broken", "failing", "fail", "not working", "stopped working", "regression", "bug", "issue started", "unexpected behavior", "why is x failing", "when did x fail"
    ];

    const timelineKeywords = [
        "when", "commit", "added", "introduced", "changed", "changes", "timeline", "bug", "removed", "origin",
        "history", "log", "updated", "last commit", "commits"
    ];

    const flowKeywords = [
        "how", "flow", "explain", "logic", "architecture", "what happens", "walk me through"
    ];

    // Check for test keywords
    if (testKeywords.some(k => new RegExp(`\\b${k}\\b`).test(lowerQuery))) {
        return "test";
    }

    // Check for security keywords
    if (securityKeywords.some(k => new RegExp(`\\b${k}\\b`).test(lowerQuery))) {
        return "security";
    }

    // Check for health keywords
    if (healthKeywords.some(k => new RegExp(`\\b${k}\\b`).test(lowerQuery))) {
        return "health";
    }

    // Check for debug keywords
    // We use a more permissive regex here because "bug" or "break" might be part of a sentence
    if (debugKeywords.some(k => lowerQuery.includes(k))) {
        return "debug";
    }

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
