# ZENCODER IMPLEMENTATION GUIDE - PART 1
## Database Migrations & Voice AI Foundation

**Project:** Miami-Dade Real Estate Leads SaaS Platform  
**Developer:** Zencoder  
**Document Version:** 1.0  
**Date:** November 24, 2025

---

## 📋 PART 1 OVERVIEW

This document covers:
1. **Database Migrations** - New tables for Voice AI and Email Campaigns
2. **Voice AI Foundation** - Twilio webhook handlers and basic call flow
3. **Gemini Integration** - AI-powered conversation handling
4. **Testing Foundation** - Initial verification steps

**Estimated Time:** 3-4 hours  
**Prerequisites:** 
- Existing Cloud Run deployment running
- PostgreSQL database accessible
- Twilio account credentials ready
- Gemini API key obtained

---

## 🗄️ SECTION 1: DATABASE MIGRATIONS

### Step 1.1: Connect to Database

```bash
# From your local machine with psql installed
psql "postgresql://postgres:Admin%401234@172.27.64.3:5432/real_estate_leads?sslmode=no-verify"

# Or use Cloud SQL Proxy if needed
```

### Step 1.2: Execute Migrations

Copy and paste the following SQL **in order**. Each section is clearly marked.

#### Migration 1: Appointments Table

```sql
-- ============================================================
-- APPOINTMENTS TABLE
-- Stores scheduled appointments from voice calls
-- ============================================================

CREATE TABLE IF NOT EXISTS appointments (
    appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Contact information
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    
    -- Appointment details
    appointment_datetime TIMESTAMPTZ NOT NULL,
    appointment_type VARCHAR(100), -- 'property_viewing', 'consultation', 'phone_call', etc.
    appointment_status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
    
    -- Additional context
    notes TEXT,
    property_address TEXT, -- If appointment is for specific property
    lead_source VARCHAR(100) DEFAULT 'voice_ai', -- 'voice_ai', 'manual', 'email_campaign'
    
    -- Related entities
    call_sid VARCHAR(255), -- Twilio call SID that created this
    saved_lead_id UUID REFERENCES saved_leads(saved_lead_id) ON DELETE SET NULL,
    
    -- Urgency tracking
    urgency_level VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'normal', 'low'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_datetime ON appointments(appointment_datetime);
CREATE INDEX idx_appointments_status ON appointments(appointment_status);
CREATE INDEX idx_appointments_call_sid ON appointments(call_sid);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_appointments_updated_at();

-- Verification
SELECT 'Appointments table created successfully' AS status;
```

#### Migration 2: Email Templates Table

```sql
-- ============================================================
-- EMAIL TEMPLATES TABLE
-- Pre-built and custom email templates
-- ============================================================

CREATE TABLE IF NOT EXISTS email_templates (
    template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE, -- NULL = system template
    
    template_name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL, -- 'system', 'custom'
    category VARCHAR(100), -- 'welcome', 'follow_up', 'promotion', 'appointment_reminder'
    
    -- Template content
    subject_line VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    plain_text_body TEXT,
    
    -- Template variables available
    available_variables JSONB DEFAULT '[]', -- ['{{first_name}}', '{{property_address}}', etc.]
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX idx_email_templates_type ON email_templates(template_type);
CREATE INDEX idx_email_templates_category ON email_templates(category);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_templates_updated_at();

-- Verification
SELECT 'Email templates table created successfully' AS status;
```

#### Migration 3: Email Campaigns Table

