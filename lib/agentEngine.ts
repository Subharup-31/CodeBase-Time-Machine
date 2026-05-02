import { callOpenRouter, OpenRouterMessage, getSingleEmbedding } from "./openrouter";
import { searchVectors } from "./pinecone";
import { fetchCommitHistory, fetchCommitDetails, fetchRepoTree, fetchFileContent, searchCode } from "./git";
import { getSymbolLineage, getEvolutionaryHotspots, retrieveExpandedAndRerankedContext } from "./phylogeneticRAG";
import { performBioAlignmentAndSynthesis } from "./bioCodeAlignment";

export type ToolDefinition = {
    name: string;
    description: string;
    parameters: {
        type: "object";
        properties: Record<string, any>;
        required?: string[];
    };
};

// 1. Definition of tools
const TOOLS: ToolDefinition[] = [
    {
        name: "searchEvolutionVectors",
        description: "Semantically searches the repository's git commit diff history for matching changes, messages, and patches.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "The semantic search query." }
            },
            required: ["query"]
        }
    },
    {
        name: "fetchCommitHistory",
        description: "Retrieves a list of recent commits for the repository.",
        parameters: {
            type: "object",
            properties: {
                limit: { type: "number", description: "Number of commits to fetch (max 50, default 20)." }
            }
        }
    },
    {
        name: "fetchCommitDetails",
        description: "Retrieves the file changes and diff patches for a specific commit SHA.",
        parameters: {
            type: "object",
            properties: {
                sha: { type: "string", description: "The commit SHA." }
            },
            required: ["sha"]
        }
    },
    {
        name: "fetchRepoTree",
        description: "Lists the repository file structure (relative file paths).",
        parameters: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "fetchFileContent",
        description: "Fetches the text content of a specific file path.",
        parameters: {
            type: "object",
            properties: {
                filePath: { type: "string", description: "The relative path to the file." }
            },
            required: ["filePath"]
        }
    },
    {
        name: "searchCode",
        description: "Searches the codebase for specific text matches.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "The code search query." }
            },
            required: ["query"]
        }
    },
    {
        name: "fetchSymbolLineage",
        description: "Traces the phylogenetic lineage (evolution history) of a function or class in the repository.",
        parameters: {
            type: "object",
            properties: {
                symbolName: { type: "string", description: "The name of the function or class." }
            },
            required: ["symbolName"]
        }
    },
    {
        name: "fetchSymbolSiblings",
        description: "Locates all copy-pasted or diverged clones (siblings) of a function or class across the codebase.",
        parameters: {
            type: "object",
            properties: {
                symbolName: { type: "string", description: "The name of the function or class." }
            },
            required: ["symbolName"]
        }
    },
    {
        name: "alignSymbolClones",
        description: "Performs Multiple Code Sequence Alignment (MCSA) on copy-pasted clones of a symbol and synthesizes a unified, refactored ancestor function to replace them.",
        parameters: {
            type: "object",
            properties: {
                symbolName: { type: "string", description: "The name of the duplicated function/class." }
            },
            required: ["symbolName"]
        }
    },
    {
        name: "fetchCodeVolatility",
        description: "Scans the codebase to find the top 5 most volatile, high-entropy (frequently mutated) functions/classes.",
        parameters: {
            type: "object",
            properties: {}
        }
    },
    {
        name: "delegateToSubAgent",
        description: "Delegates a specific sub-task to a specialized sub-agent (either the 'historian' for git logs/diffs/evolution/phylogenetics, or the 'inspector' for code tree/file/refactoring details).",
        parameters: {
            type: "object",
            properties: {
                agentType: { type: "string", enum: ["historian", "inspector"], description: "The type of sub-agent to invoke." },
                instruction: { type: "string", description: "The precise task or instruction for the sub-agent." }
            },
            required: ["agentType", "instruction"]
        }
    }
];

