// Admin Routes - Platform Management
const express = require('express');

const router = express.Router();

// GET /api/admin/stats - Platform statistics
router.get('/stats', async (req, res) => {
  try {
    // Get user statistics
    const userStats = await req.pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscribers,
        COUNT(*) FILTER (WHERE subscription_tier = 'contractor') as contractor_users,
        COUNT(*) FILTER (WHERE subscription_tier = 'investor') as investor_users,
        COUNT(*) FILTER (WHERE subscription_tier = 'combined') as combined_users,
        SUM(token_balance) as total_tokens_remaining
      FROM users
    `);

    // Get property statistics
    const propertyStats = await req.pool.query(`
      SELECT 
        COUNT(*) as total_properties,
        COUNT(*) FILTER (WHERE distressed_score >= 70) as high_distressed,
        COUNT(*) FILTER (WHERE property_type = 'Single Family') as single_family,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as added_this_week
      FROM properties
    `);

    // Get token usage statistics
    const tokenStats = await req.pool.query(`
      SELECT 
        COUNT(*) as total_actions,
        SUM(tokens_used) as total_tokens_used,
        action_type,
        COUNT(*) as action_count
      FROM token_usage_log
      GROUP BY action_type
      ORDER BY action_count DESC
      LIMIT 10
    `);

    // Get company statistics (for team accounts)
    const companyStats = await req.pool.query(`
      SELECT 
        COUNT(*) as total_companies,
        SUM(shared_token_balance) as total_company_tokens,
        AVG(max_seats) as avg_seats_per_company
      FROM companies
    `);

    res.json({
      users: userStats.rows[0],
      properties: propertyStats.rows[0],
      tokenUsage: {
        summary: {
          total_actions: tokenStats.rows.reduce((sum, row) => sum + parseInt(row.action_count), 0),
          total_tokens_used: tokenStats.rows.reduce((sum, row) => sum + parseInt(row.total_tokens_used || 0), 0)
        },
        byAction: tokenStats.rows
      },
      companies: companyStats.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/users - List all users with filters
router.get('/users', async (req, res) => {
  try {
    const { 
      subscription_tier, 
      subscription_status, 
      min_tokens,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = `
      SELECT 
        user_id,
        email,
        subscription_tier,
        subscription_status,
        token_balance,
        stripe_customer_id,
        created_at,
        last_login
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (subscription_tier) {
      params.push(subscription_tier);
      query += ` AND subscription_tier = $${params.length}`;
    }

    if (subscription_status) {
      params.push(subscription_status);
      query += ` AND subscription_status = $${params.length}`;
    }

    if (min_tokens) {
      params.push(min_tokens);
      query += ` AND token_balance >= $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await req.pool.query(query, params);
    
    // Get total count for pagination
    const countResult = await req.pool.query('SELECT COUNT(*) FROM users');
    
    res.json({
      users: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (err) {
    console.error('Admin users list error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id - Admin update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      subscription_status,
      token_balance,
      subscription_tier,
      admin_notes
    } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (subscription_status !== undefined) {
      params.push(subscription_status);
      updates.push(`subscription_status = $${params.length}`);
    }

    if (token_balance !== undefined) {
      params.push(token_balance);
      updates.push(`token_balance = $${params.length}`);
    }

    if (subscription_tier !== undefined) {
      params.push(subscription_tier);
      updates.push(`subscription_tier = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE user_id = $${params.length}
      RETURNING user_id, email, subscription_tier, subscription_status, token_balance
    `;

    const result = await req.pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (err) {
    console.error('Admin user update error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/admin/token-usage - Detailed token usage analytics
router.get('/token-usage', async (req, res) => {
  try {
    const { 
      days = 30,
      user_id,
      action_type 
    } = req.query;

    let query = `
      SELECT 
        tul.log_id,
        tul.user_id,
        u.email,
        tul.action_type,
        tul.tokens_used,
        tul.action_details,
        tul.created_at
      FROM token_usage_log tul
      LEFT JOIN users u ON tul.user_id = u.user_id
      WHERE tul.created_at > NOW() - INTERVAL '${parseInt(days)} days'
    `;
    const params = [];

    if (user_id) {
      params.push(user_id);
      query += ` AND tul.user_id = $${params.length}`;
    }

    if (action_type) {
      params.push(action_type);
      query += ` AND tul.action_type = $${params.length}`;
    }

    query += ` ORDER BY tul.created_at DESC LIMIT 100`;

    const result = await req.pool.query(query, params);

    res.json({
      usage: result.rows,
      summary: {
        days: parseInt(days),
        total_records: result.rows.length
      }
    });

  } catch (err) {
    console.error('Token usage query error:', err);
    res.status(500).json({ error: 'Failed to fetch token usage' });
  }
});

// Legacy endpoint (already exists)
router.get('/tokens', async (req, res) => {
  try {
    const result = await req.pool.query('SELECT user_id, token_balance FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error('Admin tokens query error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
});

module.exports = router;
