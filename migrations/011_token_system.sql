-- Token Pricing Table
CREATE TABLE IF NOT EXISTS token_pricing (
    action_type VARCHAR(50) PRIMARY KEY,
    token_cost INTEGER NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token Usage Logs Table
CREATE TABLE IF NOT EXISTS token_usage_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    action_type VARCHAR(50) REFERENCES token_pricing(action_type),
    tokens_deducted INTEGER NOT NULL,
    resource_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Pricing Data
INSERT INTO token_pricing (action_type, token_cost, description) VALUES
    ('ai_voice_call_per_minute', 7, 'Cost per minute for AI voice calls'),
    ('ai_chat_1k_tokens', 5, 'Cost per 1000 tokens for AI chat'),
    ('sms_send', 10, 'Cost to send one SMS'),
    ('email_send', 1, 'Cost to send one email'),
    ('skip_trace', 50, 'Cost to skip trace a lead'),
    ('reveal_phone', 50, 'Cost to reveal phone number in Lead Finder')
ON CONFLICT (action_type) DO UPDATE SET
    token_cost = EXCLUDED.token_cost,
    description = EXCLUDED.description,
    updated_at = NOW();