// 2. System instructions for the agents
const ORCHESTRATOR_SYSTEM_PROMPT = `
You are the main Codebase Explorer Orchestrator Agent.
Your job is to receive the user's question and coordinate the answer by delegating tasks to specialized sub-agents.

Available Sub-agents:
1. 'historian': Specialized in git history, commit messages, code diffs, authors, and explaining the chronological evolution and phylogenetic lineage of code.
2. 'inspector': Specialized in current code structures, file tree parsing, function logic, and aligning and refactoring copy-pasted code.

DO NOT try to answer questions directly if they require exploring git commits, diff patches, tracing lineages, or refactoring. Instead, delegate to 'historian' or 'inspector' using the 'delegateToSubAgent' tool.
Once you receive the sub-agent responses, synthesize them into a clean, professional, and comprehensive markdown answer for the user.
Use Mermaid diagrams where appropriate to illustrate timeline maps or architectures. Always respond in markdown format.
`;

const HISTORIAN_SYSTEM_PROMPT = `
You are the Git Historian Agent.
Your job is to analyze the commit logs, diff patches, authors, and dates of changes in the repository to explain the "why" and "how" behind code evolution.

You have access to:
- 'searchEvolutionVectors': Semantically search the commit diff history.
- 'fetchCommitHistory': Get a list of recent commits.
- 'fetchCommitDetails': Get detailed file diffs for a specific commit.
- 'fetchSymbolLineage': Trace the evolutionary lineage (mutations) of a specific function/class.
- 'fetchCodeVolatility': Scan the codebase to find high-entropy, frequently mutated functions.

Analyze the history, reconstruct the evolution timeline of the target feature/file, and explain why changes were made, who made them, and what code was changed. Give a clear, factual, chronological summary of your findings.
`;

const INSPECTOR_SYSTEM_PROMPT = `
You are the Code Inspector Agent.
Your job is to search the codebase file tree, check file contents, analyze the logic of functions and classes, and perform code alignment and refactoring.

You have access to:
- 'fetchRepoTree': List repository files.
- 'fetchFileContent': Read file contents.
- 'searchCode': Search code files via GitHub Search.
- 'fetchSymbolSiblings': Find copy-pasted clones of a function/class.
- 'alignSymbolClones': Align the copy-pasted variants and synthesize a unified, refactored ancestor template.

Locate the files related to the task, analyze their functions/logic, align and refactor them if requested, and summarize their code structure and architecture clearly.
`;

type ToolArgs = {
    query?: string;
    limit?: number;
    sha?: string;
    filePath?: string;
    symbolName?: string;
    agentType?: 'historian' | 'inspector';
    instruction?: string;
};

/**
 * Tool execution router
 */
