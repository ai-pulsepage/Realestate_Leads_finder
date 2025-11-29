const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/token-pricing/cost/:action_type?quantity=X
// Returns the calculated cost for a specific action and quantity
router.get('/cost/:action_type', async (req, res) => {
    try {
        const { action_type } = req.params;
        const { quantity = 1 } = req.query;
        const qty = parseInt(quantity);

        if (isNaN(qty) || qty < 1) {
            return res.status(400).json({ error: 'Invalid quantity' });
        }

        // Fetch pricing from DB
        const result = await pool.query(
            'SELECT token_cost, description FROM token_pricing WHERE action_type = $1',
            [action_type]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Action type not found' });
        }

        const { token_cost, description } = result.rows[0];
        const total_cost = token_cost * qty;

        // Get user balance if authenticated (optional, but useful for frontend)
        let user_balance = null;
        if (req.user) {
            const userResult = await pool.query(
                'SELECT token_balance FROM users WHERE user_id = $1',
                [req.user.user_id]
            );
            if (userResult.rows.length > 0) {
                user_balance = userResult.rows[0].token_balance;
            }
        }

        res.json({
            action_type,
            unit_cost: token_cost,
            quantity: qty,
            total_cost,
            description,
            user_balance,
            sufficient_balance: user_balance !== null ? user_balance >= total_cost : null
        });

    } catch (error) {
        console.error('Error calculating token cost:', error);
        res.status(500).json({ error: 'Failed to calculate cost' });
    }
});

// PUT /api/token-pricing/update-cost
// Admin only: Update the cost of an action
router.put('/update-cost', async (req, res) => {
    try {
        // TODO: Add admin check middleware here
        const { action_type, new_cost } = req.body;

        if (!action_type || new_cost === undefined || new_cost < 0) {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const result = await pool.query(
            `INSERT INTO token_pricing (action_type, token_cost, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (action_type) 
             DO UPDATE SET token_cost = EXCLUDED.token_cost, updated_at = NOW()
             RETURNING *`,
            [action_type, new_cost]
        );

        res.json({
            message: 'Pricing updated successfully',
            pricing: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating token pricing:', error);
        res.status(500).json({ error: 'Failed to update pricing' });
    }
});

// GET /api/token-pricing/all
// Returns all pricing rules
router.get('/all', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM token_pricing ORDER BY action_type');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pricing:', error);
        res.status(500).json({ error: 'Failed to fetch pricing' });
    }
});

module.exports = router;
