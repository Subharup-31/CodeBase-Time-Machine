-- Migration 06: Create Traversal Stored Procedures
-- Declares database-side graph querying procedures to run fast edge-compatible traversals

-- 1. Recursive Lineage Stored Procedure
CREATE OR REPLACE FUNCTION get_symbol_ancestors(start_node_id UUID)
RETURNS SETOF genetic_nodes AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE lineage AS (
        SELECT n.id, n.repo_id, n.user_id, n.name, n.type, n.file_path, n.commit_sha, n.change_type, n.body, n.calls, n.structural_hash, n.created_at
        FROM genetic_nodes n
        WHERE n.id = start_node_id

        UNION

        SELECT parent.id, parent.repo_id, parent.user_id, parent.name, parent.type, parent.file_path, parent.commit_sha, parent.change_type, parent.body, parent.calls, parent.structural_hash, parent.created_at
        FROM genetic_nodes parent
        INNER JOIN genetic_edges edge ON edge.parent_node_id = parent.id
        INNER JOIN lineage child ON edge.child_node_id = child.id
    )
    SELECT * FROM lineage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Volatility Hotspot Stored Procedure
CREATE OR REPLACE FUNCTION get_evolutionary_hotspots(target_repo_id UUID)
RETURNS TABLE (
    name TEXT,
    filepath TEXT,
    mutationcount BIGINT,
    score DOUBLE PRECISION
) AS $$
DECLARE
    total_commits BIGINT;
BEGIN
    SELECT COUNT(*) INTO total_commits FROM indexed_commits WHERE repo_id = target_repo_id;
    
    RETURN QUERY
    SELECT 
        g.name,
        g.file_path AS filepath,
        COUNT(*) FILTER (WHERE g.change_type = 'mutation') AS mutationcount,
        CASE 
            WHEN total_commits > 0 THEN 
                LEAST(10.0, (COUNT(*) FILTER (WHERE g.change_type = 'mutation')::DOUBLE PRECISION / total_commits) * 10.0)
            ELSE 0.0
        END AS score
    FROM genetic_nodes g
    WHERE g.repo_id = target_repo_id 
      AND g.change_type != 'deletion'
    GROUP BY g.repo_id, g.name, g.file_path
    ORDER BY score DESC, mutationcount DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
