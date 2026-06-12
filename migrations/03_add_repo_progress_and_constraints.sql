-- Migration 03: Add Progress Tracking & Per-User Constraints
-- Allows multiple users to index repos of the same name and registers state tracking columns

-- 1. Drop the old global unique constraint on repo name so multiple users can register repos
ALTER TABLE repositories DROP CONSTRAINT IF EXISTS repositories_name_key;

-- 2. Add compound unique constraint (repo name must be unique per user)
ALTER TABLE repositories ADD CONSTRAINT repositories_name_user_unique UNIQUE (name, user_id);

-- 3. Add tracking and progress columns
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS progress_message TEXT;

-- 4. Add phylogenetic graph storage and error tracking columns
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS graph_data JSONB;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 5. Add index for fast per-user lookups
CREATE INDEX IF NOT EXISTS repositories_user_id_idx ON repositories (user_id);
