# ZENCODER IMPLEMENTATION GUIDE - PART 3
## Email Campaign System Complete Implementation

**Project:** Miami-Dade Real Estate Leads SaaS Platform  
**Developer:** Zencoder  
**Document Version:** 1.0  
**Date:** November 24, 2025

---

## 📋 PART 3 OVERVIEW

This document covers:
1. **Email Templates Management** - CRUD for custom and system templates
2. **Campaign Creation** - Manual, scheduled, and automated campaigns
3. **SendGrid Integration** - Bulk sending with tracking
4. **Campaign Analytics** - Opens, clicks, bounces tracking
5. **AI-Assisted Email Writing** - Gemini-powered content suggestions

**Estimated Time:** 4-5 hours  
**Prerequisites:** 
- Parts 1 & 2 completed successfully
- SendGrid account configured with API key
- Verified sender domain/email

---

## 📧 SECTION 1: EMAIL TEMPLATES MANAGEMENT

### Step 1.1: Create Email Templates Routes

Create file: `routes/email-templates.js`

```javascript
/**
 * EMAIL TEMPLATES ROUTES
 * CRUD operations for email template management
 */

const express = require('express');
const router = express.Router();

// ============================================================
// GET /api/email-templates/:user_id
// Get all templates for a user (includes system templates)
// ============================================================

router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { category, template_type } = req.query;

    let query = `
      SELECT 
        template_id,
        user_id,
        template_name,
        template_type,
        category,
        subject_line,
        LEFT(html_body, 200) as html_preview,
        available_variables,
        is_active,
        usage_count,
        created_at,
        updated_at
      FROM email_templates
      WHERE (user_id = $1 OR user_id IS NULL)
    `;

    const queryParams = [user_id];

    // Filter by category
    if (category) {
      query += ` AND category = $${queryParams.length + 1}`;
      queryParams.push(category);
    }

    // Filter by type
    if (template_type) {
      query += ` AND template_type = $${queryParams.length + 1}`;
      queryParams.push(template_type);
    }

    query += ` AND is_active = true ORDER BY template_type, template_name`;

    const result = await req.db.query(query, queryParams);

    res.json({
      success: true,
      count: result.rows.length,
      templates: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching templates',
      error: error.message
    });
  }
});

// ============================================================
// GET /api/email-templates/single/:template_id
// Get single template with full content
// ============================================================

router.get('/single/:template_id', async (req, res) => {
  try {
    const { template_id } = req.params;

    const result = await req.db.query(`
      SELECT * FROM email_templates
      WHERE template_id = $1
    `, [template_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      template: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching template',
      error: error.message
    });
  }
});

// ============================================================
// POST /api/email-templates
// Create new custom template
// ============================================================

router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      template_name,
      category,
      subject_line,
      html_body,
      plain_text_body,
      available_variables
    } = req.body;

    // Validation
    if (!user_id || !template_name || !subject_line || !html_body) {
      return res.status(400).json({
        success: false,
        message: 'user_id, template_name, subject_line, and html_body are required'
      });
    }

    const result = await req.db.query(`
      INSERT INTO email_templates (
        user_id, template_name, template_type, category,
        subject_line, html_body, plain_text_body, available_variables
      ) VALUES ($1, $2, 'custom', $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      user_id,
      template_name,
      category || 'custom',
      subject_line,
      html_body,
      plain_text_body,
      JSON.stringify(available_variables || [])
    ]);

    console.log('✅ Template created:', result.rows[0].template_id);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      template: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating template',
      error: error.message
    });
  }
});

// ============================================================
// PUT /api/email-templates/:template_id
// Update template (custom templates only)
// ============================================================

