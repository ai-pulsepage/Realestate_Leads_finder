const { pool } = require('../config/database');

class QueueService {
    /**
     * Add a batch of leads to the campaign queue
     * @param {string} campaignId 
     * @param {string} userId 
     * @param {Array} leads Array of { phone, name, id }
     */
    async addToQueue(campaignId, userId, leads) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const query = `
        INSERT INTO campaign_queue (campaign_id, user_id, lead_phone_number, lead_name, lead_id)
        VALUES ($1, $2, $3, $4, $5)
      `;

            for (const lead of leads) {
                await client.query(query, [
                    campaignId,
                    userId,
                    lead.phone,
                    lead.name || 'Valued Homeowner',
                    lead.id || null
                ]);
            }

            await client.query('COMMIT');
            return { success: true, count: leads.length };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error adding to queue:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get the next batch of pending calls
     * @param {number} limit 
     */
    async getNextBatch(limit = 10) {
        // Select items that are pending OR (failed AND attempts < 3)
        // AND next_attempt_after is in the past
        const query = `
      UPDATE campaign_queue
      SET status = 'processing', updated_at = NOW()
      WHERE queue_id IN (
        SELECT queue_id
        FROM campaign_queue
        WHERE (status = 'pending' OR (status = 'failed' AND attempt_count < 3))
          AND next_attempt_after <= NOW()
        ORDER BY next_attempt_after ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

        try {
            const result = await pool.query(query, [limit]);
            return result.rows;
        } catch (error) {
            console.error('Error fetching batch:', error);
            return [];
        }
    }

    /**
     * Update the status of a queue item
     * @param {string} queueId 
     * @param {string} status 
     * @param {object} details { callSid, outcome }
     */
    async updateStatus(queueId, status, details = {}) {
        const { callSid, outcome } = details;

        let nextAttemptUpdate = '';
        if (status === 'failed' || status === 'no_answer') {
            // Retry in 1 hour
            nextAttemptUpdate = ", next_attempt_after = NOW() + INTERVAL '1 hour', attempt_count = attempt_count + 1";
        } else if (status === 'completed') {
            // No more attempts
            nextAttemptUpdate = ", next_attempt_after = NULL";
        }

        const query = `
      UPDATE campaign_queue
      SET 
        status = $1, 
        call_sid = COALESCE($2, call_sid),
        call_outcome = COALESCE($3, call_outcome),
        last_attempt_at = NOW()
        ${nextAttemptUpdate}
      WHERE queue_id = $4
    `;

        await pool.query(query, [status, callSid, outcome, queueId]);
    }
}

module.exports = new QueueService();
