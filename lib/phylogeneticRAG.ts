import { GeneticNode } from "./phylogeneticIndexer";
import { searchVectors } from "./pinecone";
import { getSingleEmbedding, callOpenRouter } from "./openrouter";
import { createAdminClient } from "./supabase/serviceRole";
import { loadGraphNodes, getRepoId } from "./graphStore";

/**
 * Loads the Compiled Dependency Graph (CDG) for a repository from Supabase.
 * Async and serverless-safe — no filesystem reads.
 */
export async function loadCodeGraph(collectionName: string, userId: string): Promise<Record<string, GeneticNode>> {
    const cleanRepoName = collectionName.replace("code_chunks_", "");
    const repoId = await getRepoId(cleanRepoName, userId);
    if (!repoId) {
        console.warn(`[Phylogenetic RAG] No repo found for ${cleanRepoName}`);
        return {};
    }
    return loadGraphNodes(repoId);
}

export interface SymbolLineageResult {
    symbol: GeneticNode;
    lineage: GeneticNode[];
    siblings: GeneticNode[];
    entropyScore: number;
}

/**
 * Traces the phylogenetic lineage and locates siblings for a given symbol name.
 */
export async function getSymbolLineage(
    symbolName: string,
    collectionName: string,
    userId: string
): Promise<SymbolLineageResult | null> {
    const graph = await loadCodeGraph(collectionName, userId);
    const nodes = Object.values(graph);

    // Find the latest active version of the symbol (exclude deletions)
    const latestSymbol = nodes
        .filter(n => n.name.toLowerCase() === symbolName.toLowerCase() && n.changeType !== "deletion")
        .sort((a, b) => b.commitSha.localeCompare(a.commitSha))[0]; // Prefer most recent

    if (!latestSymbol) {
        return null;
    }

    // Trace ancestors recursively
    const lineage: GeneticNode[] = [];
    const visited = new Set<string>();

    function trace(nodeId: string) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const node = graph[nodeId];
        if (node) {
            lineage.push(node);
            for (const parentId of node.parentIds) {
                trace(parentId);
            }
        }
    }

    for (const parentId of latestSymbol.parentIds) {
        trace(parentId);
    }

    // Find siblings (other nodes that share the same parents)
    const parentSet = new Set(latestSymbol.parentIds);
    const siblings = nodes.filter(n =>
        n.id !== latestSymbol.id &&
        n.changeType !== "deletion" &&
        n.parentIds.some(p => parentSet.has(p))
    );

    // Calculate Evolutionary Entropy (Volatility)
    // Formula: (number of mutations in the symbol's direct lineage / total commits in graph) * 10
    const mutationCount = lineage.filter(n => n.changeType === "mutation").length;
    const uniqueCommits = new Set(nodes.map(n => n.commitSha)).size;
    const entropyScore = uniqueCommits > 0
        ? Math.min(10, parseFloat(((mutationCount / uniqueCommits) * 10).toFixed(2)))
        : 0;

    return {
        symbol: latestSymbol,
        lineage,
        siblings,
        entropyScore
    };
}

export interface EntropyHotspot {
    name: string;
    filePath: string;
    score: number;
    mutationCount: number;
}

/**
 * Scans the graph to identify the top 5 most volatile (entropy-heavy) symbols.
 */
