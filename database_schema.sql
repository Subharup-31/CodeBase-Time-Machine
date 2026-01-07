-- Codebase Time Machine: Supabase Database Migration
-- Run this in your Supabase SQL Editor

-- Create a table for repositories
CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- NOTE: name is unique PER USER, not globally.
    -- Two different users can both index a repo called "react".
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    collection TEXT NOT NULL UNIQUE,
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