```sql
-- ============================================================
-- EMAIL CAMPAIGNS TABLE
-- Campaign configuration and tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS email_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Campaign details
    campaign_name VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES email_templates(template_id) ON DELETE SET NULL,
    
    -- Email content (can override template)
    subject_line VARCHAR(500) NOT NULL,
    html_body TEXT NOT NULL,
    plain_text_body TEXT,
    from_email VARCHAR(255), -- Override user's default from_email
    
    -- Campaign settings
    campaign_type VARCHAR(50) NOT NULL, -- 'manual', 'scheduled', 'automated'
    trigger_type VARCHAR(100), -- For automated: 'new_lead', 'lead_updated', 'appointment_confirmed'
    scheduled_send_time TIMESTAMPTZ,
    
    -- Targeting
    target_audience JSONB, -- Filter criteria for leads
    recipient_count INTEGER DEFAULT 0,
    
    -- Campaign status
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'
    
    -- Analytics
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    emails_bounced INTEGER DEFAULT 0,
    emails_unsubscribed INTEGER DEFAULT 0,
    
    -- Token tracking
    tokens_used INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_email_campaigns_user_id ON email_campaigns(user_id);
CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_scheduled_time ON email_campaigns(scheduled_send_time);
CREATE INDEX idx_email_campaigns_type ON email_campaigns(campaign_type);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_email_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_campaigns_updated_at
    BEFORE UPDATE ON email_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_email_campaigns_updated_at();

-- Verification
SELECT 'Email campaigns table created successfully' AS status;
```

#### Migration 4: Campaign Recipients Table

```sql
-- ============================================================
-- CAMPAIGN RECIPIENTS TABLE
-- Individual recipient tracking for campaigns
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_recipients (
    recipient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(campaign_id) ON DELETE CASCADE,
    saved_lead_id UUID REFERENCES saved_leads(saved_lead_id) ON DELETE CASCADE,
    
    -- Recipient details (denormalized for reliability)
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    
    -- Personalization data
    template_variables JSONB, -- Actual values used: {'first_name': 'John', 'property': '123 Main St'}
    
    -- Delivery status
    send_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'bounced', 'failed'
    
    -- Tracking
    sendgrid_message_id VARCHAR(255),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_lead_id ON campaign_recipients(saved_lead_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(send_status);
CREATE INDEX idx_campaign_recipients_email ON campaign_recipients(recipient_email);
CREATE INDEX idx_campaign_recipients_sendgrid_id ON campaign_recipients(sendgrid_message_id);

-- Verification
SELECT 'Campaign recipients table created successfully' AS status;
```

#### Migration 5: Voice Call Campaigns Table

```sql
-- ============================================================
-- VOICE CALL CAMPAIGNS TABLE
-- Outbound calling campaign configuration (future feature)
-- ============================================================

CREATE TABLE IF NOT EXISTS voice_call_campaigns (
    campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Campaign details
    campaign_name VARCHAR(255) NOT NULL,
    script_id UUID REFERENCES subscriber_scripts(script_id) ON DELETE SET NULL,
    
    -- Campaign settings
    campaign_type VARCHAR(50) DEFAULT 'outbound', -- 'outbound', 'follow_up'
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'
    
    -- Scheduling
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    call_window_start TIME, -- Daily calling hours: 09:00:00
    call_window_end TIME, -- Daily calling hours: 18:00:00
    timezone VARCHAR(100) DEFAULT 'America/New_York',
    
    -- Call settings
    max_attempts_per_lead INTEGER DEFAULT 3,
    retry_interval_hours INTEGER DEFAULT 24,
    
    -- Analytics
    total_targets INTEGER DEFAULT 0,
    calls_completed INTEGER DEFAULT 0,
    calls_connected INTEGER DEFAULT 0,
    appointments_scheduled INTEGER DEFAULT 0,
    
    -- Token tracking
    tokens_allocated INTEGER,
    tokens_used INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_campaigns_user_id ON voice_call_campaigns(user_id);
CREATE INDEX idx_voice_campaigns_status ON voice_call_campaigns(status);
CREATE INDEX idx_voice_campaigns_start_time ON voice_call_campaigns(start_time);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_voice_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_voice_campaigns_updated_at
    BEFORE UPDATE ON voice_call_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_campaigns_updated_at();

-- Verification
SELECT 'Voice call campaigns table created successfully' AS status;
```

#### Migration 6: Voice Campaign Targets Table

