-- Migration 01: Create Repositories Table
-- Run this first to establish the repositories relation

CREATE TABLE repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    collection TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    indexed_at TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS)
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow everyone to see all repositories
CREATE POLICY "Repositories are viewable by everyone" 
ON repositories FOR SELECT 
USING (true);

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