async function executeTool(
    name: string,
    args: ToolArgs,
    repoUrl: string,
    collectionName: string,
    userId: string
): Promise<string> {
    switch (name) {
        case "searchEvolutionVectors": {
            return await retrieveExpandedAndRerankedContext(args.query!, collectionName, userId, 5);
        }
        case "fetchCommitHistory": {
            const limit = args.limit || 20;
            const history = await fetchCommitHistory(repoUrl, limit);
            return JSON.stringify(history, null, 2);
        }
        case "fetchCommitDetails": {
            const details = await fetchCommitDetails(repoUrl, args.sha!);
            if (!details) return `Could not fetch details for commit ${args.sha}`;
            const cleanFiles = details.files.map(f => ({
                filename: f.filename,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions,
                patch: f.patch ? f.patch.slice(0, 1000) + (f.patch.length > 1000 ? "\n...(truncated)" : "") : undefined
            }));
            return JSON.stringify({ ...details, files: cleanFiles }, null, 2);
        }
        case "fetchRepoTree": {
            const tree = await fetchRepoTree(repoUrl, false);
            // Filter out noise files to give the LLM a clean, focused view
            const ignoredPatterns = /(\.lock$|node_modules\/|dist\/|\.next\/|\.cache\/|__pycache__\/|\.min\.|coverage\/)/i;
            const filteredTree = tree
                .filter(f => !ignoredPatterns.test(f.path))
                .slice(0, 150)
                .map(f => f.path)
                .join("\n");
            return filteredTree || "No files found in repository.";
        }
        case "fetchFileContent": {
            const content = await fetchFileContent(repoUrl, args.filePath!);
            return content.slice(0, 3000) + (content.length > 3000 ? "\n...(truncated)" : "");
        }
        case "searchCode": {
            const results = await searchCode(repoUrl, args.query!);
            return results.join("\n");
        }
        case "fetchSymbolLineage": {
            const result = await getSymbolLineage(args.symbolName!, collectionName, userId);
            if (!result) return `No lineage graph found for symbol '${args.symbolName}'. Ensure the repo has been indexed.`;
            return JSON.stringify({
                symbol: { name: result.symbol.name, file: result.symbol.filePath, commit: result.symbol.commitSha },
                entropyScore: result.entropyScore,
                lineage: result.lineage.map(l => ({ commit: l.commitSha.slice(0, 7), file: l.filePath, change: l.changeType })),
                siblingsCount: result.siblings.length
            }, null, 2);
        }
        case "fetchSymbolSiblings": {
            const result = await getSymbolLineage(args.symbolName!, collectionName, userId);
            if (!result) return `No siblings found for symbol '${args.symbolName}'.`;
            return JSON.stringify(result.siblings.map(s => ({ name: s.name, file: s.filePath, commit: s.commitSha.slice(0, 7) })), null, 2);
        }
        case "alignSymbolClones": {
            const result = await getSymbolLineage(args.symbolName!, collectionName, userId);
            if (!result || result.siblings.length === 0) {
                return `Symbol '${args.symbolName}' has no other copy-pasted clones (siblings) in the graph. Cannot align.`;
            }
            const allClones = [result.symbol, ...result.siblings];
            const alignmentResult = await performBioAlignmentAndSynthesis(allClones);
            return [
                "=== MULTIPLE CODE SEQUENCE ALIGNMENT ===",
                alignmentResult.alignment,
                "",
                "=== ANCESTRAL STATE SYNTHESIS ===",
                alignmentResult.ancestor,
                "",
                "=== REFACTORING PLAN ===",
                alignmentResult.refactoringPlan
            ].join("\n");
        }
        case "fetchCodeVolatility": {
            const hotspots = await getEvolutionaryHotspots(collectionName, userId);
            return JSON.stringify(hotspots, null, 2);
        }
        case "delegateToSubAgent": {
            return await runSubAgent(args.agentType!, args.instruction!, repoUrl, collectionName, userId);
        }
        default:
            return `Error: Tool ${name} not found.`;
    }
}

/**
 * Runs a specialized sub-agent session
 */
export async function runSubAgent(
    agentType: "historian" | "inspector",
    instruction: string,
    repoUrl: string,
    collectionName: string,
    userId: string
): Promise<string> {
    console.log(`[Sub-Agent] Spawning '${agentType}' with instruction: "${instruction}"`);
    const systemPrompt = agentType === "historian" ? HISTORIAN_SYSTEM_PROMPT : INSPECTOR_SYSTEM_PROMPT;
    
    // Sub-agents are restricted to their domains, so we filter tools
    const allowedTools = TOOLS.filter(t => {
        if (agentType === "historian") {
            return ["searchEvolutionVectors", "fetchCommitHistory", "fetchCommitDetails", "fetchSymbolLineage", "fetchCodeVolatility"].includes(t.name);
        } else {
            return ["fetchRepoTree", "fetchFileContent", "searchCode", "fetchSymbolSiblings", "alignSymbolClones"].includes(t.name);
        }
    });

    return await runAgentLoop(systemPrompt, instruction, allowedTools, repoUrl, collectionName, userId);
}

/**
 * Runs the main Orchestrator Agent to answer the user query
 */
export async function runOrchestrator(
    query: string,
    repoUrl: string,
    collectionName: string,
    userId: string,
    onToken?: (token: string) => void
): Promise<string> {
    console.log(`[Orchestrator] Processing user query: "${query}"`);
    
    // 1. Classification
    if (!isAgenticQuery(query)) {
        console.log(`[Orchestrator] Non-agentic query detected. Bypassing agent loop for Direct RAG.`);
        return await runDirectRAG(query, collectionName, userId, onToken);
    }
    
    console.log(`[Orchestrator] Agentic query detected. Running full ReAct agent loop.`);
    // Orchestrator has access only to delegation tool
    const orchestratorTools = TOOLS.filter(t => t.name === "delegateToSubAgent");

    return await runAgentLoop(ORCHESTRATOR_SYSTEM_PROMPT, query, orchestratorTools, repoUrl, collectionName, userId, onToken);
}


