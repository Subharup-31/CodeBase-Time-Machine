import { CodeChunk } from "@/types";
import { getCachedReport, saveCachedReport } from "./cache";
import { callOpenRouter, getSingleEmbedding } from "./openrouter";

/**
 * Helper to parse OpenRouter errors and return a user-friendly message.
 */
function handleOpenRouterError(error: any, context: string): string {
    console.error(`Error in ${context}:`, error);

    const msg = error?.message || "";

    // Check for rate limit or similar errors
    if (msg.includes("429") || msg.includes("rate limit") || msg.includes("Limit")) {
        return "⚠️ OpenRouter API rate limit exceeded. Please wait a moment and try again.";
    }

    return `An error occurred while communicating with OpenRouter (${context}).`;
}

export async function embedText(text: string): Promise<number[]> {
    try {
        return await getSingleEmbedding(text);
    } catch (error) {
        console.error("Error generating embedding:", error);
        // Fallback to random embedding so the app doesn't crash completely,
        // using the 1536 size matching openai/text-embedding-3-small
        return Array.from({ length: 1536 }, () => Math.random());
    }
}

export async function generateAnswerWithContext(query: string, contextChunks: CodeChunk[]): Promise<string> {
    try {
        const contextText = contextChunks
            .map((chunk) => `File: ${chunk.filePath}\nCommit: ${chunk.commit || "Unknown"}\nContent:\n${chunk.text}`)
            .join("\n\n---\n\n");

        const prompt = `
You are the analysis engine for a multi-repository codebase explorer.
Current Mode: TIMELINE MODE

====================================================
GLOBAL RULES
====================================================
1. NEVER hallucinate files, features, logic, APIs, or commit dates.
2. NEVER invent code paths that are not explicitly present in the retrieved chunks.
3. Only use the text passed in contextChunks.
4. If a question mentions a specific repo using @RepoName, all reasoning MUST be constrained to that repo.
5. When explaining functionality, include ONLY what exists in the provided chunks.

====================================================
====================================================
TIMELINE MODE RULES
====================================================
Timeline mode answers questions like: "When was X added?", "Which commit introduced Z?", "How did this file evolve?"

STRICT OUTPUT RULES:
1. Always respond in plain text.
2. Never use markdown formatting.
3. Never use asterisks, backticks, hashes, or emojis in descriptions.
4. **EXCEPTION:** YOU MUST USE \`\`\`mermaid CODE BLOCKS for diagrams.
5. Never use bullets or special characters for lists.
6. Never output decorative symbols.

TONE & STYLE:
1. Dry, factual, and concise.
2. Similar to GitLens or Sourcegraph output.
3. No conversational filler.
   
   MERMAID DIAGRAM RULES:
   1. Do NOT use special characters ( () {} [] ) inside node labels without quotes.
      BAD: A[User (Client)]
      GOOD: A["User (Client)"]
   2. Use simple node IDs (A, B, C, etc.).
   3. Do not use complex logic or unsupported shapes.

CONTENT RULES:
1. Show commit id, file names, author, message, and timestamp.
2. If no commit history is available, say exactly:
   "This repository has no commit history available."
3. If the file/feature does not exist, say exactly:
   "File or feature not found in this repository."
4. If the file exists but no history, say exactly:
   "This file exists in the repository, but commit history is not available."

NEVER include:
- CSS, HTML, JS code snippets.
- Irrelevant context.
- Speculation.

====================================================
User Query: "${query}"

Context from the codebase:
${contextText}

Instructions:
Answer the user's query based strictly on the provided context and the rules above.
`;

        const responseMessage = await callOpenRouter([
            {
                role: "system",
                content: "You are the analysis engine for a multi-repository codebase explorer."
            },
            {
                role: "user",
                content: prompt
            }
        ]);

        return cleanAIOutput(responseMessage.content || "");
    } catch (error) {
        return handleOpenRouterError(error, "generateAnswerWithContext");
    }
}

