-- Migration: 013_outbound_queue.sql
-- Purpose: Create queue table for outbound call campaigns

CREATE TABLE IF NOT EXISTS campaign_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL, -- Link to voice_call_campaigns (if exists) or generic campaign ID
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Lead Info
    lead_phone_number VARCHAR(50) NOT NULL,
    lead_name VARCHAR(255),
    lead_id UUID, -- Optional link to saved_leads
    
    -- Status Tracking
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, no_answer
    attempt_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_after TIMESTAMPTZ DEFAULT NOW(),
    
    -- Results
    call_sid VARCHAR(255),
    call_outcome VARCHAR(100), -- 'connected', 'voicemail', 'busy', 'failed'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_queue_status ON campaign_queue(status);
CREATE INDEX IF NOT EXISTS idx_campaign_queue_next_attempt ON campaign_queue(next_attempt_after);
CREATE INDEX IF NOT EXISTS idx_campaign_queue_campaign_id ON campaign_queue(campaign_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_campaign_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_campaign_queue_updated_at
    BEFORE UPDATE ON campaign_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_queue_updated_at();