```sql
-- ============================================================
-- VOICE CAMPAIGN TARGETS TABLE
-- Individual leads targeted in voice campaigns
-- ============================================================

CREATE TABLE IF NOT EXISTS voice_campaign_targets (
    target_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES voice_call_campaigns(campaign_id) ON DELETE CASCADE,
    saved_lead_id UUID NOT NULL REFERENCES saved_leads(saved_lead_id) ON DELETE CASCADE,
    
    -- Call attempts tracking
    attempts_made INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    
    -- Call outcomes
    call_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'calling', 'completed', 'no_answer', 'voicemail', 'disconnected', 'do_not_call'
    conversation_outcome VARCHAR(100), -- 'interested', 'not_interested', 'appointment_scheduled', 'callback_requested'
    
    -- Related records
    last_call_sid VARCHAR(255),
    appointment_id UUID REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    
    -- Notes from calls
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_targets_campaign_id ON voice_campaign_targets(campaign_id);
CREATE INDEX idx_voice_targets_lead_id ON voice_campaign_targets(saved_lead_id);
CREATE INDEX idx_voice_targets_status ON voice_campaign_targets(call_status);
CREATE INDEX idx_voice_targets_next_attempt ON voice_campaign_targets(next_attempt_at);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_voice_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_voice_targets_updated_at
    BEFORE UPDATE ON voice_campaign_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_targets_updated_at();

-- Verification
SELECT 'Voice campaign targets table created successfully' AS status;
```

#### Migration 7: Alter Existing Tables

```sql
-- ============================================================
-- ALTER EXISTING TABLES
-- Add new columns for Voice AI and Email features
-- ============================================================

-- Add Twilio phone number to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS twilio_phone_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS voice_ai_enabled BOOLEAN DEFAULT false;

-- Add email sender info to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS from_email VARCHAR(255);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_twilio_phone ON users(twilio_phone_number);
CREATE INDEX IF NOT EXISTS idx_users_voice_enabled ON users(voice_ai_enabled);

-- Verification
SELECT 'User table alterations completed successfully' AS status;
```

#### Migration 8: Seed System Email Templates

