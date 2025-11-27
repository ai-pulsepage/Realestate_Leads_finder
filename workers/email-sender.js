/**
 * EMAIL SENDER WORKER
 * Polls for queued campaigns and sends emails via SendGrid
 * Run this with: node workers/email-sender.js
 */

require('dotenv').config({
    path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

const { pool } = require('../config/database');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
    console.warn('⚠️ SENDGRID_API_KEY not set. Worker will fail to send.');
}

const BATCH_SIZE = 50; // Process 50 recipients at a time
const POLL_INTERVAL = 10000; // Check every 10 seconds

async function processCampaigns() {
    try {
        // 1. Find a queued campaign
        // We use FOR UPDATE SKIP LOCKED to allow multiple workers (future proofing)
        const campaignResult = await pool.query(`
      UPDATE email_campaigns
      SET status = 'sending', sent_at = NOW()
      WHERE campaign_id = (
        SELECT campaign_id
        FROM email_campaigns
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `);

        if (campaignResult.rows.length === 0) {
            // No campaigns to process
            return;
        }

        const campaign = campaignResult.rows[0];
        console.log(`🚀 Starting Campaign: ${campaign.campaign_name} (${campaign.campaign_id})`);

        // 2. Fetch recipients
        const recipientsQuery = await pool.query(`
      SELECT * FROM campaign_recipients
      WHERE campaign_id = $1 AND send_status = 'pending'
    `, [campaign.campaign_id]);

        const recipients = recipientsQuery.rows;
        console.log(`   Found ${recipients.length} recipients.`);

        // 3. Send in batches
        let sentCount = 0;
        let failedCount = 0;

        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
            const batch = recipients.slice(i, i + BATCH_SIZE);

            await Promise.all(batch.map(async (recipient) => {
                try {
                    // Personalize
                    let html = campaign.html_body;
                    let subject = campaign.subject_line;
                    const vars = recipient.template_variables || {};

                    for (const [key, value] of Object.entries(vars)) {
                        const regex = new RegExp(`{{${key}}}`, 'g');
                        html = html.replace(regex, value);
                        subject = subject.replace(regex, value);
                    }

                    const msg = {
                        to: recipient.recipient_email,
                        from: campaign.from_email || process.env.SENDGRID_FROM_EMAIL || 'noreply@bizleadfinders.com',
                        subject: subject,
                        html: html,
                        text: campaign.plain_text_body || html.replace(/<[^>]*>/g, ''),
                        customArgs: {
                            campaign_id: campaign.campaign_id,
                            recipient_id: recipient.recipient_id
                        }
                    };

                    const result = await sgMail.send(msg);
                    const messageId = result[0].headers['x-message-id'];

                    // Update recipient success
                    await pool.query(`
            UPDATE campaign_recipients
            SET send_status = 'sent', sendgrid_message_id = $1, sent_at = NOW()
            WHERE recipient_id = $2
          `, [messageId, recipient.recipient_id]);

                    sentCount++;

                } catch (err) {
                    console.error(`   ❌ Failed to send to ${recipient.recipient_email}:`, err.message);

                    // Update recipient failure
                    await pool.query(`
            UPDATE campaign_recipients
            SET send_status = 'failed', error_message = $1
            WHERE recipient_id = $2
          `, [err.message, recipient.recipient_id]);

                    failedCount++;
                }
            }));

            console.log(`   Processed batch ${i / BATCH_SIZE + 1}. Sent: ${sentCount}, Failed: ${failedCount}`);
        }

        // 4. Finish Campaign
        await pool.query(`
      UPDATE email_campaigns
      SET 
        status = 'sent', 
        emails_sent = $1
      WHERE campaign_id = $2
    `, [sentCount, campaign.campaign_id]);

        console.log(`✅ Campaign Completed. Sent: ${sentCount}, Failed: ${failedCount}`);

    } catch (error) {
        console.error('❌ Worker Error:', error);
    }
}

// Start Polling
console.log('👷 Email Worker Started. Polling every 10s...');
setInterval(processCampaigns, POLL_INTERVAL);
processCampaigns(); // Run immediately on start
