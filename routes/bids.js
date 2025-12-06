const express = require('express');
const router = express.Router();

// POST /api/bids - Submit a bid
router.post('/', async (req, res) => {
    try {
        const { project_id, provider_id, amount, proposal_text, estimated_days } = req.body;

        const result = await req.pool.query(
            `INSERT INTO bids (project_id, provider_id, amount, proposal_text, estimated_days)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [project_id, provider_id, amount, proposal_text, estimated_days]
        );

        // TODO: Trigger email notification to homeowner here

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Bid submission error:', err);
        res.status(500).json({ error: 'Failed to submit bid' });
    }
});

// GET /api/bids/provider/:provider_id - Get my bids
router.get('/provider/:provider_id', async (req, res) => {
    try {
        const { provider_id } = req.params;
        const result = await req.pool.query(
            `SELECT b.*, p.title as project_title, p.status as project_status
       FROM bids b
       JOIN projects p ON b.project_id = p.project_id
       WHERE b.provider_id = $1
       ORDER BY b.created_at DESC`,
            [provider_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('My bids error:', err);
        res.status(500).json({ error: 'Failed to fetch bids' });
    }
});

// GET /api/bids/project/:project_id - Get bids for a project (Homeowner view)
router.get('/project/:project_id', async (req, res) => {
    try {
        const { project_id } = req.params;
        const result = await req.pool.query(
            `SELECT b.*, pr.business_name as provider_name, pr.avatar_url, pr.license_verified
       FROM bids b
       JOIN profiles pr ON b.provider_id = pr.profile_id
       WHERE b.project_id = $1
       ORDER BY b.amount ASC`,
            [project_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Project bids error:', err);
        res.status(500).json({ error: 'Failed to fetch bids' });
    }
});

module.exports = router;
