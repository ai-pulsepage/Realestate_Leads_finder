// Profiles Routes
const express = require('express');
const router = express.Router();

// GET /api/profiles/:user_id - Get profile by user ID
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await req.pool.query(
      `SELECT p.*, u.email, u.full_name 
       FROM profiles p 
       JOIN users u ON p.user_id = u.user_id 
       WHERE p.user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile lookup error:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// PUT /api/profiles/:user_id - Update profile
router.put('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const {
      business_name,
      bio,
      website,
      phone,
      avatar_url,
      license_number,
      trades, // Array
      service_area_radius_miles,
      service_zip_codes, // Array
      investment_focus // Array
    } = req.body;

    // Upsert profile (Create if not exists, else update)
    const result = await req.pool.query(
      `INSERT INTO profiles (
         user_id, business_name, bio, website, phone, avatar_url, 
         license_number, trades, service_area_radius_miles, service_zip_codes, investment_focus,
         user_type
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'provider')
       ON CONFLICT (user_id) DO UPDATE SET
         business_name = EXCLUDED.business_name,
         bio = EXCLUDED.bio,
         website = EXCLUDED.website,
         phone = EXCLUDED.phone,
         avatar_url = EXCLUDED.avatar_url,
         license_number = EXCLUDED.license_number,
         trades = EXCLUDED.trades,
         service_area_radius_miles = EXCLUDED.service_area_radius_miles,
         service_zip_codes = EXCLUDED.service_zip_codes,
         investment_focus = EXCLUDED.investment_focus,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        user_id, business_name, bio, website, phone, avatar_url,
        license_number, trades, service_area_radius_miles, service_zip_codes, investment_focus
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// POST /api/profiles/:provider_id/reviews - Add a review
router.post('/:provider_id/reviews', async (req, res) => {
  try {
    const { provider_id } = req.params;
    const { rating, comment, author_id, author_name } = req.body;

    const result = await req.pool.query(
      `INSERT INTO reviews (provider_id, author_id, rating, comment, author_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [provider_id, author_id || null, rating, comment, author_name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Review creation error:', err);
    res.status(500).json({ error: 'Failed to add review' });
  }
});

// GET /api/profiles/:provider_id/reviews - Get reviews
router.get('/:provider_id/reviews', async (req, res) => {
  try {
    const { provider_id } = req.params;
    const result = await req.pool.query(
      `SELECT * FROM reviews WHERE provider_id = $1 ORDER BY created_at DESC`,
      [provider_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Review lookup error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

module.exports = router;
