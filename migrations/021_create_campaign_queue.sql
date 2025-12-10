-- Migration: Create campaign_queue table for call worker
-- This table is used by the background worker to process outbound call campaigns

CREATE TABLE IF NOT EXISTS campaign_queue (
    queue_id SERIAL PRIMARY KEY,
    campaign_id INTEGER,
    contact_id INTEGER,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    phone_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_queue_status ON campaign_queue(status);
CREATE INDEX IF NOT EXISTS idx_campaign_queue_scheduled ON campaign_queue(scheduled_at);
