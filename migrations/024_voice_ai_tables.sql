-- Migration 024: Voice AI Required Tables
-- Creates call_logs and voice_settings tables for Voice AI functionality

-- 1. Call Logs Table - Records all inbound and outbound calls
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    twilio_call_sid VARCHAR(100) UNIQUE NOT NULL,
    direction VARCHAR(20) NOT NULL DEFAULT 'inbound', -- 'inbound' or 'outbound'
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    duration INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'in-progress', -- 'ringing', 'in-progress', 'completed', 'no-answer', 'busy', 'failed'
    recording_url TEXT,
    transcript TEXT,
    summary TEXT,
    structured_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_user_id ON call_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_call_sid ON call_logs(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON call_logs(created_at DESC);

-- 2. Voice Settings Table - User-specific AI agent configuration
CREATE TABLE IF NOT EXISTS voice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    greeting_en TEXT DEFAULT 'Hello! How can I help you today?',
    greeting_es TEXT DEFAULT '¡Hola! ¿Cómo puedo ayudarle hoy?',
    system_prompt TEXT,
    receptionist_config JSONB DEFAULT '{}',
    outbound_config JSONB DEFAULT '{}',
    calendar_token_encrypted TEXT,
    calendar_provider VARCHAR(20), -- 'google', 'outlook', etc.
    voice_id VARCHAR(50) DEFAULT 'Polly.Joanna',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_settings_user_id ON voice_settings(user_id);

-- 3. Add token_balance column to users if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 1000;
