-- Codebase Time Machine: Supabase Database Migration
-- Run this in your Supabase SQL Editor

-- Create a table for repositories
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- NOTE: name is unique PER USER, not globally.
    -- Two different users can both index a repo called "react".
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    namespace TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    indexed_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    progress_message TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Compound unique: a user cannot add the same repo name twice
    CONSTRAINT repositories_name_user_unique UNIQUE (name, user_id),
    -- Phylogenetic graph stored as JSONB (serverless-safe, replaces filesystem cache)
    graph_data JSONB,
    -- Tracks any error message during indexing for diagnostics
    error_message TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to ONLY see their own repositories
CREATE POLICY "Users can view their own repositories" 
ON repositories FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow authenticated users to insert
CREATE POLICY "Authenticated users can create repositories" 
ON repositories FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to delete their own repositories
CREATE POLICY "Users can delete their own repositories" 
ON repositories FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create policy to allow users to update their own repositories
CREATE POLICY "Users can update their own repositories" 
ON repositories FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS repositories_user_id_idx ON repositories (user_id);

-- ============================================================
-- If you already ran the OLD migration (with the global UNIQUE
-- constraint on name), run this incremental migration instead:
-- ============================================================
-- ALTER TABLE repositories DROP CONSTRAINT IF EXISTS repositories_name_key;
-- ALTER TABLE repositories ADD CONSTRAINT repositories_name_user_unique UNIQUE (name, user_id);
-- CREATE INDEX IF NOT EXISTS repositories_user_id_idx ON repositories (user_id);

-- ============================================================
-- Add graph storage and error tracking columns
-- (Run this if you already created the repositories table)
-- ============================================================
-- ALTER TABLE repositories ADD COLUMN IF NOT EXISTS graph_data JSONB;
-- ALTER TABLE repositories ADD COLUMN IF NOT EXISTS error_message TEXT;


-- ============================================================
-- Phase 2 Migration: Scalable graph storage via adjacency tables
-- Run this after the base repositories table migration
-- ============================================================

-- Stores individual code symbol nodes (one row per unique version of a function/class)
CREATE TABLE IF NOT EXISTS genetic_nodes (
    id UUID PRIMARY KEY,
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('function', 'class')),
    file_path TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('origin', 'mutation', 'speciation', 'deletion')),
    body TEXT,
    calls TEXT[], -- array of called symbol names
    structural_hash TEXT, -- Merkle-like AST structural hash
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- Stores directed edges between nodes (parent -> child lineage)
CREATE TABLE IF NOT EXISTS genetic_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    parent_node_id UUID NOT NULL REFERENCES genetic_nodes(id) ON DELETE CASCADE,
    child_node_id UUID NOT NULL REFERENCES genetic_nodes(id) ON DELETE CASCADE,
    UNIQUE (parent_node_id, child_node_id)
);

-- Tracks which commits have been fully indexed (for incremental indexing)
CREATE TABLE IF NOT EXISTS indexed_commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha TEXT NOT NULL,
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (repo_id, commit_sha)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS genetic_nodes_repo_id_idx ON genetic_nodes (repo_id);
CREATE INDEX IF NOT EXISTS genetic_nodes_name_idx ON genetic_nodes (name);
CREATE INDEX IF NOT EXISTS genetic_nodes_commit_sha_idx ON genetic_nodes (commit_sha);
CREATE INDEX IF NOT EXISTS genetic_nodes_user_repo_idx ON genetic_nodes (user_id, repo_id);
CREATE INDEX IF NOT EXISTS genetic_edges_repo_id_idx ON genetic_edges (repo_id);
CREATE INDEX IF NOT EXISTS genetic_edges_child_node_idx ON genetic_edges (child_node_id);
CREATE INDEX IF NOT EXISTS indexed_commits_repo_id_idx ON indexed_commits (repo_id);

-- RLS Policies for genetic_nodes
ALTER TABLE genetic_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own nodes"
    ON genetic_nodes FOR SELECT
    USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage nodes"
    ON genetic_nodes FOR ALL
    USING (true);

-- RLS Policies for genetic_edges
ALTER TABLE genetic_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view edges for their repos"
    ON genetic_edges FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM repositories r
            WHERE r.id = genetic_edges.repo_id
            AND r.user_id = auth.uid()
        )
    );
CREATE POLICY "Service role can manage edges"
    ON genetic_edges FOR ALL
    USING (true);

-- RLS Policies for indexed_commits
ALTER TABLE indexed_commits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage indexed commits"
    ON indexed_commits FOR ALL
    USING (true);


-- ============================================================
-- Recursive and Traversal Helper Stored Procedures
-- ============================================================

-- Recursive Lineage Traversal (Common Table Expression)
CREATE OR REPLACE FUNCTION get_symbol_ancestors(start_node_id UUID)
RETURNS SETOF genetic_nodes AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE lineage AS (
        -- Anchor member: get the starting node
        SELECT n.id, n.repo_id, n.user_id, n.name, n.type, n.file_path, n.commit_sha, n.change_type, n.body, n.calls, n.structural_hash, n.created_at
        FROM genetic_nodes n
        WHERE n.id = start_node_id

        UNION

        -- Recursive member: get parents of current nodes in the CTE
        SELECT parent.id, parent.repo_id, parent.user_id, parent.name, parent.type, parent.file_path, parent.commit_sha, parent.change_type, parent.body, parent.calls, parent.structural_hash, parent.created_at
        FROM genetic_nodes parent
        INNER JOIN genetic_edges edge ON edge.parent_node_id = parent.id
        INNER JOIN lineage child ON edge.child_node_id = child.id
    )
    SELECT * FROM lineage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Evolutionary Volatility Hotspots (Aggregation)
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
    -- Get total indexed commits for this repository
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



