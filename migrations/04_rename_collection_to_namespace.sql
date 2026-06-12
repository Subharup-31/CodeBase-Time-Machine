-- Migration 04: Rename Collection to Namespace
-- Aligns repositories table with Pinecone Namespace terminology

DO $$
BEGIN
    -- 1. Rename column collection to namespace in repositories table if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'repositories' 
          AND column_name = 'collection'
    ) THEN
        ALTER TABLE repositories RENAME COLUMN collection TO namespace;
    END IF;
END $$;

-- 2. Drop old collection unique constraint if exists
ALTER TABLE repositories DROP CONSTRAINT IF EXISTS repositories_collection_key;

-- 3. Add unique constraint on namespace column
ALTER TABLE repositories DROP CONSTRAINT IF EXISTS repositories_namespace_key;
ALTER TABLE repositories ADD CONSTRAINT repositories_namespace_key UNIQUE (namespace);
