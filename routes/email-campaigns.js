/**
 * EMAIL CAMPAIGNS ROUTES
 * Create, manage, and queue email campaigns
 */

const express = require('express');
const router = express.Router();

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

        const result = await req.pool.query(query, queryParams);

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

        const campaignQuery = await req.pool.query(`
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
        const recipientsQuery = await req.pool.query(`
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
        const balanceQuery = await req.pool.query(
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
        const campaignResult = await req.pool.query(`
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

            await req.pool.query(`
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
// Queue campaign for sending
// ============================================================

router.post('/:campaign_id/send', async (req, res) => {
    try {
        const { campaign_id } = req.params;

        // Get campaign details
        const campaignQuery = await req.pool.query(`
      SELECT status FROM email_campaigns WHERE campaign_id = $1
    `, [campaign_id]);

        if (campaignQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Campaign not found'
            });
        }

        const campaign = campaignQuery.rows[0];

        if (campaign.status === 'sent' || campaign.status === 'sending' || campaign.status === 'queued') {
            return res.status(400).json({
                success: false,
                message: `Campaign is already ${campaign.status}`
            });
        }

        // Update campaign status to 'queued'
        // The Background Worker will pick this up
        await req.pool.query(`
      UPDATE email_campaigns
      SET status = 'queued'
      WHERE campaign_id = $1
    `, [campaign_id]);

        console.log('✅ Campaign queued:', campaign_id);

        res.json({
            success: true,
            message: 'Campaign queued for sending'
        });

    } catch (error) {
        console.error('❌ Error queuing campaign:', error);
        res.status(500).json({
            success: false,
            message: 'Error queuing campaign',
            error: error.message
        });
    }
});

module.exports = router;
