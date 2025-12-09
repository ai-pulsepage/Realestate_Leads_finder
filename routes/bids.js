const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// POST /api/bids - Submit a bid
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { project_id, amount, proposal_text } = req.body;
        const provider_id = req.user.user_id;
        const BID_COST = 5; // Fixed cost for MVP

        await client.query('BEGIN');

        // 1. Check Token Balance
        const userRes = await client.query('SELECT token_balance FROM users WHERE user_id = $1', [provider_id]);
        const currentBalance = userRes.rows[0].token_balance || 0;

        if (currentBalance < BID_COST) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Insufficient tokens', required: BID_COST, current: currentBalance });
        }

        // 2. Deduct Tokens
        await client.query('UPDATE users SET token_balance = token_balance - $1 WHERE user_id = $2', [BID_COST, provider_id]);

        // 3. Insert Bid
        const result = await client.query(
            `INSERT INTO bids (project_id, provider_id, amount, proposal_text)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [project_id, provider_id, amount, proposal_text]
        );

        // 4. Log Transaction (Optional but recommended)
        // await client.query(...)

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Bid submitted successfully',
            bid: result.rows[0],
            new_balance: currentBalance - BID_COST
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to submit bid' });
    } finally {
        client.release();
    }
});

// GET /api/bids/my-bids - List bids by provider
router.get('/my-bids', async (req, res) => {
    try {
        const provider_id = req.user.user_id;
        const result = await pool.query(
            `SELECT b.*, p.title as project_title, p.status as project_status 
             FROM bids b
             JOIN projects p ON b.project_id = p.project_id
             WHERE b.provider_id = $1
             ORDER BY b.created_at DESC`,
            [provider_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
