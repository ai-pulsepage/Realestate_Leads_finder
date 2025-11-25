const { Pool } = require('pg');

async function runMigrations() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    database: 'real_estate_leads',
    user: 'api_user',
    password: 'E5"j/Fq|@oqY;+#e',
    ssl: false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  try {
    console.log('🔄 Starting database migrations...');

    // First, check what tables exist
    console.log('🔍 Checking existing database structure...');
    const existingTables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Existing tables:', existingTables.rows.map(r => r.table_name));

    // Check saved_leads table structure if it exists
    const savedLeadsExists = existingTables.rows.some(r => r.table_name === 'saved_leads');
    if (savedLeadsExists) {
      const savedLeadsColumns = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'saved_leads' AND table_schema = 'public'
        ORDER BY column_name;
      `);
      console.log('saved_leads columns:', savedLeadsColumns.rows);
    } else {
      console.log('⚠️  saved_leads table does not exist - foreign key constraints will fail');
    }

    // Migration 1: Appointments Table
    console.log('📅 Creating appointments table...');
    await pool.query(`
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
        saved_lead_id UUID REFERENCES saved_leads(lead_id) ON DELETE SET NULL,

        -- Urgency tracking
        urgency_level VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'normal', 'low'

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes for appointments
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(appointment_datetime);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(appointment_status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_appointments_call_sid ON appointments(call_sid);`);

    // Auto-update trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_appointments_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`
      CREATE TRIGGER trigger_appointments_updated_at
        BEFORE UPDATE ON appointments
        FOR EACH ROW
        EXECUTE FUNCTION update_appointments_updated_at();
    `);

    // Migration 2: Email Templates Table
    console.log('📧 Creating email_templates table...');
    await pool.query(`
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
    `);

    // Indexes for email_templates
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);`);

    // Auto-update trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`
      CREATE TRIGGER trigger_email_templates_updated_at
        BEFORE UPDATE ON email_templates
        FOR EACH ROW
        EXECUTE FUNCTION update_email_templates_updated_at();
    `);

    // Migration 3: Email Campaigns Table
    console.log('📧 Creating email_campaigns table...');
    await pool.query(`
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
    `);

    // Indexes for email_campaigns
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_campaigns_user_id ON email_campaigns(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled_time ON email_campaigns(scheduled_send_time);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_campaigns_type ON email_campaigns(campaign_type);`);

    // Auto-update trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_email_campaigns_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`
      CREATE TRIGGER trigger_email_campaigns_updated_at
        BEFORE UPDATE ON email_campaigns
        FOR EACH ROW
        EXECUTE FUNCTION update_email_campaigns_updated_at();
    `);

    // Migration 4: Campaign Recipients Table
    console.log('📧 Creating campaign_recipients table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        recipient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES email_campaigns(campaign_id) ON DELETE CASCADE,
        saved_lead_id UUID REFERENCES saved_leads(lead_id) ON DELETE CASCADE,

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
    `);

    // Indexes for campaign_recipients
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaign_recipients_lead_id ON campaign_recipients(saved_lead_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(send_status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON campaign_recipients(recipient_email);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaign_recipients_sendgrid_id ON campaign_recipients(sendgrid_message_id);`);

    // Migration 5: Voice Call Campaigns Table
    console.log('📞 Creating voice_call_campaigns table...');
    await pool.query(`
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
    `);

    // Indexes for voice_call_campaigns
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_voice_campaigns_user_id ON voice_call_campaigns(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_voice_campaigns_status ON voice_call_campaigns(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_voice_campaigns_start_time ON voice_call_campaigns(start_time);`);

    // Auto-update trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_voice_campaigns_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`
      CREATE TRIGGER trigger_voice_campaigns_updated_at
        BEFORE UPDATE ON voice_call_campaigns
        FOR EACH ROW
        EXECUTE FUNCTION update_voice_campaigns_updated_at();
    `);

    // Migration 6: Voice Campaign Targets Table
    console.log('📞 Creating voice_campaign_targets table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voice_campaign_targets (
        target_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES voice_call_campaigns(campaign_id) ON DELETE CASCADE,
        saved_lead_id UUID NOT NULL REFERENCES saved_leads(lead_id) ON DELETE CASCADE,

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
    `);

    // Indexes for voice_campaign_targets
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_voice_targets_campaign_id ON voice_campaign_targets(campaign_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_voice_targets_lead_id ON voice_campaign_targets(saved_lead_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_voice_targets_status ON voice_campaign_targets(call_status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_voice_targets_next_attempt ON voice_campaign_targets(next_attempt_at);`);

    // Auto-update trigger
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_voice_targets_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`
      CREATE TRIGGER trigger_voice_targets_updated_at
        BEFORE UPDATE ON voice_campaign_targets
        FOR EACH ROW
        EXECUTE FUNCTION update_voice_targets_updated_at();
    `);

    // Migration 7: Alter Existing Tables
    console.log('🔧 Altering existing tables...');
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS twilio_phone_number VARCHAR(50);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_ai_enabled BOOLEAN DEFAULT false;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS from_email VARCHAR(255);`);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_twilio_phone ON users(twilio_phone_number);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_voice_enabled ON users(voice_ai_enabled);`);

    // Migration 8: Seed System Email Templates
    console.log('📧 Seeding system email templates...');

    // Welcome Email Template
    await pool.query(`
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
        'New Lead Welcome',
        'system',
        'welcome',
        'Thanks for Your Interest in {{property_address}}',
        '<html><body><h2>Hi {{first_name}},</h2><p>Thank you for your interest in the property at <strong>{{property_address}}</strong>.</p><p>I''d love to discuss this opportunity with you. Here are the property highlights:</p><ul><li>Price: {{property_price}}</li><li>Bedrooms: {{bedrooms}}</li><li>Bathrooms: {{bathrooms}}</li></ul><p>Would you like to schedule a viewing? You can reply to this email or call me at {{agent_phone}}.</p><p>Best regards,<br>{{agent_name}}<br>{{company_name}}</p></body></html>',
        'Hi {{first_name}},\n\nThank you for your interest in the property at {{property_address}}.\n\nI''d love to discuss this opportunity with you. Here are the property highlights:\n\n- Price: {{property_price}}\n- Bedrooms: {{bedrooms}}\n- Bathrooms: {{bathrooms}}\n\nWould you like to schedule a viewing? You can reply to this email or call me at {{agent_phone}}.\n\nBest regards,\n{{agent_name}}\n{{company_name}}',
        '["{{first_name}}", "{{property_address}}", "{{property_price}}", "{{bedrooms}}", "{{bathrooms}}", "{{agent_phone}}", "{{agent_name}}", "{{company_name}}"]'::jsonb
      );
    `);

    // Follow-up Email Template
    await pool.query(`
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
    `);

    // Appointment Reminder Template
    await pool.query(`
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
    `);

    // Verification
    console.log('🔍 Running verification queries...');

    const tableCheck = await pool.query(`
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
    `);

    const userColumnsCheck = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('twilio_phone_number', 'voice_ai_enabled', 'from_email')
      ORDER BY column_name;
    `);

    const templateCount = await pool.query(`
      SELECT COUNT(*) as system_template_count
      FROM email_templates
      WHERE user_id IS NULL;
    `);

    console.log('📊 Migration Results:');
    console.log('New tables created:', tableCheck.rows.length);
    console.table(tableCheck.rows);
    console.log('New user columns:', userColumnsCheck.rows.length);
    console.table(userColumnsCheck.rows);
    console.log('System templates seeded:', templateCount.rows[0].system_template_count);

    console.log('✅ All database migrations completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations().catch(console.error);