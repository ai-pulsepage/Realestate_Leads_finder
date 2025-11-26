-- Migration: Fix ai_voice_call_logs schema to match application code
-- This migration adds all the columns used by the voice AI system

-- Add missing columns to ai_voice_call_logs table
ALTER TABLE ai_voice_call_logs
ADD COLUMN IF NOT EXISTS call_sid VARCHAR(50),
ADD COLUMN IF NOT EXISTS call_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS direction VARCHAR(20),
ADD COLUMN IF NOT EXISTS caller_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS twilio_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS call_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en',
ADD COLUMN IF NOT EXISTS conversation_transcript TEXT;

-- Create unique index on call_sid to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_voice_call_logs_call_sid
ON ai_voice_call_logs(call_sid)
WHERE call_sid IS NOT NULL;

-- Update existing records to have default values where needed
UPDATE ai_voice_call_logs
SET call_type = 'inbound',
    direction = 'incoming',
    call_status = 'completed',
    language = 'en'
WHERE call_type IS NULL;

-- Verify all columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'ai_voice_call_logs'
ORDER BY ordinal_position;