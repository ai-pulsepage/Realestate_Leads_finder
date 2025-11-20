// Admin Routes
// GET/PUT for pricing/tokens

const express = require('express');
const { pool } = require('../server');

const router = express.Router();

// Get token usage
router.get('/tokens', async (req, res) => {
  const result = await pool.query('SELECT user_id, token_balance FROM users');
  res.json(result.rows);
});

// Update pricing (e.g., subscription prices)
router.put('/pricing', async (req, res) => {
  const { tier, price } = req.body;
  // Assume a pricing table or config
  res.json({ updated: true });
});

module.exports = router;