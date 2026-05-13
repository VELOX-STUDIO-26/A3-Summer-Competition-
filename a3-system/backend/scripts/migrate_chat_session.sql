-- Migration: Add title and session_type to chat_sessions
-- Run this against your PostgreSQL database if the table already exists

ALTER TABLE chat_sessions
    ADD COLUMN IF NOT EXISTS title VARCHAR(200) DEFAULT 'New Chat',
    ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) DEFAULT 'tutor';

-- Update existing rows
UPDATE chat_sessions SET title = 'New Chat' WHERE title IS NULL;
UPDATE chat_sessions SET session_type = 'tutor' WHERE session_type IS NULL;

-- Change status enum to include 'archived'
-- (PostgreSQL doesn't check enum values, just update the constraint if you have one)
UPDATE chat_sessions SET status = 'archived' WHERE status = 'closed';