export async function getEvolutionaryHotspots(collectionName: string, userId: string): Promise<EntropyHotspot[]> {
    const graph = await loadCodeGraph(collectionName, userId);
    const nodes = Object.values(graph);

    // Group nodes by symbol signature (filePath::name) to count their mutation history
    const symbolMutations: Record<string, { name: string, filePath: string, count: number }> = {};
    const uniqueCommits = new Set(nodes.map(n => n.commitSha)).size;

    for (const node of nodes) {
        if (node.changeType === "deletion") continue;
        const sig = `${node.filePath}::${node.name}`;

        if (!symbolMutations[sig]) {
            symbolMutations[sig] = { name: node.name, filePath: node.filePath, count: 0 };
        }

        if (node.changeType === "mutation") {
            symbolMutations[sig].count++;
        }
    }

    const hotspots = Object.values(symbolMutations).map(sym => {
        const score = uniqueCommits > 0
            ? Math.min(10, parseFloat(((sym.count / uniqueCommits) * 10).toFixed(2)))
            : 0;

        return {
            name: sym.name,
            filePath: sym.filePath,
            score,
            mutationCount: sym.count
        };
    });

    // Sort by entropy score descending, limit to top 5
    return hotspots.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * Performs a hybrid Graph-Vector retrieval with an LLM Reranking step.
 * 1. Fetches top 15 candidates from Qdrant.
 * 2. Enriches them with caller-callee static dependencies and parent lineage from Compiled Dependency Graph (CDG).
 * 3. Reranks using an LLM prompt to select the top 5 most relevant.
 */
export async function retrieveExpandedAndRerankedContext(
    query: string,
    collectionName: string,
    userId: string,
    limit: number = 5
): Promise<string> {
    if (!query || !query.trim()) return "No search query provided.";

    // 1. Get query embeddings
    const queryVec = await getSingleEmbedding(query);

    // 2. Fetch 15 candidates for reranking
    const candidates = await searchVectors(collectionName, queryVec, 15);
    if (candidates.length === 0) {
        return "No relevant codebase memory chunks found.";
    }

    // 3. Graph RAG: Load Dependency Graph to inject relationships
    const graph = await loadCodeGraph(collectionName, userId);
    const nodes = Object.values(graph);

    // Enrich candidates with Graph Metadata (Lineage + Call Graph)
    const enrichedCandidates = candidates.map((chunk, idx) => {
        // Try to identify the matching function or class node in our graph
        const funcNameMatch = chunk.text.match(/^(?:Parent\s+)?(?:Function|Class):\s*(\w+)/m);
        const name = funcNameMatch ? funcNameMatch[1] : null;

        let graphContext = "";
        let finalCodeBody = chunk.text;

        if (name) {
            const node = nodes.find(n => n.name === name && n.filePath === chunk.filePath && n.changeType !== "deletion");
            if (node) {
                // If it is a sub-chunk, inject the COMPLETE parent body instead of the snippet chunk text
                if (chunk.text.includes("Parent Function:") || chunk.text.includes("Parent Class:")) {
                    finalCodeBody = [
                        `Function: ${node.name}`,
                        `Type: ${node.type}`,
                        `File: ${node.filePath}`,
                        `Commit: ${node.commitSha.slice(0, 7)}`,
                        `Code (Full Body):`,
                        node.body
                    ].join("\n");
                }

                // Ancestry
                const parentNames = node.parentIds.map(id => graph[id]?.name).filter(Boolean);

                // Call Graph: locate who calls this, and who this calls
                const callees = node.calls || [];
                const callers = nodes
                    .filter(n => n.calls && n.calls.includes(name) && n.changeType !== "deletion")
                    .map(n => n.name);

                graphContext = [
                    "\n--- GRAPH RELATIONSHIPS ---",
                    `File Path: ${node.filePath}`,
                    parentNames.length > 0 ? `Lineage Ancestors: ${parentNames.join(", ")}` : "",
                    callees.length > 0 ? `Calls: ${callees.join(", ")}` : "",
                    callers.length > 0 ? `Called By: ${callers.join(", ")}` : "",
                    "----------------------------\n"
                ].filter(Boolean).join("\n");
            }
        }

        return {
            originalIndex: idx,
            text: finalCodeBody + graphContext,
            filePath: chunk.filePath,
            commit: chunk.commit
        };
    });

    // 4. LLM-based Reranking
    const rerankPrompt = `
You are a highly precise search reranker. Given the following user search query and a list of 15 retrieved code/diff chunks, select the top 5 chunks that are most relevant and necessary to construct a complete answer.

Query: "${query}"

Retrieved Chunks:
${enrichedCandidates.map((c, i) => `[Chunk ${i}] (File: ${c.filePath || 'unknown'}, Commit: ${c.commit?.slice(0, 7) || 'unknown'})\n${c.text.slice(0, 450)}\n---`).join("\n\n")}

Evaluate the chunks. Identify the indices of the top 5 most useful chunks. Return ONLY a valid JSON array of indices (e.g. [3, 0, 8, 1, 14]) with the most relevant first. Do not explain, return only the JSON array.
`;

    try {
        console.log(`[Reranker] Reranking 15 vector candidates for query: "${query.slice(0, 60)}..."`);
        const response = await callOpenRouter([
            { role: "system", content: "You are a precise search ranker. Output JSON array only." },
            { role: "user", content: rerankPrompt }
        ]);

        const reply = response.content || "";
        const jsonMatch = reply.match(/\[\s*\d+\s*(?:,\s*\d+\s*)*\]/);

        if (jsonMatch) {
            const indices: number[] = JSON.parse(jsonMatch[0]);
            console.log(`[Reranker] Model selected indices:`, indices);

            // Filter and sort the enriched candidates based on the LLM decision
            const reranked = indices
                .slice(0, limit)
                .map(idx => enrichedCandidates[idx])
                .filter(Boolean);

            if (reranked.length > 0) {
                return reranked.map(r => r.text).join("\n\n---\n\n");
            }
        }
    } catch (e) {
        console.warn("[Reranker] Reranker model failed. Falling back to default top-5 vector similarity.", e);
    }

    // Fallback: default top 5 from similarity search
    return enrichedCandidates.slice(0, limit).map(r => r.text).join("\n\n---\n\n");
}






