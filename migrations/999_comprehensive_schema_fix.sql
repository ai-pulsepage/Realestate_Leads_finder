-- Comprehensive Schema Fix
-- Run this to add all missing tables and columns required by the application

-- ============================================
-- 1. Users Table - Add all missing columns
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accessible_tiers TEXT[] DEFAULT ARRAY['investor'];
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_tier VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS twilio_phone_number VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_ai_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS from_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_balance INTEGER DEFAULT 1000;

-- Update admin users to have all tier access
UPDATE users SET accessible_tiers = ARRAY['admin', 'investor', 'provider'] WHERE role = 'admin';
UPDATE users SET active_tier = COALESCE(subscription_tier, 'investor') WHERE active_tier IS NULL;

-- ============================================
-- 2. AI Voice Call Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_voice_call_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    call_sid VARCHAR(50),
    call_type VARCHAR(20),
    direction VARCHAR(20),
    caller_number VARCHAR(20),
    twilio_number VARCHAR(20),
    call_status VARCHAR(20),
    language VARCHAR(5) DEFAULT 'en',
    conversation_transcript TEXT,
    duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_voice_call_logs_user ON ai_voice_call_logs(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_voice_call_logs_call_sid ON ai_voice_call_logs(call_sid) WHERE call_sid IS NOT NULL;

-- ============================================
-- 3. Voice Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS voice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    inbound_config JSONB DEFAULT '{}',
    outbound_config JSONB DEFAULT '{}',
    greeting_en TEXT DEFAULT 'Hello! How can I help you today?',
    greeting_es TEXT DEFAULT '¡Hola! ¿Cómo puedo ayudarle hoy?',
    system_prompt TEXT,
    receptionist_config JSONB DEFAULT '{}',
    calendar_connected BOOLEAN DEFAULT false,
    calendar_token_encrypted TEXT,
    calendar_provider VARCHAR(20),
    voice_id VARCHAR(50) DEFAULT 'Polly.Joanna',
    google_refresh_token VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_settings_user_id ON voice_settings(user_id);

-- ============================================
-- 4. Call Logs Table (newer version)
-- ============================================
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    twilio_call_sid VARCHAR(100) UNIQUE NOT NULL,
    direction VARCHAR(20) NOT NULL DEFAULT 'inbound',
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    duration INTEGER DEFAULT 0,
    status VARCHAR(30) DEFAULT 'in-progress',
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

-- ============================================
-- 5. Campaign Queue Table
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_queue (
    queue_id SERIAL PRIMARY KEY,
    campaign_id INTEGER,
    contact_id INTEGER,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    phone_number VARCHAR(20),
    lead_phone_number VARCHAR(20),
    lead_name VARCHAR(255),
    lead_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_after TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    call_sid VARCHAR(100),
    call_outcome VARCHAR(50),
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_queue_status ON campaign_queue(status);
CREATE INDEX IF NOT EXISTS idx_campaign_queue_scheduled ON campaign_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaign_queue_next_attempt ON campaign_queue(next_attempt_after);

-- ============================================
-- 6. Email Templates Table
-- ============================================
CREATE TABLE IF NOT EXISTS email_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    subject_line VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    plain_text_body TEXT,
    available_variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. Email Campaigns Table
-- ============================================
CREATE TABLE IF NOT EXISTS email_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES email_templates(template_id) ON DELETE SET NULL,
    subject_line VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    plain_text_body TEXT,
    from_email VARCHAR(255),
    campaign_type VARCHAR(50) NOT NULL,
    scheduled_send_time TIMESTAMPTZ,
    recipient_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft',
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);

-- ============================================
-- 8. Campaign Recipients Table
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
    recipient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(campaign_id) ON DELETE CASCADE,
    saved_lead_id UUID,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    template_variables JSONB,
    send_status VARCHAR(50) DEFAULT 'pending',
    sendgrid_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(send_status);

-- ============================================
-- 9. Saved Leads Table (if missing)
-- ============================================
CREATE TABLE IF NOT EXISTS saved_leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    property_id VARCHAR(100),
    owner_name VARCHAR(255),
    owner_email VARCHAR(255),
    owner_phone VARCHAR(50),
    mailing_address TEXT,
    property_address TEXT,
    notes TEXT,
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_leads_user_id ON saved_leads(user_id);

-- ============================================
-- 10. Appointments Table
-- ============================================
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    lead_id UUID REFERENCES saved_leads(lead_id) ON DELETE SET NULL,
    title VARCHAR(255),
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);

-- ============================================
-- 11. Voice Call Campaigns Table
-- ============================================
CREATE TABLE IF NOT EXISTS voice_call_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    campaign_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    total_leads INTEGER DEFAULT 0,
    completed_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_campaigns_user ON voice_call_campaigns(user_id);

-- ============================================
-- 12. Subscriber Scripts Table
-- ============================================
CREATE TABLE IF NOT EXISTS subscriber_scripts (
    script_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    script_name VARCHAR(255) NOT NULL,
    script_content TEXT,
    script_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Done - Verify
-- ============================================
SELECT 'Schema fix complete!' AS status;
