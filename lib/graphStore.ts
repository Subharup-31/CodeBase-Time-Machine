import { createAdminClient } from "./supabase/serviceRole";
import { GeneticNode } from "./phylogeneticIndexer";

/**
 * Saves a batch of genetic nodes and their edges to the relational graph tables.
 * Uses upsert to be safe for incremental re-indexing.
 */
export async function saveGraphNodes(
    repoId: string,
    userId: string,
    graph: Record<string, GeneticNode>
): Promise<void> {
    const adminClient = createAdminClient();
    const nodes = Object.values(graph);

    if (nodes.length === 0) return;

    // Build node rows
    const nodeRows = nodes.map(node => ({
        id: node.id,
        repo_id: repoId,
        user_id: userId,
        name: node.name,
        type: node.type,
        file_path: node.filePath,
        commit_sha: node.commitSha,
        change_type: node.changeType,
        body: node.body || null,
        calls: node.calls || [],
    }));

    // Upsert nodes in batches of 500
    const BATCH = 500;
    for (let i = 0; i < nodeRows.length; i += BATCH) {
        const batch = nodeRows.slice(i, i + BATCH);
        const { error } = await adminClient
            .from('genetic_nodes')
            .upsert(batch, { onConflict: 'id' });
        if (error) throw new Error(`[GraphStore] Failed to save nodes: ${error.message}`);
    }

    // Build edge rows (parent -> child relationships)
    const edgeRows: { repo_id: string; parent_node_id: string; child_node_id: string }[] = [];
    for (const node of nodes) {
        for (const parentId of node.parentIds) {
            edgeRows.push({
                repo_id: repoId,
                parent_node_id: parentId,
                child_node_id: node.id,
            });
        }
    }

    if (edgeRows.length > 0) {
        for (let i = 0; i < edgeRows.length; i += BATCH) {
            const batch = edgeRows.slice(i, i + BATCH);
            const { error } = await adminClient
                .from('genetic_edges')
                .upsert(batch, { onConflict: 'parent_node_id,child_node_id' });
            if (error) throw new Error(`[GraphStore] Failed to save edges: ${error.message}`);
        }
    }
}

/**
 * Loads nodes for a specific repo from relational tables.
 * Supports pagination for very large graphs.
 */
export async function loadGraphNodes(
    repoId: string,
    limit = 10000,
    offset = 0
): Promise<Record<string, GeneticNode>> {
    const adminClient = createAdminClient();

    const { data: nodeRows, error: nodesError } = await adminClient
        .from('genetic_nodes')
        .select('*')
        .eq('repo_id', repoId)
        .range(offset, offset + limit - 1);

    if (nodesError) throw new Error(`[GraphStore] Failed to load nodes: ${nodesError.message}`);
    if (!nodeRows || nodeRows.length === 0) return {};

    const nodeIds = nodeRows.map(n => n.id);

    // Load edges for these nodes
    const { data: edgeRows, error: edgesError } = await adminClient
        .from('genetic_edges')
        .select('parent_node_id, child_node_id')
        .eq('repo_id', repoId)
        .in('child_node_id', nodeIds);

    if (edgesError) throw new Error(`[GraphStore] Failed to load edges: ${edgesError.message}`);

    // Build parentIds map from edges
    const parentMap: Record<string, string[]> = {};
    for (const edge of (edgeRows || [])) {
        if (!parentMap[edge.child_node_id]) parentMap[edge.child_node_id] = [];
        parentMap[edge.child_node_id].push(edge.parent_node_id);
    }

    // Reconstruct GeneticNode objects
    const graph: Record<string, GeneticNode> = {};
    for (const row of nodeRows) {
        graph[row.id] = {
            id: row.id,
            name: row.name,
            type: row.type as "function" | "class",
            filePath: row.file_path,
            commitSha: row.commit_sha,
            changeType: row.change_type as "origin" | "mutation" | "speciation" | "deletion",
            body: row.body || "",
            calls: row.calls || [],
            parentIds: parentMap[row.id] || [],
        };
    }

    return graph;
}

/**
 * Records which commits have been indexed for a repo (for incremental sync).
 */
export async function markCommitsAsIndexed(repoId: string, commitShas: string[]): Promise<void> {
    if (commitShas.length === 0) return;
    const adminClient = createAdminClient();
    const rows = commitShas.map(sha => ({ repo_id: repoId, commit_sha: sha }));
    const { error } = await adminClient
        .from('indexed_commits')
        .upsert(rows, { onConflict: 'repo_id,commit_sha' });
    if (error) throw new Error(`[GraphStore] Failed to mark commits as indexed: ${error.message}`);
}

/**
 * Returns the set of commit SHAs already indexed for a repo.
 */
export async function getIndexedCommitShas(repoId: string): Promise<Set<string>> {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from('indexed_commits')
        .select('commit_sha')
        .eq('repo_id', repoId);
    if (error) return new Set();
    return new Set((data || []).map(r => r.commit_sha));
}

/**
 * Returns the repo_id for a given repo name + user_id.
 */
export async function getRepoId(repoName: string, userId: string): Promise<string | null> {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from('repositories')
        .select('id')
        .eq('name', repoName)
        .eq('user_id', userId)
        .single();
    if (error || !data) return null;
    return data.id;
}