router.put('/:template_id', async (req, res) => {
  try {
    const { template_id } = req.params;
    const {
      template_name,
      category,
      subject_line,
      html_body,
      plain_text_body,
      available_variables,
      is_active
    } = req.body;

    // Check if template is custom (can't edit system templates)
    const checkQuery = await req.db.query(
      'SELECT template_type FROM email_templates WHERE template_id = $1',
      [template_id]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    if (checkQuery.rows[0].template_type === 'system') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify system templates'
      });
    }

    // Build dynamic update
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (template_name !== undefined) {
      updates.push(`template_name = $${paramCount++}`);
      values.push(template_name);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (subject_line !== undefined) {
      updates.push(`subject_line = $${paramCount++}`);
      values.push(subject_line);
    }
    if (html_body !== undefined) {
      updates.push(`html_body = $${paramCount++}`);
      values.push(html_body);
    }
    if (plain_text_body !== undefined) {
      updates.push(`plain_text_body = $${paramCount++}`);
      values.push(plain_text_body);
    }
    if (available_variables !== undefined) {
      updates.push(`available_variables = $${paramCount++}`);
      values.push(JSON.stringify(available_variables));
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(template_id);

    const query = `
      UPDATE email_templates
      SET ${updates.join(', ')}
      WHERE template_id = $${paramCount}
      RETURNING *
    `;

    const result = await req.db.query(query, values);

    console.log('✅ Template updated:', template_id);

    res.json({
      success: true,
      message: 'Template updated successfully',
      template: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating template',
      error: error.message
    });
  }
});

// ============================================================
// DELETE /api/email-templates/:template_id
// Soft delete template (mark as inactive)
// ============================================================

router.delete('/:template_id', async (req, res) => {
  try {
    const { template_id } = req.params;

    // Can't delete system templates
    const checkQuery = await req.db.query(
      'SELECT template_type FROM email_templates WHERE template_id = $1',
      [template_id]
    );

    if (checkQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    if (checkQuery.rows[0].template_type === 'system') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete system templates'
      });
    }

    // Soft delete
    const result = await req.db.query(`
      UPDATE email_templates
      SET is_active = false
      WHERE template_id = $1
      RETURNING *
    `, [template_id]);

    console.log('✅ Template deleted:', template_id);

    res.json({
      success: true,
      message: 'Template deleted successfully',
      template: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting template',
      error: error.message
    });
  }
});

// ============================================================
// POST /api/email-templates/ai-assist
// AI-assisted email content generation
// ============================================================

