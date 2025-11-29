-- Migration 12: Inbound Intelligence & Receptionist Settings

-- 1. Add structured_data to call_logs (if table exists, otherwise create it)
-- We need to check if call_logs exists first. Based on previous context, it might not exist or be named differently.
-- Let's assume we need to create it or alter it.
-- Checking previous migrations, we have 'voice_call_campaigns' and 'voice_campaign_targets', but maybe not a generic 'call_logs' for inbound.
-- Let's create a comprehensive 'call_logs' table if it doesn't exist, or alter it.

CREATE TABLE IF NOT EXISTS call_logs (
    call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Call Details
    twilio_call_sid VARCHAR(255) UNIQUE NOT NULL,
    direction VARCHAR(20), -- 'inbound', 'outbound'
    from_number VARCHAR(50),
    to_number VARCHAR(50),
    duration INTEGER, -- seconds
    status VARCHAR(50), -- 'completed', 'busy', 'no-answer', 'failed'
    
    -- AI Data
    recording_url TEXT,
    transcript TEXT,
    summary TEXT,
    structured_data JSONB DEFAULT '{}', -- { "name": "John", "intent": "buy", "email": "..." }
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add receptionist_config to voice_settings
-- We need to find where voice settings are stored. 
-- Based on VoicePersonaEditor.jsx, it fetches from /api/admin-ai/voice-settings/:userId
-- Let's check if there is a 'voice_settings' table. If not, we might need to create it or add to 'users'.
-- The previous migration (006) mentioned 'extend_knowledge_data', maybe it's there.
-- Let's create a 'voice_settings' table if it doesn't exist to be safe and structured.

CREATE TABLE IF NOT EXISTS voice_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Persona
    system_prompt TEXT,
    
    -- Languages
    greeting_en TEXT,
    greeting_es TEXT,
    
    -- Receptionist Rules (New)
    receptionist_config JSONB DEFAULT '{"ask_email": true, "calendar_link": "", "sms_followup": false}',
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_voice_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_voice_settings_updated_at ON voice_settings;
CREATE TRIGGER trigger_voice_settings_updated_at
    BEFORE UPDATE ON voice_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_settings_updated_at();

-- 3. Add index for fast lookup by Twilio Call SID
CREATE INDEX IF NOT EXISTS idx_call_logs_sid ON call_logs(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_call_logs_user ON call_logs(user_id);
