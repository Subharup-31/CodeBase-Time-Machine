-- Migration 05: Create Genetic Graph Tables
-- Establishes adjacency list schemas for code symbols, caller tracking, and commit indexing

-- 1. Create genetic_nodes table (stores code symbol versions)
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
    calls TEXT[], -- Array of called symbol names
    structural_hash TEXT, -- Merkle-like AST structural hash
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 2. Create genetic_edges table (tracks parent-child lineage connections)
CREATE TABLE IF NOT EXISTS genetic_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    parent_node_id UUID NOT NULL REFERENCES genetic_nodes(id) ON DELETE CASCADE,
    child_node_id UUID NOT NULL REFERENCES genetic_nodes(id) ON DELETE CASCADE,
    UNIQUE (parent_node_id, child_node_id)
);

-- 3. Create indexed_commits table (incremental indexing tracking)
CREATE TABLE IF NOT EXISTS indexed_commits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_sha TEXT NOT NULL,
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    UNIQUE (repo_id, commit_sha)
);

-- 4. Enable Row Level Security (RLS) policies
ALTER TABLE genetic_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own nodes" ON genetic_nodes FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE genetic_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view edges for their repos" ON genetic_edges FOR SELECT 
    USING (EXISTS (SELECT 1 FROM repositories r WHERE r.id = repo_id AND r.user_id = auth.uid()));

ALTER TABLE indexed_commits ENABLE ROW LEVEL SECURITY;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS genetic_nodes_repo_id_idx ON genetic_nodes (repo_id);
CREATE INDEX IF NOT EXISTS genetic_nodes_name_idx ON genetic_nodes (name);
CREATE INDEX IF NOT EXISTS genetic_nodes_commit_sha_idx ON genetic_nodes (commit_sha);
CREATE INDEX IF NOT EXISTS genetic_nodes_user_repo_idx ON genetic_nodes (user_id, repo_id);
CREATE INDEX IF NOT EXISTS genetic_edges_repo_id_idx ON genetic_edges (repo_id);
CREATE INDEX IF NOT EXISTS genetic_edges_child_node_idx ON genetic_edges (child_node_id);
CREATE INDEX IF NOT EXISTS indexed_commits_repo_id_idx ON indexed_commits (repo_id);