router.post('/ai-assist', async (req, res) => {
  try {
    const {
      prompt,
      context,
      tone = 'professional'
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'prompt is required'
      });
    }

    const geminiService = require('../services/gemini');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const fullPrompt = `
You are an expert real estate email copywriter. Generate email content for this request:

REQUEST: ${prompt}

CONTEXT: ${context || 'General real estate lead outreach'}

TONE: ${tone}

Generate:
1. Subject line (under 60 characters, attention-grabbing)
2. Email body (HTML format, professional, 150-250 words)
3. Plain text version

Format your response as JSON:
{
  "subject_line": "...",
  "html_body": "<html>...</html>",
  "plain_text_body": "...",
  "suggested_variables": ["{{first_name}}", "{{property_address}}", ...]
}

Keep it conversational, not salesy. Focus on value and building relationships.

JSON:`;

    const result = await model.generateContent(fullPrompt);
    let responseText = result.response.text().trim();

    // Clean markdown
    if (responseText.startsWith('```json')) {
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (responseText.startsWith('```')) {
      responseText = responseText.replace(/```\n?/g, '');
    }

    const generated = JSON.parse(responseText);

    console.log('✅ AI-assisted content generated');

    res.json({
      success: true,
      generated_content: generated
    });

  } catch (error) {
    console.error('❌ Error generating AI content:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating content',
      error: error.message
    });
  }
});

module.exports = router;
```

### Step 1.2: Mount Email Templates Routes

Edit `server.js`:

```javascript
// Add require
const emailTemplatesRoutes = require('./routes/email-templates');

// Add route mount
app.use('/api/email-templates', checkDatabase, emailTemplatesRoutes);
```

---

## 📨 SECTION 2: EMAIL CAMPAIGNS

### Step 2.1: Create Email Campaigns Routes

Create file: `routes/email-campaigns.js`

```javascript
/**
 * EMAIL CAMPAIGNS ROUTES
 * Create, manage, and send email campaigns
 */

const express = require('express');
const router = express.Router();
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ============================================================
// GET /api/email-campaigns/:user_id
// Get all campaigns for a user
// ============================================================

router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { status, campaign_type } = req.query;

    let query = `
      SELECT 
        ec.*,
        et.template_name,
        (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = ec.campaign_id) as total_recipients
      FROM email_campaigns ec
      LEFT JOIN email_templates et ON ec.template_id = et.template_id
      WHERE ec.user_id = $1
    `;

    const queryParams = [user_id];

    if (status) {
      query += ` AND ec.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    if (campaign_type) {
      query += ` AND ec.campaign_type = $${queryParams.length + 1}`;
      queryParams.push(campaign_type);
    }

    query += ` ORDER BY ec.created_at DESC`;

    const result = await req.db.query(query, queryParams);

    res.json({
      success: true,
      count: result.rows.length,
      campaigns: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campaigns',
      error: error.message
    });
  }
});

// ============================================================
// GET /api/email-campaigns/single/:campaign_id
// Get single campaign details
// ============================================================

router.get('/single/:campaign_id', async (req, res) => {
  try {
    const { campaign_id } = req.params;

    const campaignQuery = await req.db.query(`
      SELECT 
        ec.*,
        et.template_name,
        u.email as subscriber_email
      FROM email_campaigns ec
      LEFT JOIN email_templates et ON ec.template_id = et.template_id
      LEFT JOIN users u ON ec.user_id = u.user_id
      WHERE ec.campaign_id = $1
    `, [campaign_id]);

    if (campaignQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = campaignQuery.rows[0];

    // Get recipients summary
    const recipientsQuery = await req.db.query(`
      SELECT 
        send_status,
        COUNT(*) as count
      FROM campaign_recipients
      WHERE campaign_id = $1
      GROUP BY send_status
    `, [campaign_id]);

    campaign.recipients_summary = recipientsQuery.rows;

    res.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('❌ Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching campaign',
      error: error.message
    });
  }
});

// ============================================================
// POST /api/email-campaigns
// Create new campaign
// ============================================================

router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      campaign_name,
      template_id,
      subject_line,
      html_body,
      plain_text_body,
      from_email,
      campaign_type,
      scheduled_send_time,
      target_audience,
      recipients // Array of lead IDs or email objects
    } = req.body;

    // Validation
    if (!user_id || !campaign_name || !subject_line || !html_body) {
      return res.status(400).json({
        success: false,
        message: 'user_id, campaign_name, subject_line, and html_body are required'
      });
    }

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'recipients array is required and cannot be empty'
      });
    }

    // Check token balance (100 tokens per email)
    const tokensRequired = recipients.length * 100;
    const balanceQuery = await req.db.query(
      'SELECT token_balance FROM subscriber_profiles WHERE user_id = $1',
      [user_id]
    );

    if (balanceQuery.rows.length === 0 || balanceQuery.rows[0].token_balance < tokensRequired) {
      return res.status(402).json({
        success: false,
        message: `Insufficient tokens. Required: ${tokensRequired}, Available: ${balanceQuery.rows[0]?.token_balance || 0}`
      });
    }

    // Create campaign
    const campaignResult = await req.db.query(`
      INSERT INTO email_campaigns (
        user_id, campaign_name, template_id, subject_line,
        html_body, plain_text_body, from_email,
        campaign_type, scheduled_send_time, target_audience,
        recipient_count, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      user_id,
      campaign_name,
      template_id,
      subject_line,
      html_body,
      plain_text_body,
      from_email,
      campaign_type || 'manual',
      scheduled_send_time,
      JSON.stringify(target_audience || {}),
      recipients.length,
      scheduled_send_time ? 'scheduled' : 'draft'
    ]);

    const campaign = campaignResult.rows[0];
    const campaignId = campaign.campaign_id;

    // Add recipients
    for (const recipient of recipients) {
      const { saved_lead_id, email, name, template_variables } = recipient;

      await req.db.query(`
        INSERT INTO campaign_recipients (
          campaign_id, saved_lead_id, recipient_email,
          recipient_name, template_variables, send_status
        ) VALUES ($1, $2, $3, $4, $5, 'pending')
      `, [
        campaignId,
        saved_lead_id || null,
        email,
        name || 'Unknown',
        JSON.stringify(template_variables || {})
      ]);
    }

    console.log('✅ Campaign created:', campaignId);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign,
      recipients_added: recipients.length
    });

  } catch (error) {
    console.error('❌ Error creating campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating campaign',
      error: error.message
    });
  }
});

// ============================================================
// POST /api/email-campaigns/:campaign_id/send
// Send campaign immediately
// ============================================================

router.post('/:campaign_id/send', async (req, res) => {
  try {
    const { campaign_id } = req.params;

    // Get campaign details
    const campaignQuery = await req.db.query(`
      SELECT ec.*, u.email as default_from_email
      FROM email_campaigns ec
      JOIN users u ON ec.user_id = u.user_id
      WHERE ec.campaign_id = $1
    `, [campaign_id]);

    if (campaignQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    const campaign = campaignQuery.rows[0];

    if (campaign.status === 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Campaign already sent'
      });
    }

    // Update campaign status
    await req.db.query(`
      UPDATE email_campaigns
      SET status = 'sending', sent_at = NOW()
      WHERE campaign_id = $1
    `, [campaign_id]);

    // Get recipients
    const recipientsQuery = await req.db.query(`
      SELECT * FROM campaign_recipients
      WHERE campaign_id = $1 AND send_status = 'pending'
    `, [campaign_id]);

    const recipients = recipientsQuery.rows;
    let sentCount = 0;
    let failedCount = 0;

    // Send emails
    for (const recipient of recipients) {
      try {
        // Replace template variables
        let personalizedHtml = campaign.html_body;
        let personalizedSubject = campaign.subject_line;

        const variables = recipient.template_variables || {};
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          personalizedHtml = personalizedHtml.replace(regex, value);
          personalizedSubject = personalizedSubject.replace(regex, value);
        }

        // Send via SendGrid
        const msg = {
          to: recipient.recipient_email,
          from: campaign.from_email || campaign.default_from_email,
          subject: personalizedSubject,
          html: personalizedHtml,
          text: campaign.plain_text_body || personalizedHtml.replace(/<[^>]*>/g, ''),
          customArgs: {
            campaign_id: campaign_id,
            recipient_id: recipient.recipient_id
          }
        };

        const sendResult = await sgMail.send(msg);
        const messageId = sendResult[0].headers['x-message-id'];

        // Update recipient status
        await req.db.query(`
          UPDATE campaign_recipients
          SET 
            send_status = 'sent',
            sendgrid_message_id = $1,
            sent_at = NOW()
          WHERE recipient_id = $2
        `, [messageId, recipient.recipient_id]);

        sentCount++;

      } catch (sendError) {
        console.error('❌ Error sending to:', recipient.recipient_email, sendError);

        // Update recipient with error
        await req.db.query(`
          UPDATE campaign_recipients
          SET 
            send_status = 'failed',
            error_message = $1
          WHERE recipient_id = $2
        `, [sendError.message, recipient.recipient_id]);

        failedCount++;
      }
    }

    // Update campaign analytics
    await req.db.query(`
      UPDATE email_campaigns
      SET 
        status = 'sent',
        emails_sent = $1
      WHERE campaign_id = $2
    `, [sentCount, campaign_id]);

    // Deduct tokens (100 per successful send)
    const tokensUsed = sentCount * 100;
    await req.db.query(`
      UPDATE subscriber_profiles
      SET token_balance = token_balance - $1
      WHERE user_id = $2
    `, [tokensUsed, campaign.user_id]);

    // Log token usage
    await req.db.query(`
      INSERT INTO token_usage_log (
        user_id, action_type, tokens_used,
        reference_id, reference_type
      ) VALUES ($1, 'email_campaign', $2, $3, 'campaign')
    `, [campaign.user_id, tokensUsed, campaign_id]);

    console.log(`✅ Campaign sent: ${sentCount} succeeded, ${failedCount} failed`);

    res.json({
      success: true,
      message: 'Campaign sent',
      sent_count: sentCount,
      failed_count: failedCount,
      tokens_used: tokensUsed
    });

  } catch (error) {
    console.error('❌ Error sending campaign:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending campaign',
      error: error.message
    });
  }
});

// ============================================================
// POST /api/email-campaigns/webhook/sendgrid
// SendGrid event webhook
// ============================================================

router.post('/webhook/sendgrid', express.json(), async (req, res) => {
  try {
    const events = req.body;

    for (const event of events) {
      const { 
        event: eventType, 
        sg_message_id,
        campaign_id,
        recipient_id,
        timestamp 
      } = event;

      console.log('📧 SendGrid event:', eventType, sg_message_id);

      // Update recipient based on event type
      if (eventType === 'delivered') {
        await req.db.query(`
          UPDATE campaign_recipients
          SET send_status = 'delivered', delivered_at = to_timestamp($1)
          WHERE sendgrid_message_id = $2
        `, [timestamp, sg_message_id]);

        // Update campaign analytics
        await req.db.query(`
          UPDATE email_campaigns
          SET emails_delivered = emails_delivered + 1
          WHERE campaign_id IN (
            SELECT campaign_id FROM campaign_recipients WHERE sendgrid_message_id = $1
          )
        `, [sg_message_id]);

      } else if (eventType === 'open') {
        await req.db.query(`
          UPDATE campaign_recipients
          SET opened_at = to_timestamp($1)
          WHERE sendgrid_message_id = $2
        `, [timestamp, sg_message_id]);

        await req.db.query(`
          UPDATE email_campaigns
          SET emails_opened = emails_opened + 1
          WHERE campaign_id IN (
            SELECT campaign_id FROM campaign_recipients WHERE sendgrid_message_id = $1
          )
        `, [sg_message_id]);

      } else if (eventType === 'click') {
        await req.db.query(`
          UPDATE campaign_recipients
          SET clicked_at = to_timestamp($1)
          WHERE sendgrid_message_id = $2
        `, [timestamp, sg_message_id]);

        await req.db.query(`
          UPDATE email_campaigns
          SET emails_clicked = emails_clicked + 1
          WHERE campaign_id IN (
            SELECT campaign_id FROM campaign_recipients WHERE sendgrid_message_id = $1
          )
        `, [sg_message_id]);

      } else if (eventType === 'bounce' || eventType === 'dropped') {
        await req.db.query(`
          UPDATE campaign_recipients
          SET send_status = 'bounced', bounced_at = to_timestamp($1)
          WHERE sendgrid_message_id = $2
        `, [timestamp, sg_message_id]);

        await req.db.query(`
          UPDATE email_campaigns
          SET emails_bounced = emails_bounced + 1
          WHERE campaign_id IN (
            SELECT campaign_id FROM campaign_recipients WHERE sendgrid_message_id = $1
          )
        `, [sg_message_id]);

      } else if (eventType === 'unsubscribe') {
        await req.db.query(`
          UPDATE campaign_recipients
          SET unsubscribed_at = to_timestamp($1)
          WHERE sendgrid_message_id = $2
        `, [timestamp, sg_message_id]);

        await req.db.query(`
          UPDATE email_campaigns
          SET emails_unsubscribed = emails_unsubscribed + 1
          WHERE campaign_id IN (
            SELECT campaign_id FROM campaign_recipients WHERE sendgrid_message_id = $1
          )
        `, [sg_message_id]);
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ SendGrid webhook error:', error);
    res.status(200).send('OK'); // Always return 200 to SendGrid
  }
});

// ============================================================
// GET /api/email-campaigns/analytics/:campaign_id
// Get detailed campaign analytics
// ============================================================

router.get('/analytics/:campaign_id', async (req, res) => {
  try {
    const { campaign_id } = req.params;

    // Get campaign summary
    const campaignQuery = await req.db.query(`
      SELECT 
        campaign_name,
        subject_line,
        status,
        emails_sent,
        emails_delivered,
        emails_opened,
        emails_clicked,
        emails_bounced,
        tokens_used,
        sent_at,
        CASE 
          WHEN emails_sent > 0 THEN ROUND((emails_delivered::numeric / emails_sent) * 100, 2)
          ELSE 0 
        END as delivery_rate,
        CASE 
          WHEN emails_delivered > 0 THEN ROUND((emails_opened::numeric / emails_delivered) * 100, 2)
          ELSE 0 
        END as open_rate,
        CASE 
          WHEN emails_opened > 0 THEN ROUND((emails_clicked::numeric / emails_opened) * 100, 2)
          ELSE 0 
        END as click_through_rate
      FROM email_campaigns
      WHERE campaign_id = $1
    `, [campaign_id]);

    if (campaignQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Get recipients breakdown
    const recipientsQuery = await req.db.query(`
      SELECT 
        send_status,
        COUNT(*) as count
      FROM campaign_recipients
      WHERE campaign_id = $1
      GROUP BY send_status
    `, [campaign_id]);

    res.json({
      success: true,
      analytics: {
        campaign: campaignQuery.rows[0],
        recipients_breakdown: recipientsQuery.rows
      }
    });

  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

module.exports = router;
```

### Step 2.2: Install SendGrid SDK

Add to `package.json`:

```json
{
  "dependencies": {
    "@sendgrid/mail": "^8.1.4"
  }
}
```

Or install:

```bash
npm install @sendgrid/mail --save
```

### Step 2.3: Mount Email Campaigns Routes

Edit `server.js`:

```javascript
// Add require
const emailCampaignsRoutes = require('./routes/email-campaigns');

// Add route mount
app.use('/api/email-campaigns', checkDatabase, emailCampaignsRoutes);
```

---

## 🧪 SECTION 3: TESTING EMAIL CAMPAIGNS

### Test 1: Create Custom Template

```bash
curl -X POST https://real-estate-leads-api-00037-pcc-556658726901.us-east1.run.app/api/email-templates \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "6f92d630-38f4-4f61-ae24-2a8568b080bc",
    "template_name": "Investment Opportunity Alert",
    "category": "promotion",
    "subject_line": "New Distressed Property: {{property_address}}",
    "html_body": "<h2>New Investment Opportunity</h2><p>Hi {{first_name}},</p><p>A new distressed property just hit the market at <strong>{{property_address}}</strong>.</p><p><strong>Details:</strong></p><ul><li>Distressed Score: {{distressed_score}}</li><li>Estimated Repair Cost: ${{repair_cost}}</li><li>ARV: ${{arv}}</li></ul><p>Interested? Reply to this email or call me.</p>",
    "plain_text_body": "Hi {{first_name}},\n\nA new distressed property just hit the market at {{property_address}}.\n\nDetails:\n- Distressed Score: {{distressed_score}}\n- Estimated Repair Cost: ${{repair_cost}}\n- ARV: ${{arv}}\n\nInterested? Reply to this email or call me.",
    "available_variables": ["{{first_name}}", "{{property_address}}", "{{distressed_score}}", "{{repair_cost}}", "{{arv}}"]
  }'
```

### Test 2: Get All Templates

```bash
curl "https://real-estate-leads-api-00037-pcc-556658726901.us-east1.run.app/api/email-templates/6f92d630-38f4-4f61-ae24-2a8568b080bc"
```

### Test 3: AI-Assisted Content Generation

```bash
curl -X POST https://real-estate-leads-api-00037-pcc-556658726901.us-east1.run.app/api/email-templates/ai-assist \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write an email to a wholesaler about a new flip opportunity in Miami",
    "context": "Property needs $50k in repairs, ARV is $350k, asking $180k",
    "tone": "professional but excited"
  }'
```

### Test 4: Create Campaign

```bash
curl -X POST https://real-estate-leads-api-00037-pcc-556658726901.us-east1.run.app/api/email-campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "6f92d630-38f4-4f61-ae24-2a8568b080bc",
    "campaign_name": "Weekly Deals - Nov 25",
    "subject_line": "This Week'\''s Top 5 Investment Deals",
    "html_body": "<h2>Hi {{first_name}},</h2><p>Here are this week'\''s hottest deals...</p>",
    "plain_text_body": "Hi {{first_name}},\n\nHere are this week'\''s hottest deals...",
    "campaign_type": "manual",
    "recipients": [
      {
        "saved_lead_id": "305614a7-8576-43aa-8979-4d87d03a1d3e",
        "email": "test@example.com",
        "name": "Test Investor",
        "template_variables": {
          "first_name": "Test",
          "company_name": "Miami Property Investors"
        }
      }
    ]
  }'
```

### Test 5: Send Campaign

```bash
# Get campaign_id from Test 4 response
curl -X POST "https://real-estate-leads-api-00037-pcc-556658726901.us-east1.run.app/api/email-campaigns/CAMPAIGN_ID_HERE/send"
```

### Test 6: Configure SendGrid Webhook

1. Log into SendGrid console
2. Go to Settings → Mail Settings → Event Webhook
3. Enable Event Webhook
4. HTTP POST URL: `https://real-estate-leads-api-00037-pcc-556658726901.us-east1.run.app/api/email-campaigns/webhook/sendgrid`
5. Select events: Delivered, Opened, Clicked, Bounced, Unsubscribe
6. Click "Test Your Integration"
7. Save

### Test 7: Check Analytics

```bash
curl "https://real-estate-leads-api-00037-pcc-556658726901.us-east1.run.app/api/email-campaigns/analytics/CAMPAIGN_ID_HERE"
```

### Test 8: Verify Database

```sql
-- Check campaign created
SELECT 
  campaign_id,
  campaign_name,
  status,
  recipient_count,
  emails_sent,
  tokens_used
FROM email_campaigns
ORDER BY created_at DESC
LIMIT 5;

-- Check recipients
SELECT 
  recipient_email,
  send_status,
  sent_at,
  delivered_at,
  opened_at
FROM campaign_recipients
WHERE campaign_id = 'CAMPAIGN_ID_HERE';

-- Check token deduction
SELECT 
  action_type,
  tokens_used,
  reference_type,
  created_at
FROM token_usage_log
WHERE reference_type = 'campaign'
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ PART 3 COMPLETION CHECKLIST

- [ ] `routes/email-templates.js` created with full CRUD
- [ ] `routes/email-campaigns.js` created with sending logic
- [ ] SendGrid SDK installed
- [ ] Routes mounted in server.js
- [ ] Code deployed to Cloud Run
- [ ] SENDGRID_API_KEY environment variable set
- [ ] Custom template created successfully
- [ ] System templates accessible
- [ ] AI-assisted content generation works
- [ ] Campaign created with recipients
- [ ] Campaign sent successfully
- [ ] SendGrid webhook configured
- [ ] Email delivered and tracked
- [ ] Analytics showing correct data
- [ ] Tokens deducted correctly
- [ ] All API endpoints tested

---

## 🎯 SUCCESS CRITERIA

Email campaigns working when:
1. ✅ Templates can be created, edited, listed
2. ✅ AI can generate email content
3. ✅ Campaigns can be created with recipients
4. ✅ Emails send via SendGrid
5. ✅ Delivery, opens, clicks are tracked
6. ✅ Analytics show accurate metrics
7. ✅ Tokens deducted per email sent
8. ✅ SendGrid webhook updates recipient status

---

**Next:** Part 4 covers deployment checklist and completion report template

**Document prepared by:** AI Assistant  
**For developer:** Zencoder  
**Date:** November 24, 2025
