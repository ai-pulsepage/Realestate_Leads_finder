// Profiles Routes
// POST /api/profiles - Create profile

const express = require('express');
const { pool } = require('../server');

const router = express.Router();

router.post('/', async (req, res) => {
  const { user_id, business_name, services_offered } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO subscriber_profiles (user_id, business_name, services_offered) VALUES ($1, $2, $3) RETURNING *',
      [user_id, business_name, services_offered]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;