```sql
-- ============================================================
-- SEED DATA: System Email Templates
-- Pre-built templates for common use cases
-- ============================================================

-- Welcome Email Template
INSERT INTO email_templates (
    user_id,
    template_name,
    template_type,
    category,
    subject_line,
    html_body,
    plain_text_body,
    available_variables
) VALUES (
    NULL, -- System template
    'New Lead Welcome',
    'system',
    'welcome',
    'Thanks for Your Interest in {{property_address}}',
    '<html><body><h2>Hi {{first_name}},</h2><p>Thank you for your interest in the property at <strong>{{property_address}}</strong>.</p><p>I''d love to discuss this opportunity with you. Here are the property highlights:</p><ul><li>Price: {{property_price}}</li><li>Bedrooms: {{bedrooms}}</li><li>Bathrooms: {{bathrooms}}</li></ul><p>Would you like to schedule a viewing? You can reply to this email or call me at {{agent_phone}}.</p><p>Best regards,<br>{{agent_name}}<br>{{company_name}}</p></body></html>',
    'Hi {{first_name}},\n\nThank you for your interest in the property at {{property_address}}.\n\nI''d love to discuss this opportunity with you. Here are the property highlights:\n\n- Price: {{property_price}}\n- Bedrooms: {{bedrooms}}\n- Bathrooms: {{bathrooms}}\n\nWould you like to schedule a viewing? You can reply to this email or call me at {{agent_phone}}.\n\nBest regards,\n{{agent_name}}\n{{company_name}}',
    '["{{first_name}}", "{{property_address}}", "{{property_price}}", "{{bedrooms}}", "{{bathrooms}}", "{{agent_phone}}", "{{agent_name}}", "{{company_name}}"]'::jsonb
);

-- Follow-up Email Template
INSERT INTO email_templates (
    user_id,
    template_name,
    template_type,
    category,
    subject_line,
    html_body,
    plain_text_body,
    available_variables
) VALUES (
    NULL,
    'Follow-Up - Property Viewing',
    'system',
    'follow_up',
    'Following Up: {{property_address}}',
    '<html><body><h2>Hi {{first_name}},</h2><p>I wanted to follow up on the property at <strong>{{property_address}}</strong> that you showed interest in.</p><p>Are you still looking for investment opportunities? I have several similar properties that match your criteria:</p><ul><li>{{property_address}}</li><li>Estimated ROI: {{estimated_roi}}%</li><li>Repair Cost: {{repair_estimate}}</li></ul><p>Let me know if you''d like more details or want to schedule a viewing.</p><p>Best regards,<br>{{agent_name}}<br>{{agent_phone}}</p></body></html>',
    'Hi {{first_name}},\n\nI wanted to follow up on the property at {{property_address}} that you showed interest in.\n\nAre you still looking for investment opportunities? I have several similar properties that match your criteria:\n\n- {{property_address}}\n- Estimated ROI: {{estimated_roi}}%\n- Repair Cost: {{repair_estimate}}\n\nLet me know if you''d like more details or want to schedule a viewing.\n\nBest regards,\n{{agent_name}}\n{{agent_phone}}',
    '["{{first_name}}", "{{property_address}}", "{{estimated_roi}}", "{{repair_estimate}}", "{{agent_name}}", "{{agent_phone}}"]'::jsonb
);

-- Appointment Reminder Template
INSERT INTO email_templates (
    user_id,
    template_name,
    template_type,
    category,
    subject_line,
    html_body,
    plain_text_body,
    available_variables
) VALUES (
    NULL,
    'Appointment Reminder',
    'system',
    'appointment_reminder',
    'Reminder: Appointment on {{appointment_date}}',
    '<html><body><h2>Hi {{first_name}},</h2><p>This is a friendly reminder about your upcoming appointment:</p><div style="border:1px solid #ccc; padding:15px; margin:20px 0;"><strong>Date:</strong> {{appointment_date}}<br><strong>Time:</strong> {{appointment_time}}<br><strong>Location:</strong> {{property_address}}<br><strong>Type:</strong> {{appointment_type}}</div><p>Looking forward to meeting you!</p><p>If you need to reschedule, please call me at {{agent_phone}} or reply to this email.</p><p>Best regards,<br>{{agent_name}}</p></body></html>',
    'Hi {{first_name}},\n\nThis is a friendly reminder about your upcoming appointment:\n\nDate: {{appointment_date}}\nTime: {{appointment_time}}\nLocation: {{property_address}}\nType: {{appointment_type}}\n\nLooking forward to meeting you!\n\nIf you need to reschedule, please call me at {{agent_phone}} or reply to this email.\n\nBest regards,\n{{agent_name}}',
    '["{{first_name}}", "{{appointment_date}}", "{{appointment_time}}", "{{property_address}}", "{{appointment_type}}", "{{agent_name}}", "{{agent_phone}}"]'::jsonb
);

-- Verification
SELECT 
    template_name,
    template_type,
    category,
    ARRAY_LENGTH(ARRAY(SELECT jsonb_array_elements_text(available_variables)), 1) as variable_count
FROM email_templates 
WHERE user_id IS NULL
ORDER BY created_at;
```

### Step 1.3: Verify All Migrations

Run this verification query to confirm all tables exist:

```sql
-- ============================================================
-- FINAL VERIFICATION QUERY
-- Run this to confirm all migrations completed
-- ============================================================

SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
    'appointments',
    'email_templates', 
    'email_campaigns',
    'campaign_recipients',
    'voice_call_campaigns',
    'voice_campaign_targets'
)
ORDER BY table_name;

-- Check altered columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('twilio_phone_number', 'voice_ai_enabled', 'from_email')
ORDER BY column_name;

-- Check system templates
SELECT COUNT(*) as system_template_count
FROM email_templates
WHERE user_id IS NULL;

-- Expected output:
-- 6 new tables with multiple columns each
-- 3 new columns in users table
-- 3 system templates
```

