-- Add documents column to innovations table
-- Stores uploaded source files as an array of { name, path, type, size, uploaded_at }
ALTER TABLE innovations ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';
