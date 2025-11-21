// Admin Routes
// GET/PUT for pricing/tokens

const express = require('express');

const router = express.Router();

// Get token usage
router.get('/tokens', async (req, res) => {
  try {
    const result = await req.pool.query('SELECT user_id, token_balance FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error('Admin tokens query error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

// Update pricing (e.g., subscription prices)
router.put('/pricing', async (req, res) => {
  try {
    const { tier, price } = req.body;
    // Assume a pricing table or config
    res.json({ updated: true });
  } catch (err) {
    console.error('Admin pricing update error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;