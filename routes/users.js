// Users Routes
const express = require('express');

const router = express.Router();

// POST /api/users - Create new user
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

// GET /api/users/:id - Get single user
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await req.pool.query(
      'SELECT user_id, email, subscription_tier, subscription_status, token_balance, created_at, last_login FROM users WHERE user_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('User lookup error:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      email,
      subscription_tier,
      subscription_status,
      token_balance,
      stripe_customer_id
    } = req.body;

    const result = await req.pool.query(
      `UPDATE users 
       SET email = COALESCE($1, email),
           subscription_tier = COALESCE($2, subscription_tier),
           subscription_status = COALESCE($3, subscription_status),
           token_balance = COALESCE($4, token_balance),
           stripe_customer_id = COALESCE($5, stripe_customer_id)
       WHERE user_id = $6
       RETURNING user_id, email, subscription_tier, subscription_status, token_balance, created_at, last_login`,
      [email, subscription_tier, subscription_status, token_balance, stripe_customer_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

module.exports = router;

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete related data first (cascade)
    await req.pool.query('DELETE FROM subscriber_profiles WHERE user_id = $1', [id]);
    await req.pool.query('DELETE FROM saved_leads WHERE user_id = $1', [id]);
    
    const result = await req.pool.query(
      'DELETE FROM users WHERE user_id = $1 RETURNING user_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'User and related data deleted',
      user_id: result.rows[0].user_id 
    });
  } catch (err) {
    console.error('User delete error:', err);
    res.status(500).json({ error: 'Database delete failed' });
  }
});
