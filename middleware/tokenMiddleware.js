// Token Middleware
// Deducts tokens based on action

const { pool } = require('../server');

const tokenMiddleware = (component) => {
  return async (req, res, next) => {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await pool.query('SELECT token_balance, token_preferences FROM users WHERE user_id = $1', [userId]);
    const balance = user.rows[0].token_balance;
    const prefs = user.rows[0].token_preferences[component] || {};

    if (balance < 1) return res.status(403).json({ error: 'Insufficient tokens' });

    // Deduct 1 token (adjust for action)
    await pool.query('UPDATE users SET token_balance = token_balance - 1 WHERE user_id = $1', [userId]);

    next();
  };
};

module.exports = tokenMiddleware;