**✅ CHECKPOINT:** You should see:
- 6 new tables created
- 3 new columns in users table
- 3 system email templates

---

## 📞 SECTION 2: VOICE AI FOUNDATION

### Step 2.1: Create Voice AI Routes File

Create a new file: `routes/voice-ai.js`

```javascript
/**
 * VOICE AI ROUTES
 * Handles Twilio webhook callbacks for inbound/outbound calls
 */

const express = require('express');
const router = express.Router();
const VoiceResponse = require('twilio').twiml.VoiceResponse;

// ============================================================
// ROUTE 1: Handle Incoming Calls
// Twilio webhook: POST /api/voice-ai/incoming
// ============================================================

router.post('/incoming', async (req, res) => {
  try {
    console.log('📞 Incoming call webhook received:', {
      CallSid: req.body.CallSid,
      From: req.body.From,
      To: req.body.To,
      CallStatus: req.body.CallStatus
    });

    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const callerNumber = req.body.From;
    const twilioNumber = req.body.To;

    // Find which subscriber owns this Twilio number
    const subscriberQuery = await req.db.query(
      'SELECT user_id, email FROM users WHERE twilio_phone_number = $1 AND voice_ai_enabled = true',
      [twilioNumber]
    );

    if (subscriberQuery.rows.length === 0) {
      // No subscriber found - return generic message
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'This number is not currently configured. Please contact support.');
      
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const subscriber = subscriberQuery.rows[0];
    const userId = subscriber.user_id;

    // Check token balance
    const balanceQuery = await req.db.query(
      'SELECT token_balance FROM subscriber_profiles WHERE user_id = $1',
      [userId]
    );

    if (balanceQuery.rows.length === 0 || balanceQuery.rows[0].token_balance < 500) {
      // Insufficient tokens
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Your account has insufficient tokens to handle this call. Please add more tokens and try again.');
      
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Log the incoming call
    await req.db.query(`
      INSERT INTO ai_voice_call_logs (
        user_id, call_sid, call_type, direction, 
        caller_number, twilio_number, call_status
      ) VALUES ($1, $2, 'inbound', 'incoming', $3, $4, 'ringing')
    `, [userId, callSid, callerNumber, twilioNumber]);

    // Load subscriber's knowledge base
    const knowledgeQuery = await req.db.query(
      'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1',
      [userId]
    );

    const knowledgeBase = knowledgeQuery.rows.length > 0 
      ? knowledgeQuery.rows[0].knowledge_data 
      : {};

    // Initial greeting using knowledge base
    const companyName = knowledgeBase.company_name || 'Real Estate Services';
    const greeting = `Hello, thank you for calling ${companyName}. I'm your AI assistant. How can I help you today?`;

    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, greeting);

    // Gather caller's response
    const gather = twiml.gather({
      input: 'speech',
      action: '/api/voice-ai/process-response',
      method: 'POST',
      timeout: 5,
      speechTimeout: 'auto',
      language: 'en-US'
    });

    gather.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Please tell me what you need help with.');

    // If no response, prompt again
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'I didn\'t hear anything. Please call back when you\'re ready.');

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error handling incoming call:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'An error occurred. Please try again later.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 2: Process Caller Response
// Twilio webhook: POST /api/voice-ai/process-response
// ============================================================

