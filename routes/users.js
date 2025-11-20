// Users Routes
// POST /api/users - Signup

const express = require('express');
const { pool } = require('../server');

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password_hash, subscription_tier } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, subscription_tier) VALUES ($1, $2, $3) RETURNING *',
      [email, password_hash, subscription_tier]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;