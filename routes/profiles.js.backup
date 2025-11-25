// Profiles Routes
// POST /api/profiles - Create profile

const express = require('express');

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { user_id, business_name, services_offered } = req.body;
    const result = await req.pool.query(
      'INSERT INTO subscriber_profiles (user_id, business_name, services_offered) VALUES ($1, $2, $3) RETURNING *',
      [user_id, business_name, services_offered]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile creation error:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

module.exports = router;