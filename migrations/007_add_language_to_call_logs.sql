-- Migration: Add language column to ai_voice_call_logs
-- This migration adds support for tracking call language

ALTER TABLE ai_voice_call_logs
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ai_voice_call_logs'
  AND column_name = 'language';