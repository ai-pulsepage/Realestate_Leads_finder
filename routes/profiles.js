// Profiles Routes
const express = require('express');

const router = express.Router();

// POST /api/profiles - Create profile
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

// GET /api/profiles/:user_id - Get profile by user ID
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await req.pool.query(
      'SELECT * FROM subscriber_profiles WHERE user_id = $1',
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
      company_name,
      phone,
      website,
      services_offered,
      service_area,
      license_number
    } = req.body;

    const result = await req.pool.query(
      `UPDATE subscriber_profiles 
       SET business_name = COALESCE($1, business_name),
           company_name = COALESCE($2, company_name),
           phone = COALESCE($3, phone),
           website = COALESCE($4, website),
           services_offered = COALESCE($5, services_offered),
           service_area = COALESCE($6, service_area),
           license_number = COALESCE($7, license_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $8
       RETURNING *`,
      [business_name, company_name, phone, website, services_offered, service_area, license_number, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

module.exports = router;

// DELETE /api/profiles/:user_id - Delete profile
router.delete('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await req.pool.query(
      'DELETE FROM subscriber_profiles WHERE user_id = $1 RETURNING user_id',
      [user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({ 
      success: true, 
      message: 'Profile deleted',
      user_id: result.rows[0].user_id 
    });
  } catch (err) {
    console.error('Profile delete error:', err);
    res.status(500).json({ error: 'Database delete failed' });
  }
});
