import { GeneticNode } from "./phylogeneticIndexer";
import { searchVectors } from "./pinecone";
import { getSingleEmbedding, callOpenRouter } from "./openrouter";
import { createAdminClient } from "./supabase/serviceRole";
import {
    getRepoId,
    fetchSymbolAncestorsFromDB,
    fetchSymbolSiblingsFromDB,
    fetchEvolutionaryHotspotsFromDB,
    EvolutionaryHotspot
} from "./graphStore";

export interface SymbolLineageResult {
    symbol: GeneticNode;
    lineage: GeneticNode[];
    siblings: GeneticNode[];
    entropyScore: number;
}

/**
 * Traces the phylogenetic lineage and locates siblings for a given symbol name.
 * DB-driven, edge-safe traversal.
 */
export async function getSymbolLineage(
    symbolName: string,
    collectionName: string,
    userId: string
): Promise<SymbolLineageResult | null> {
    const cleanRepoName = collectionName.replace("code_chunks_", "");
    const repoId = await getRepoId(cleanRepoName, userId);
    if (!repoId) {
        console.warn(`[Phylogenetic RAG] No repo found for ${cleanRepoName}`);
        return null;
    }

    const adminClient = createAdminClient();

    // 1. Find the latest active version of the symbol (exclude deletions)
    const { data: latestSymbolRows, error: searchError } = await adminClient
        .from('genetic_nodes')
        .select('*')
        .eq('repo_id', repoId)
        .eq('name', symbolName)
        .neq('change_type', 'deletion')
        .order('commit_sha', { ascending: false })
        .limit(1);

    if (searchError || !latestSymbolRows || latestSymbolRows.length === 0) {
        return null;
    }

    const row = latestSymbolRows[0];
    const latestSymbol: GeneticNode = {
        id: row.id,
        name: row.name,
        type: row.type as any,
        filePath: row.file_path,
        commitSha: row.commit_sha,
        changeType: row.change_type as any,
        body: row.body || "",
        calls: row.calls || [],
        parentIds: [],
        structuralHash: row.structural_hash || ""
    };

    // 2. Fetch ancestors recursively via database CTE RPC function
    const lineage = await fetchSymbolAncestorsFromDB(latestSymbol.id);

    // 3. Fetch siblings via database join query
    const siblings = await fetchSymbolSiblingsFromDB(latestSymbol.id);

    // 4. Calculate Evolutionary Entropy (Volatility)
    // Formula: (number of mutations in the symbol's direct lineage / total commits in graph) * 10
    const mutationCount = lineage.filter(n => n.changeType === "mutation").length;

    const { count: totalCommits } = await adminClient
        .from('indexed_commits')
        .select('*', { count: 'exact', head: true })
        .eq('repo_id', repoId);

    const uniqueCommits = totalCommits || 0;
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
 * Offloaded to PostgreSQL functions.
 */
export async function getEvolutionaryHotspots(collectionName: string, userId: string): Promise<EvolutionaryHotspot[]> {
    const cleanRepoName = collectionName.replace("code_chunks_", "");
    const repoId = await getRepoId(cleanRepoName, userId);
    if (!repoId) return [];

    return await fetchEvolutionaryHotspotsFromDB(repoId);
}

/**
 * Performs a hybrid Graph-Vector retrieval with an LLM Reranking step.
 * 1. Fetches top 15 candidates from Pinecone.
 * 2. Enriches them with caller-callee static dependencies and parent lineage from DB.
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

    const cleanRepoName = collectionName.replace("code_chunks_", "");
    const repoId = await getRepoId(cleanRepoName, userId);

    // 3. Graph RAG: Query matching nodes, parents, and callers in batch
    const candidateSymbolNames: string[] = [];
    candidates.forEach(chunk => {
        const match = chunk.text.match(/^(?:Parent\s+)?(?:Function|Class):\s*(\w+)/m);
        if (match) {
            candidateSymbolNames.push(match[1]);
        }
    });

    let matchedNodes: any[] = [];
    let parentNamesMap: Record<string, string[]> = {};
    let callersMap: Record<string, string[]> = {};

    if (repoId && candidateSymbolNames.length > 0) {
        const adminClient = createAdminClient();

        // Fetch matched nodes in repo
        const { data: nodes } = await adminClient
            .from('genetic_nodes')
            .select('*')
            .eq('repo_id', repoId)
            .neq('change_type', 'deletion')
            .in('name', candidateSymbolNames);

        matchedNodes = nodes || [];

        const matchedNodeIds = matchedNodes.map(n => n.id);
        if (matchedNodeIds.length > 0) {
            // Fetch parent names via edge join
            const { data: parentEdges } = await adminClient
                .from('genetic_edges')
                .select('child_node_id, parent:genetic_nodes!parent_node_id(name)')
                .in('child_node_id', matchedNodeIds);

            (parentEdges || []).forEach((edge: any) => {
                const childId = edge.child_node_id;
                const parentName = edge.parent?.name;
                if (parentName) {
                    if (!parentNamesMap[childId]) parentNamesMap[childId] = [];
                    parentNamesMap[childId].push(parentName);
                }
            });

            // Fetch callers (who calls this function name)
            const { data: callers } = await adminClient
                .from('genetic_nodes')
                .select('name, calls')
                .eq('repo_id', repoId)
                .neq('change_type', 'deletion')
                .filter('calls', 'ov', `{${candidateSymbolNames.join(',')}}`);

            (callers || []).forEach(caller => {
                candidateSymbolNames.forEach(targetName => {
                    if (caller.calls && caller.calls.includes(targetName)) {
                        if (!callersMap[targetName]) callersMap[targetName] = [];
                        callersMap[targetName].push(caller.name);
                    }
                });
            });
        }
    }

    // Enrich candidates with Graph Metadata (Lineage + Call Graph)
    const enrichedCandidates = candidates.map((chunk, idx) => {
        const funcNameMatch = chunk.text.match(/^(?:Parent\s+)?(?:Function|Class):\s*(\w+)/m);
        const name = funcNameMatch ? funcNameMatch[1] : null;

        let graphContext = "";
        let finalCodeBody = chunk.text;

        if (name) {
            const node = matchedNodes.find(n => n.name === name && n.file_path === chunk.filePath);
            if (node) {
                // If it is a sub-chunk, inject the COMPLETE parent body instead of the snippet chunk text
                if (chunk.text.includes("Parent Function:") || chunk.text.includes("Parent Class:")) {
                    finalCodeBody = [
                        `Function: ${node.name}`,
                        `Type: ${node.type}`,
                        `File: ${node.file_path}`,
                        `Commit: ${node.commit_sha.slice(0, 7)}`,
                        `Code (Full Body):`,
                        node.body
                    ].join("\n");
                }

                // Ancestry
                const parentNames = parentNamesMap[node.id] || [];

                // Call Graph
                const callees = node.calls || [];
                const callers = callersMap[node.name] || [];

                graphContext = [
                    "\n--- GRAPH RELATIONSHIPS ---",
                    `File Path: ${node.file_path}`,
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
