-- Migration 04: Rename Collection to Namespace
-- Aligns repositories table with Pinecone Namespace terminology

-- 1. Rename column collection to namespace in repositories table
ALTER TABLE repositories RENAME COLUMN collection TO namespace;

-- 2. Drop old collection unique constraint if exists
ALTER TABLE repositories DROP CONSTRAINT IF EXISTS repositories_collection_key;

-- 3. Add unique constraint on namespace column
ALTER TABLE repositories ADD CONSTRAINT repositories_namespace_key UNIQUE (namespace);
