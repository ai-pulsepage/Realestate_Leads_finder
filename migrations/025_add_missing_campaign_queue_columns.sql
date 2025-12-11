-- Migration: Add missing columns to campaign_queue
-- This migration ensures the campaign_queue table has the columns expected by the QueueService.

ALTER TABLE campaign_queue ADD COLUMN IF NOT EXISTS queue_id UUID DEFAULT gen_random_uuid();
ALTER TABLE campaign_queue ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0;
ALTER TABLE campaign_queue ADD COLUMN IF NOT EXISTS lead_phone_number VARCHAR(20);
ALTER TABLE campaign_queue ADD COLUMN IF NOT EXISTS lead_id UUID;