router.post('/process-response', async (req, res) => {
  try {
    console.log('🎤 Processing caller speech:', {
      CallSid: req.body.CallSid,
      SpeechResult: req.body.SpeechResult,
      Confidence: req.body.Confidence
    });

    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const speechResult = req.body.SpeechResult || '';
    const twilioNumber = req.body.To;

    // Get subscriber info
    const subscriberQuery = await req.db.query(
      'SELECT user_id FROM users WHERE twilio_phone_number = $1',
      [twilioNumber]
    );

    if (subscriberQuery.rows.length === 0) {
      twiml.say('Error finding account. Goodbye.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const userId = subscriberQuery.rows[0].user_id;

    // Update call log with speech transcript
    await req.db.query(`
      UPDATE ai_voice_call_logs 
      SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
      WHERE call_sid = $2
    `, [`Caller: ${speechResult}`, callSid]);

    // Check for appointment-related keywords
    const appointmentKeywords = ['appointment', 'schedule', 'meeting', 'viewing', 'see the property', 'visit'];
    const wantsAppointment = appointmentKeywords.some(keyword => 
      speechResult.toLowerCase().includes(keyword)
    );

    if (wantsAppointment) {
      // Route to appointment scheduling flow
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Great! I can help you schedule an appointment. What day and time works best for you?');

      const gather = twiml.gather({
        input: 'speech',
        action: '/api/voice-ai/schedule-appointment',
        method: 'POST',
        timeout: 5,
        speechTimeout: 'auto',
        language: 'en-US'
      });

      gather.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Please tell me your preferred date and time.');

    } else {
      // General inquiry - send to Gemini for intelligent response
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Let me help you with that. Please hold for just a moment while I look up that information.');

      // Redirect to Gemini processing
      twiml.redirect({
        method: 'POST'
      }, '/api/voice-ai/gemini-response');
    }

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error processing response:', error);
    
    const twiml = new VoiceResponse();
    twiml.say('An error occurred processing your request. Please try again.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 3: Schedule Appointment
// Twilio webhook: POST /api/voice-ai/schedule-appointment
// ============================================================

router.post('/schedule-appointment', async (req, res) => {
  try {
    console.log('📅 Scheduling appointment:', {
      CallSid: req.body.CallSid,
      SpeechResult: req.body.SpeechResult
    });

    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const speechResult = req.body.SpeechResult || '';
    const callerNumber = req.body.From;
    const twilioNumber = req.body.To;

    // Get subscriber
    const subscriberQuery = await req.db.query(
      'SELECT user_id FROM users WHERE twilio_phone_number = $1',
      [twilioNumber]
    );

    const userId = subscriberQuery.rows[0].user_id;

    // Update transcript
    await req.db.query(`
      UPDATE ai_voice_call_logs 
      SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
      WHERE call_sid = $2
    `, [`Caller: ${speechResult}`, callSid]);

    // Parse datetime from speech (simplified - in production use Gemini for better parsing)
    // For now, create appointment 24 hours from now as placeholder
    const appointmentTime = new Date();
    appointmentTime.setHours(appointmentTime.getHours() + 24);

    // Ask for caller's name
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Perfect! Can I get your full name please?');

    const gather = twiml.gather({
      input: 'speech',
      action: '/api/voice-ai/collect-contact-info',
      method: 'POST',
      timeout: 5,
      speechTimeout: 'auto',
      language: 'en-US'
    });

    gather.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Please state your first and last name.');

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error scheduling appointment:', error);
    
    const twiml = new VoiceResponse();
    twiml.say('Sorry, I had trouble scheduling that appointment. Please try again.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 4: Collect Contact Information
// Twilio webhook: POST /api/voice-ai/collect-contact-info
// ============================================================

router.post('/collect-contact-info', async (req, res) => {
  try {
    console.log('📝 Collecting contact info:', {
      CallSid: req.body.CallSid,
      SpeechResult: req.body.SpeechResult
    });

    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const callerName = req.body.SpeechResult || 'Unknown';
    const callerNumber = req.body.From;
    const twilioNumber = req.body.To;

    // Get subscriber
    const subscriberQuery = await req.db.query(
      'SELECT user_id FROM users WHERE twilio_phone_number = $1',
      [twilioNumber]
    );

    const userId = subscriberQuery.rows[0].user_id;

    // Update transcript
    await req.db.query(`
      UPDATE ai_voice_call_logs 
      SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
      WHERE call_sid = $2
    `, [`Caller name: ${callerName}`, callSid]);

    // Create appointment (24 hours from now as placeholder)
    const appointmentTime = new Date();
    appointmentTime.setHours(appointmentTime.getHours() + 24);

    const appointmentResult = await req.db.query(`
      INSERT INTO appointments (
        user_id, contact_name, contact_phone, 
        appointment_datetime, appointment_type, 
        appointment_status, call_sid, notes,
        lead_source
      ) VALUES ($1, $2, $3, $4, 'phone_call', 'scheduled', $5, $6, 'voice_ai')
      RETURNING appointment_id
    `, [
      userId,
      callerName,
      callerNumber,
      appointmentTime,
      callSid,
      'Appointment scheduled via AI voice call'
    ]);

    // Update call log with outcome
    await req.db.query(`
      UPDATE ai_voice_call_logs 
      SET 
        call_outcome = 'appointment_scheduled',
        appointment_id = $1,
        extracted_data = jsonb_build_object(
          'caller_name', $2,
          'caller_phone', $3
        )
      WHERE call_sid = $4
    `, [appointmentResult.rows[0].appointment_id, callerName, callerNumber, callSid]);

    // Confirm with caller
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, `Thank you ${callerName}! I've scheduled an appointment for you. You'll receive a confirmation shortly at this number. Is there anything else I can help you with?`);

    const gather = twiml.gather({
      input: 'speech',
      action: '/api/voice-ai/final-response',
      method: 'POST',
      timeout: 3,
      speechTimeout: 'auto',
      language: 'en-US',
      numDigits: 1
    });

    gather.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Say yes if you need anything else, or no to end the call.');

    // Default ending
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Thank you for calling. Have a great day!');

    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error collecting contact info:', error);
    
    const twiml = new VoiceResponse();
    twiml.say('Sorry, I had trouble saving your information. Please try again.');
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 5: Final Response Handler
// Twilio webhook: POST /api/voice-ai/final-response
// ============================================================

router.post('/final-response', async (req, res) => {
  try {
    const twiml = new VoiceResponse();
    const speechResult = (req.body.SpeechResult || '').toLowerCase();
    const callSid = req.body.CallSid;

    if (speechResult.includes('yes') || speechResult.includes('yeah') || speechResult.includes('sure')) {
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'What else can I help you with?');

      twiml.redirect({
        method: 'POST'
      }, '/api/voice-ai/process-response');
    } else {
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Thank you for calling. Have a great day!');

      twiml.hangup();
    }

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error in final response:', error);
    
    const twiml = new VoiceResponse();
    twiml.say('Thank you for calling. Goodbye!');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 6: Call Status Callback
// Twilio webhook: POST /api/voice-ai/status-callback
// ============================================================

router.post('/status-callback', async (req, res) => {
  try {
    console.log('📊 Call status update:', {
      CallSid: req.body.CallSid,
      CallStatus: req.body.CallStatus,
      CallDuration: req.body.CallDuration
    });

    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;
    const callDuration = parseInt(req.body.CallDuration || '0');

    // Update call log
    await req.db.query(`
      UPDATE ai_voice_call_logs
      SET 
        call_status = $1,
        duration_seconds = $2,
        ended_at = NOW()
      WHERE call_sid = $3
    `, [callStatus, callDuration, callSid]);

    // Calculate and deduct tokens (500 tokens per minute)
    if (callStatus === 'completed' && callDuration > 0) {
      const minutes = Math.ceil(callDuration / 60);
      const tokensUsed = minutes * 500;

      // Get user_id from call log
      const callLogQuery = await req.db.query(
        'SELECT user_id FROM ai_voice_call_logs WHERE call_sid = $1',
        [callSid]
      );

      if (callLogQuery.rows.length > 0) {
        const userId = callLogQuery.rows[0].user_id;

        // Deduct tokens
        await req.db.query(`
          UPDATE subscriber_profiles
          SET token_balance = token_balance - $1
          WHERE user_id = $2
        `, [tokensUsed, userId]);

        // Log token usage
        await req.db.query(`
          INSERT INTO token_usage_log (
            user_id, action_type, tokens_used, 
            reference_id, reference_type
          ) VALUES ($1, 'voice_call', $2, $3, 'call')
        `, [userId, tokensUsed, callSid]);

        // Update call log with token cost
        await req.db.query(`
          UPDATE ai_voice_call_logs
          SET tokens_used = $1
          WHERE call_sid = $2
        `, [tokensUsed, callSid]);

        console.log(`💰 Deducted ${tokensUsed} tokens for ${minutes} minute call`);
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error in status callback:', error);
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
});

module.exports = router;
```

### Step 2.2: Mount Voice AI Routes

Edit `server.js` and add the voice AI routes:

```javascript
// Add this near the top with other requires
const voiceAiRoutes = require('./routes/voice-ai');

// Add this with other route mounts (around line 50-60)
app.use('/api/voice-ai', checkDatabase, voiceAiRoutes);
```

**Full server.js section should look like:**

```javascript
// Route mounting
app.use('/api/properties', checkDatabase, propertiesRoutes);
app.use('/api/users', checkDatabase, usersRoutes);
app.use('/api/profiles', checkDatabase, profilesRoutes);
app.use('/api/stripe', checkDatabase, stripeRoutes);
app.use('/api/admin', checkDatabase, adminRoutes);
app.use('/api/saved-leads', checkDatabase, savedLeadsRoutes);
app.use('/api/voice-ai', checkDatabase, voiceAiRoutes); // NEW LINE
```

### Step 2.3: Install Twilio SDK

Add Twilio to `package.json` dependencies:

```json
{
  "dependencies": {
    "twilio": "^5.3.4"
  }
}
```

Or install via npm:

```bash
npm install twilio --save
```

### Step 2.4: Deploy Updated Code

```bash
# Commit changes
git add routes/voice-ai.js server.js package.json
git commit -m "Add Voice AI foundation routes"
git push origin main

# Redeploy to Cloud Run
gcloud run deploy real-estate-leads-api-00037-pcc \
  --source . \
  --region us-east1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="postgresql://postgres:Admin%401234@172.27.64.3:5432/real_estate_leads?sslmode=no-verify" \
  --vpc-egress private-ranges-only \
  --command=/cnb/process/web
```

### Step 2.5: Test Voice AI Foundation

**Test 1: Check endpoint exists**

```bash
curl -X POST https://real-estate-leads-api-00037-pcc-556658726901.us-east1.run.app/api/voice-ai/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=TEST123&From=+15551234567&To=+17865446480&CallStatus=ringing"
```

**Expected:** TwiML XML response with greeting

**Test 2: Verify database logging**

```sql
SELECT 
  call_sid,
  call_type,
  direction,
  call_status,
  caller_number,
  created_at
FROM ai_voice_call_logs
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ PART 1 COMPLETION CHECKLIST

Before moving to Part 2, verify:

- [ ] All 6 new database tables created successfully
- [ ] 3 new columns added to users table
- [ ] 3 system email templates inserted
- [ ] `routes/voice-ai.js` file created with all 6 routes
- [ ] Voice AI routes mounted in `server.js`
- [ ] Twilio SDK installed in dependencies
- [ ] Code deployed to Cloud Run without errors
- [ ] Voice AI endpoints respond with valid TwiML
- [ ] Test call logged in `ai_voice_call_logs` table

**Estimated completion time:** 3-4 hours

---

## 📝 NOTES FOR PART 2

Part 2 will cover:
- Gemini API integration for intelligent responses
- Appointment management endpoints (CRUD)
- Advanced call flows (transfer to human, voicemail)
- Token usage tracking and enforcement
- Full end-to-end testing with real phone calls

---

**Document prepared by:** AI Assistant  
**For developer:** Zencoder  
**Project:** Miami-Dade Real Estate Leads SaaS  
**Date:** November 24, 2025
