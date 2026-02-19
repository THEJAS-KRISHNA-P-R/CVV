-- Add is_deleted column to chats table for soft delete
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