export async function expandKeywordsWithAI(keywords: string[]): Promise<string[]> {
    if (keywords.length === 0) {
        return keywords;
    }

    try {
        const prompt = `
        You are a code search assistant.
        The user is searching for files related to these keywords: ${JSON.stringify(keywords)}.
        
        Generate a JSON array of 5-10 technical synonyms, related file names, or coding concepts that might appear in a codebase for these terms.
        Example: ["login"] -> ["auth", "authentication", "signin", "session", "jwt", "user_controller"]
        
        Return ONLY the JSON array of strings. No markdown, no explanations.
        `;

        const responseMessage = await callOpenRouter([
            {
                role: "system",
                content: "You are a code search assistant."
            },
            {
                role: "user",
                content: prompt
            }
        ]);

        const responseText = responseMessage.content || "";

        // Clean up response to ensure valid JSON
        const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const expanded = JSON.parse(cleanJson);

        if (Array.isArray(expanded)) {
            // Combine original keywords with new ones and deduplicate
            return Array.from(new Set([...keywords, ...expanded]));
        }
        return keywords;
    } catch (error) {
        console.warn("Keyword expansion failed (likely rate limit or parsing error), continuing with originals.", error);
        return keywords;
    }
}

function cleanAIOutput(text: string): string {
    // 1. Smart Protect Mermaid Blocks (Normalize to ```mermaid)
    const mermaidRegex = /```\s*(?:mermaid)?[\s\S]*?(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie)[\s\S]*?```/gi;
    const explicitMermaidRegex = /```\s*mermaid[\s\S]*?```/gi;

    const mermaidBlocks: string[] = [];

    const replacer = (match: string) => {
        let content = match.replace(/^```\s*(?:mermaid)?/i, "").replace(/```$/, "");
        const keywordRegex = /\b(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie)\b/i;
        const keywordMatch = keywordRegex.exec(content);

        if (keywordMatch) {
            content = content.substring(keywordMatch.index);
        } else {
            content = content.trim().replace(/^mermaid\s+/i, "");
        }

        content = content.trim();
        const normalizedBlock = `\`\`\`mermaid\n${content}\n\`\`\``;
        mermaidBlocks.push(normalizedBlock);
        return `MERMAIDPLACEHOLDER${mermaidBlocks.length - 1}`;
    };

    // Protect all code blocks (not just mermaid) from stripping
    const codeBlockRegex = /```[\s\S]*?```/g;
    const allCodeBlocks: string[] = [];

    // First pass: extract all code blocks
    let withCodePlaceholders = text.replace(codeBlockRegex, (match) => {
        allCodeBlocks.push(match);
        return `CODEBLOCK${allCodeBlocks.length - 1}`;
    });

    // Replace mermaid blocks in placeholders if needed
    // (they should already be protected by CODEBLOCK placeholders)

    // 2. Strip ONLY the legacy plain-text formatting that the prompt explicitly requested
    // (does NOT strip backticks inside code blocks which are already protected)
    let cleanedText = withCodePlaceholders
        .replace(/\*\*/g, "")
        .replace(/^\s*#{1,6}\s+/gm, "")  // Only strip # headers at line start, not in middle of text
        .replace(/^>\s+/gm, "")           // Strip blockquotes
        .trim();

    // 3. Restore code blocks
    allCodeBlocks.forEach((block, index) => {
        cleanedText = cleanedText.replace(`CODEBLOCK${index}`, block);
    });

    // 4. Normalize and protect mermaid blocks
    let textWithMermaid = cleanedText.replace(mermaidRegex, replacer);
    textWithMermaid = textWithMermaid.replace(explicitMermaidRegex, (match) => {
        if (match.includes("MERMAIDPLACEHOLDER")) return match;
        return replacer(match);
    });

    // 5. Restore Mermaid Blocks
    mermaidBlocks.forEach((block, index) => {
        textWithMermaid = textWithMermaid.replace(`MERMAIDPLACEHOLDER${index}`, block);
    });

    return textWithMermaid;
}

export async function generateOnboardingReport(repoName: string, contextText: string): Promise<string> {
    try {
        const prompt = `
You are an AI Developer Assistant inside Codebase Time Machine.
The user will provide either a GitHub URL or raw repository contents.
Your task is to produce a complete, structured, end-to-end developer onboarding report for the entire codebase.

CRITICAL INSTRUCTION:
The user is a BEGINNER. 
- Use simple, plain English.
- Avoid complex jargon where possible, or explain it immediately if necessary.
- Use ANALOGIES to explain concepts (e.g., "Think of this module as the traffic controller...").
- The goal is to make a junior developer feel confident and understand the "big picture" instantly.

Perform all of the following tasks clearly and in order:

Project Summary
- Explain what the project does in 5 to 8 bullet points (Simple language!)
- Identify the tech stack and architecture style
- Describe the main purpose and target users if detectable

Architecture Overview
- Explain the folder structure and major directories
- Describe how modules and components interact
- Highlight important data flow or API flow
- Generate a Mermaid architecture diagram representing the structure

Key Functions and Major Flows
- List the most important functions, classes, and modules
- Explain their purpose in beginner-friendly language (Use analogies!)
- Choose one important flow and generate a Mermaid sequence diagram for it

Potential Bugs and Risk Areas
- Identify code smells, unused imports, deep nesting, or anti-patterns
- Mention functions that may fail in edge cases or runtime
- Highlight any security or validation issues

Missing Documentation
- List files or functions lacking comments or docstrings
- Suggest what documentation should be added

TODO and FIXME Extraction
- Extract all TODO, FIXME, or incomplete code points
- Convert them into actionable developer tasks

Code Complexity Report
- Classify project complexity as Simple, Medium, or Complex
- Identify duplicated logic, overly long functions, or nested blocks
- Suggest refactoring improvements

OUTPUT FORMAT
Follow this structure exactly:

Project Summary
...

Architecture Overview
...
Mermaid diagram here (wrapped in \`\`\`mermaid)

Key Functions and Flows
...
Sequence diagram here (wrapped in \`\`\`mermaid)

Potential Bugs and Risks
...

Missing Documentation
...

TODO Suggestions
...

Complexity Report
...

Tone must be clear, structured, and easy to understand.
Do not skip any section even if the codebase is small.

STRICTLY PLAIN TEXT for descriptions (No *, #, **, \`).
REQUIRED: Wrapped \`\`\`mermaid code blocks for valid diagrams.

MERMAID DIAGRAM RULES:
1. Do NOT use special characters ( () {} [] ) inside node labels without quotes.
   BAD: A[User (Client)]
   GOOD: A["User (Client)"]
2. Use simple node IDs (A, B, C, etc.).

====================================================
Repository Name: ${repoName}

Context from the codebase:
${contextText}

Instructions:
Generate the onboarding report for the repository '${repoName}' based on the provided context.
`;

        const responseMessage = await callOpenRouter([
            {
                role: "system",
                content: "You are an AI Developer Assistant inside Codebase Time Machine."
            },
            {
                role: "user",
                content: prompt
            }
        ]);

        return cleanAIOutput(responseMessage.content || "");
    } catch (error) {
        return handleOpenRouterError(error, "generateOnboardingReport");
    }
}

export async function generateTestPlan(repoName: string, contextText: string): Promise<string> {
    const cached = getCachedReport(repoName, "test-plan");
    if (cached) {
        return cleanAIOutput(cached);
    }

    try {
        const prompt = `
You are a Senior QA Engineer.
The user wants a structured Test Plan for: '${repoName}'.

CONTEXT from repo:
${contextText}

OUTPUT RULES:
1. Use the EXACT structure below.
2. Use emojis as section headers.
3. NO Markdown headers (like # or ##).
4. NO bolding (**text**) or italics (*text*).
5. NO code blocks (\`\`\`) in descriptions.
6. YOU MUST USE \`\`\`mermaid for diagrams.
6. Concise and actionable.

MERMAID DIAGRAM RULES:
1. Do NOT use special characters ( () {} [] ) inside node labels without quotes.
   BAD: A[User (Client)]
   GOOD: A["User (Client)"]
2. Use simple node IDs (A, B, C, etc.).

REQUIRED OUTPUT TEMPLATE:

📦 Project Detected
Repository: ${repoName}
Type: [Dynamic Web App / Static Site / API / etc.]
Key Modules: [List top 5 files]

🧪 Test Cases Generated
[Group by Module/Feature. For each test case, use this format:]
1. [Module Name]
TC-[SHORTCODE]-01 – [Title]
Input: [Specific input]
Expected: [Specific outcome]

TC-[SHORTCODE]-02 – [Title]
Input: [Specific input]
Expected: [Specific outcome]

[Repeat for 3-5 critical modules]

🔐 Security & Rules Validation
TC-SEC-01 – [Title]
Input: [Action]
Expected: [Outcome]

TC-SEC-02 – [Title]
Input: [Action]
Expected: [Outcome]

📊 Integration Flow
TC-FLOW-01 – [End-to-End Scenario Title]
Flow: [Step 1] -> [Step 2] -> [Step 3]
Expected: [Final success state]

FINAL CHECK:
- Did you use ** or #? REMOVE THEM.
- Did you use code blocks? REMOVE THEM.
- Ensure "Input" and "Expected" are on new lines.
- No surrounding text or conversational filler.
`;

        const responseMessage = await callOpenRouter([
            {
                role: "system",
                content: "You are a Senior QA Engineer."
            },
            {
                role: "user",
                content: prompt
            }
        ]);

        const text = cleanAIOutput(responseMessage.content || "");
        saveCachedReport(repoName, "test-plan", text);
        return text;
    } catch (error) {
        return handleOpenRouterError(error, "generateTestPlan");
    }
}

export async function generateSecurityAudit(repoName: string, contextText: string): Promise<string> {
    const cached = getCachedReport(repoName, "security-audit");
    if (cached) {
        return cleanAIOutput(cached);
    }

    try {
        const prompt = `
You are a Senior Application Security Engineer.
Perform a deep security audit on the repository: '${repoName}'.

CONTEXT from repo:
${contextText}

OUTPUT RULES:
        1. Use the EXACT structure below.
2. Use emojis as section headers.
3. NO Markdown headers(like # or ##).
4. NO bolding(** text **) or italics(* text *).
5. NO code blocks (\`\`\`) in descriptions.
6. YOU MUST USE \`\`\`mermaid for diagrams.

MERMAID DIAGRAM RULES:
1. Do NOT use special characters ( () {} [] ) inside node labels without quotes.
   BAD: A[User (Client)]
   GOOD: A["User (Client)"]
2. Use simple node IDs (A, B, C, etc.).

REQUIRED OUTPUT TEMPLATE:

1. EXECUTIVE SUMMARY
Project: ${repoName}
Platform: [Detected Stack]
Risk Level: [HIGH/MEDIUM/LOW]

Why [Risk Level]?
[Bullet 1]
[Bullet 2]
[Bullet 3]

2. CRITICAL VULNERABILITIES (High Severity)
🔥 CV-001: [Title]
File: [Filename]
Line: [Line Number]
Severity: CRITICAL
Issue: [Description]
Risk: [Impact]
Fix: [Solution]

🔥 CV-002: [Title]
[Repeat format...]

3. WARNINGS (Medium Severity)
⚠️ MW-001: [Title]
File: [Filename]
Severity: MEDIUM
Issue: [Description]
Risk: [Impact]
Fix: [Solution]

4. LOW SEVERITY ISSUES
🟢 LW-001: [Title]
Fix: [Solution]

🟢 LW-002: [Title]
Fix: [Solution]

5. REMEDIATION PLAN (What to Fix First)
IMMEDIATE (0–24 hours)
[Action 1]
[Action 2]

SHORT TERM (2–3 days)
[Action 1]
[Action 2]

LONG TERM (1 week)
[Action 1]
[Action 2]

6. MERMAID ATTACK SURFACE DIAGRAM
graph TD
  [Generate valid Mermaid code for attack surface]

7. MERMAID DATA FLOW (Login / Admin / Cart)
sequenceDiagram
  [Generate valid Mermaid code for data flow]

FINAL CHECK:
- Did you use ** or #? REMOVE THEM.
- Did you use code blocks? REMOVE THEM.
- Ensure strict plain text spacing.
`;

        const responseMessage = await callOpenRouter([
            {
                role: "system",
                content: "You are a Senior Application Security Engineer."
            },
            {
                role: "user",
                content: prompt
            }
        ]);

        const text = cleanAIOutput(responseMessage.content || "");
        saveCachedReport(repoName, "security-audit", text);
        return text;
    } catch (error) {
        return handleOpenRouterError(error, "generateSecurityAudit");
    }
}

export async function generateCodeHealthReport(repoName: string, contextText: string): Promise<string> {
    const cached = getCachedReport(repoName, "code-health");
    if (cached) {
        return cleanAIOutput(cached);
    }

    try {
        const prompt = `
You are a Senior Code Quality Engineer with decades of experience.
Analyze the entire repository: '${repoName}'.
Generate a complete Code Health Score (0-100) with a visual report.

CONTEXT from repo:
${contextText}

YOUR TASKS:
1. Calculate a Code Health Score (0-100) based on weighted categories:
   - Documentation Quality (20%)
   - Test Coverage / Missing Tests (20%)
   - Security Hygiene (20%)
   - Architecture Clarity (15%)
   - Code Smells & Maintainability (15%)
   - Performance & Efficiency (10%)

For each category, give a sub-score (0-100), explain why, list examples, and suggest fixes.

2. Generate a Visual Summary using Mermaid charts:
   - A) Mermaid Radar Chart for category breakdown (radar title Code Health Breakdown)
   - B) Mermaid Bar Chart for scores (graph LR)

3. Identify Key Problems grouped by category.
   - Missing/weak documentation, long functions, deep nesting, duplicate logic, etc.
   - Include File + Line if possible.

4. Suggest Targeted Improvements (Quick Wins, Medium Effort, Long-Term).

OUTPUT FORMAT:
STRICTLY follow this structure.
DO NOT use Markdown headers like # or ##. Use CAPITALIZED TEXT for section titles.
STRICTLY PLAIN TEXT for descriptions. No markdown formatting.
REQUIRED: Wrapped \`\`\`mermaid code blocks for visual charts.

MERMAID DIAGRAM RULES:
1. Do NOT use special characters ( () {} [] ) inside node labels without quotes.
   BAD: A[User (Client)]
   GOOD: A["User (Client)"]
2. Use simple node IDs (A, B, C, etc.).

1. OVERALL SCORE BADGE
   - Format: "Overall Code Health Score: XX/100 (rating)"

2. VISUAL SUMMARY
   - Insert Mermaid Radar Chart code block.
   - Insert Mermaid Bar Chart code block.

3. DETAILED BREAKDOWN
   - [Category Name]: Score/100
   - Explanation...
   - Examples...
   - Fixes...

4. KEY PROBLEMS LIST
   - Category -> Issue -> Location -> Why it matters -> Fix

5. ACTION PLAN
   - Quick Wins
   - Medium Effort
   - Long-Term

FINAL RULES:
- Be highly critical and realistic (Senior level).
- Make it developer-friendly.
- Do not modify code.
- IF THE CODEBASE IS SMALL OR SIMPLE: Do NOT refuse to generate a report. Scrutinize what IS there (project structure, naming conventions, configuration, lack of tests). Scale your scoring accordingly but ALWAYS provide a full report.
`;

        const responseMessage = await callOpenRouter([
            {
                role: "system",
                content: "You are a Senior Code Quality Engineer."
            },
            {
                role: "user",
                content: prompt
            }
        ]);

        const text = cleanAIOutput(responseMessage.content || "");
        saveCachedReport(repoName, "code-health", text);
        return text;
    } catch (error) {
        return handleOpenRouterError(error, "generateCodeHealthReport");
    }
}

export async function generateDebugReport(repoName: string, userQuery: string, codeContext: string, commitContext: string): Promise<string> {
    try {
        const prompt = `
You are a Principal Software Engineer acting as a "Debug Intelligence Agent".
The user is reporting a bug/regression: "${userQuery}"

Your goal is to perform a two-part analysis:
1. Bug Explanation (Why is it happening now?) -> Based on CODE context.
2. Break Detection (When did it break?) -> Based on COMMIT context.

====================================================
CODE CONTEXT (Files & Logic):
${codeContext}
====================================================

====================================================
COMMIT HISTORY (Recent Changes):
${commitContext}
====================================================

INSTRUCTIONS:

STEP 1: BUG EXPLANATION
- Analyze the code context.
- Trace the logic related to the user's issue ("${userQuery}").
- Identify the root cause (logic error, missing check, unhandled state, etc.).
- Locate the file and function responsible.

STEP 2: BREAK DETECTION
- Scan the provided commit history.
- Look for commits that touched the relevant files or logic.
- Identify the "Likely Breaking Commit" based on the message and timing.
- Explain WHY that commit is suspicious (e.g., "Refactored auth flow", "Removed validation").

STEP 3: VISUAL EXPLANATION
- Generate a Mermaid diagram (graph LR or sequenceDiagram).
- Show the flow of the bug OR the timeline of the break.

OUTPUT FORMAT:
STRICTLY follow this structure. Do not use Markdown headers like #. Use CAPITALIZED TEXT for sections.
STRICTLY PLAIN TEXT for descriptions.
REQUIRED: Wrapped \`\`\`mermaid code blocks for diagrams.

MERMAID DIAGRAM RULES:
1. Do NOT use special characters ( () {} [] ) inside node labels without quotes.
   BAD: A[User (Client)]
   GOOD: A["User (Client)"]
2. Use simple node IDs (A, B, C, etc.).

1. BUG EXPLANATION
   - **Root Cause**: [Brief summary]
   - **File**: [Filename]
   - **Analysis**: [Detailed explanation of the logic failure]
   - **Fix Recommendation**: [Code snippet or clear steps]

2. BREAK DETECTION RESULT
   - **Likely Breaking Commit**: [SHA or "Unknown"] - [Commit Message]
   - **Why it is suspicious**: [Connect the commit to the bug]
   - **Confidence**: [High/Medium/Low]

3. MERMAID VISUAL EXPLANATION
   [Insert Mermaid code block here]

Rules:
- If you cannot find the exact commit, make a highly educated guess based on files changed, or state "Insufficient history".
- Be professional, precise, and helpful.
`;

        const responseMessage = await callOpenRouter([
            {
                role: "system",
                content: "You are a Principal Software Engineer."
            },
            {
                role: "user",
                content: prompt
            }
        ]);

        return cleanAIOutput(responseMessage.content || "");
    } catch (error) {
        return handleOpenRouterError(error, "generateDebugReport");
    }
}

export async function generateFlowModeAnswer(prompt: string): Promise<string> {
    try {
        const responseMessage = await callOpenRouter([
            {
                role: "system",
                content: "You are an advanced codebase assistant."
            },
            {
                role: "user",
                content: prompt
            }
        ]);

        return cleanAIOutput(responseMessage.content || "");
    } catch (error) {
        return handleOpenRouterError(error, "generateFlowModeAnswer");
    }
}

                                                                                                                                            
