// Token Middleware
// Deducts tokens based on action type and quantity
const { pool } = require('../config/database');

/**
 * Middleware to check balance and deduct tokens
 * @param {string} actionType - The key in token_pricing table (e.g., 'email_send')
 * @param {number|function} quantity - Number of units or function(req) returning number
 */
const tokenMiddleware = (actionType, quantity = 1) => {
  return async (req, res, next) => {
    console.log('🔍 TokenMiddleware Debug:');
    console.log('User:', JSON.stringify(req.user));

    // routes/auth.js signs with 'userId', so we must use that.
    const userId = req.user?.userId;

    if (!userId) {
      console.error('❌ TokenMiddleware: Missing userId in req.user');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // 1. Determine Quantity
      let qty = 1;
      if (typeof quantity === 'function') {
        qty = quantity(req);
      } else {
        qty = quantity;
      }

      if (qty <= 0) return next(); // No cost for 0 items

      // 2. Get Pricing
      const priceResult = await pool.query(
        'SELECT token_cost FROM token_pricing WHERE action_type = $1',
        [actionType]
      );

      if (priceResult.rows.length === 0) {
        console.error(`Token pricing not found for action: ${actionType}`);
        return res.status(500).json({ error: 'System configuration error' });
      }

      const unitCost = priceResult.rows[0].token_cost;
      const totalCost = unitCost * qty;

      // 3. Check Balance
      const userResult = await pool.query(
        'SELECT token_balance FROM users WHERE user_id = $1',
        [userId]
      );

      const currentBalance = userResult.rows[0].token_balance;

      if (currentBalance < totalCost) {
        return res.status(402).json({
          error: 'Insufficient tokens',
          required: totalCost,
          balance: currentBalance
        });
      }

      // 4. Deduct Tokens
      await pool.query(
        'UPDATE users SET token_balance = token_balance - $1 WHERE user_id = $2',
        [totalCost, userId]
      );

      // 5. Log Usage
      const logResult = await pool.query(
        `INSERT INTO token_usage_logs (user_id, action_type, tokens_deducted, metadata)
         VALUES ($1, $2, $3, $4) RETURNING log_id`,
        [userId, actionType, totalCost, JSON.stringify({ quantity: qty, unit_cost: unitCost })]
      );

      // Attach usage info to request for downstream use (e.g. updating resource_id later)
      req.tokenUsage = {
        logId: logResult.rows[0].log_id,
        deducted: totalCost,
        actionType
      };

      next();

    } catch (error) {
      console.error('Token Middleware Error:', error);
      res.status(500).json({ error: 'Token processing failed' });
    }
  };
};

module.exports = tokenMiddleware;