/**
 * The core ReAct loop for tool-calling execution
 */
async function runAgentLoop(
    systemPrompt: string,
    userMessage: string,
    availableTools: ToolDefinition[],
    repoUrl: string,
    collectionName: string,
    userId: string,
    onToken?: (token: string) => void
): Promise<string> {
    const messages: OpenRouterMessage[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
    ];

    let turns = 0;
    const maxTurns = 8; // Prevent infinite execution loops

    while (turns < maxTurns) {
        turns++;
        console.log(`[Agent Loop] Turn ${turns}...`);

        try {
            const responseMessage = await callOpenRouter(messages, { 
                tools: availableTools,
                onToken
            });
            messages.push(responseMessage);

            if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                console.log(`[Agent Loop] Model requested ${responseMessage.tool_calls.length} tool calls.`);

                for (const toolCall of responseMessage.tool_calls) {
                    const name = toolCall.function.name;
                    let args: ToolArgs = {};
                    try {
                        args = JSON.parse(toolCall.function.arguments || "{}") as ToolArgs;
                    } catch (parseErr) {
                        console.warn(`[Agent Loop] Failed to parse arguments for tool ${name}:`, toolCall.function.arguments);
                        // Try to extract from string if it looks like a plain value
                        args = {};
                    }
                    console.log(`[Agent Loop] Calling tool: ${name} with args:`, args);

                    const result = await executeTool(name, args, repoUrl, collectionName, userId);

                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        name: name,
                        content: result
                    });
                }
            } else {
                // No tool calls, meaning the model gave its final answer
                return responseMessage.content || "";
            }
        } catch (error) {
            console.error("[Agent Loop] Error during execution turn:", error);
            throw error;
        }
    }

    return "Agent loop reached maximum turns without finalizing.";
}

/**
 * Helper to classify if a query requires multi-step agent reasoning or can use a fast RAG bypass
 */
export function isAgenticQuery(query: string): boolean {
    const lower = query.toLowerCase();
    
    // Keywords related to clone alignment / refactoring
    const cloneKeywords = ["refactor", "align", "duplicate", "clone", "copy-paste", "mcsa"];
    
    // Keywords related to Git timeline / regressions / evolution / history
    const historyKeywords = ["break", "broke", "regression", "commit", "git", "who", "when", "introduce", "timeline", "history", "entropy", "volatility", "volatile", "hotspot"];
    
    // Keywords related to specialized report generation
    const reportKeywords = ["security scan", "vulnerability", "health score", "health report", "test case", "unit test", "generate test"];

    const matchesClone = cloneKeywords.some(kw => lower.includes(kw));
    const matchesHistory = historyKeywords.some(kw => lower.includes(kw));
    const matchesReport = reportKeywords.some(kw => lower.includes(kw));

    return matchesClone || matchesHistory || matchesReport;
}

/**
 * Runs a fast, single-turn RAG retrieval and streams the LLM response directly
 */
export async function runDirectRAG(
    query: string,
    collectionName: string,
    userId: string,
    onToken?: (token: string) => void
): Promise<string> {
    console.log(`[Direct RAG] Executing direct RAG path for query: "${query}"`);
    
    // 1. Retrieve expanded and reranked context
    const contextText = await retrieveExpandedAndRerankedContext(query, collectionName, userId, 8);
    
    // 2. Compile direct RAG prompt
    const prompt = `
You are an advanced codebase assistant. Answer the user's question about the codebase.

Context from the codebase:
${contextText}

User Query: "${query}"

Instructions:
- Answer the query accurately based on the provided code context.
- Be concise and focus on the technical details.
- Use code snippets where appropriate.
- Respond in markdown format.
`;
    
    // 3. Call OpenRouter with streaming
    const response = await callOpenRouter(
        [
            { role: "system", content: "You are an advanced codebase assistant." },
            { role: "user", content: prompt }
        ],
        {
            onToken
        }
    );
    
    return response.content || "";
}

                                                                                                                                           
