// Users Routes
// POST /api/users - Signup

const express = require('express');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { email, password_hash, subscription_tier } = req.body;
    const result = await req.pool.query(
      'INSERT INTO users (email, password_hash, subscription_tier) VALUES ($1, $2, $3) RETURNING *',
      [email, password_hash, subscription_tier]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('User creation error:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

module.exports = router;