-- Migration 02: Update Repository Select Policies
-- Removes public select access and limits it to the repo owner

-- Remove the old public policy
DROP POLICY IF EXISTS "Repositories are viewable by everyone" ON repositories;

-- Create the new private policy
CREATE POLICY "Users can view their own repositories" 
ON repositories FOR SELECT 
USING (auth.uid() = user_id);
