-- Migration: Email Campaign System
-- Creates tables for Templates, Campaigns, and Recipients

-- 1. Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE, -- NULL = system template
    
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- 'system', 'custom'
    category VARCHAR(100), -- 'welcome', 'follow_up', 'promotion'
    
    subject_line VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    plain_text_body TEXT,
    
    available_variables JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Email Campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    campaign_name VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES email_templates(template_id) ON DELETE SET NULL,
    
    subject_line VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    plain_text_body TEXT,
    from_email VARCHAR(255),
    
    campaign_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled'
    scheduled_send_time TIMESTAMPTZ,
    
    recipient_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'queued', 'sending', 'sent', 'failed'
    
    -- Analytics
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- 3. Campaign Recipients
CREATE TABLE IF NOT EXISTS campaign_recipients (
    recipient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(campaign_id) ON DELETE CASCADE,
    saved_lead_id UUID REFERENCES saved_leads(lead_id) ON DELETE SET NULL,
    
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    
    template_variables JSONB,
    
    send_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    sendgrid_message_id VARCHAR(255),
    error_message TEXT,
    
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(send_status);
