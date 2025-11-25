# TOKEN SYSTEM SPECIFICATION
## USAGE-BASED MONETIZATION MODEL

**Document Version:** 1.0  
**Last Updated:** November 14, 2025

---

## OVERVIEW

The token system provides flexible, usage-based monetization separate from subscriptions. Subscribers use tokens to access AI services (voice calls, chat, email, SMS) and data enrichment (contact lookup).

### KEY PRINCIPLES
- Tokens do NOT expire (rollover monthly)
- Base allocation included with subscription
- Purchasable in bundles
- Admin-adjustable pricing
- Real-time tracking and deduction
- Refund/grant capability for admin

---

## TOKEN ECONOMICS

### Base Allocations (Included in Subscription)

**Contractor Plan ($49/month):**
- 10,000 tokens/month base allocation
- Sufficient for: 500 voice calls OR 2,000 chat sessions OR 10,000 emails

**Investor Plan ($49/month):**
- 10,000 tokens/month base allocation
- Sufficient for: 500 voice calls OR 2,000 chat sessions OR 10,000 emails

**Full Plan ($98/month):**
- 15,000 tokens/month base allocation
- Sufficient for: 750 voice calls OR 3,000 chat sessions OR 15,000 emails

### Purchasable Bundles (Admin-Adjustable)

| Bundle | Tokens | Price | Cost per Token |
|--------|--------|-------|----------------|
| Small | 10,000 | $10.00 | $0.001 |
| Medium | 25,000 | $20.00 | $0.0008 |
| Large | 50,000 | $35.00 | $0.0007 |
| XL | 100,000 | $60.00 | $0.0006 |

---

## TOKEN COSTS BY ACTION

### AI Services

**Voice Call (3 minutes average):**
- Token Cost: 20 tokens
- Actual Cost to Us: $0.0018 (Gemini 2.5 Flash TTS)
- Revenue per Call: $0.02 (20 tokens x $0.001)
- Gross Margin: 1011%

**AI Chat (1,000 tokens):**
- Token Cost: 5 tokens
- Actual Cost to Us: $0.0002 (Together.ai Llama)
- Revenue: $0.005 (5 tokens x $0.001)
- Gross Margin: 2400%

**SMS Send:**
- Token Cost: 10 tokens
- Actual Cost to Us: $0.0075 (Twilio)
- Revenue: $0.01 (10 tokens x $0.001)
- Gross Margin: 33%

**Email Send:**
- Token Cost: 1 token
- Actual Cost to Us: $0.0001 (SendGrid)
- Revenue: $0.001 (1 token x $0.001)
- Gross Margin: 900%

### Data Services

**Contact Enrichment (Skip Trace):**
- Token Cost: 50 tokens
- Actual Cost to Us: $0.01 (BatchData API)
- Revenue: $0.05 (50 tokens x $0.001)
- Gross Margin: 400%

---

## TECHNICAL IMPLEMENTATION

### Token Deduction Flow

```
User Action (e.g., "Call This Lead")
    |
    v
tokenMiddleware checks balance
    |
    |- Balance sufficient? YES -> Continue
    |                      NO  -> Return 402 Insufficient Tokens
    v
Deduct tokens from user balance (UPDATE users SET token_balance = token_balance - X)
    |
    v
Log usage (INSERT INTO token_usage_logs)
    |
    v
Execute action (AI call, email, etc.)
    |
    v
Log actual cost incurred
    |
    v
Update company_token_pool
```

### Database Schema

**users.token_balance**
- Current token balance
- Updated in real-time on each action
- Never negative (checked by middleware)

**users.token_preferences**
```json
{
  "daily_limit": null,           // Max tokens per day (null = unlimited)
  "auto_recharge": false,         // Auto-purchase when low
  "recharge_threshold": 0,        // Trigger purchase at X tokens
  "recharge_amount": 0            // Purchase X tokens automatically
}
```

**token_pricing**
- Maps action_type to tokens_required
- Admin-adjustable via admin panel
- Used by tokenMiddleware for deduction logic

**token_usage_logs**
- Tracks every token deduction
- Links to user_id and action_type
- Stores actual_cost for margin calculation

**company_token_pool**
- Aggregate tracking of all token activity
- Reconciles purchased vs consumed tokens
- Used for financial reporting

**token_transactions**
- Records purchases, grants, refunds
- Auditable history of all token movements
- Links to admin_user_id for admin actions

---

## TOKEN MIDDLEWARE

### Implementation

```javascript
// middleware/tokenMiddleware.js

const { pool } = require('../config/database');

function token_middleware(tokens_required) {
  return async (req, res, next) => {
    try {
      const user_id = req.user.user_id;
      
      // Fetch user token data
      const { rows } = await pool.query(
        'SELECT token_balance, token_preferences FROM users WHERE user_id = $1',
        [user_id]
      );
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = rows[0];
      const prefs = user.token_preferences;
      
      // Check daily limit if set
      if (prefs.daily_limit) {
        const { rows: usage } = await pool.query(
          `SELECT SUM(tokens_used) as used_today 
           FROM token_usage_logs 
           WHERE user_id = $1 AND DATE(timestamp) = CURRENT_DATE`,
          [user_id]
        );
        
        const used_today = usage[0].used_today || 0;
        
        if (used_today + tokens_required > prefs.daily_limit) {
          return res.status(429).json({
            error: 'Daily token limit reached',
            limit: prefs.daily_limit,
            used_today: used_today,
            available_tomorrow: true
          });
        }
      }
      
      // Check balance
      if (user.token_balance < tokens_required) {
        return res.status(402).json({
          error: 'Insufficient tokens',
          required: tokens_required,
          balance: user.token_balance,
          shortfall: tokens_required - user.token_balance,
          purchase_url: '/tokens/purchase'
        });
      }
      
      // Deduct tokens
      await pool.query(
        'UPDATE users SET token_balance = token_balance - $1 WHERE user_id = $2',
        [tokens_required, user_id]
      );
      
      // Log usage (actual cost will be updated after action completes)
      const { rows: log } = await pool.query(
        `INSERT INTO token_usage_logs (user_id, action_type, tokens_used) 
         VALUES ($1, $2, $3)
         RETURNING log_id`,
        [user_id, req.path, tokens_required]
      );
      
      // Attach log_id to request for cost tracking
      req.token_log_id = log[0].log_id;
      req.tokens_used = tokens_required;
      
      next();
      
    } catch (error) {
      console.error('Token middleware error:', error);
      res.status(500).json({ error: 'Token processing failed' });
    }
  };
}

module.exports = { token_middleware };
```

### Usage in Routes

```javascript
// routes/ai.js

const { token_middleware } = require('../middleware/tokenMiddleware');
const { get_token_cost } = require('../utils/token_pricing');

// Voice call endpoint
router.post('/voice/call-lead', 
  auth_middleware, 
  async (req, res, next) => {
    // Dynamic token calculation based on estimated call length
    const estimated_duration = req.body.estimated_duration || 180; // seconds
    const tokens = await get_token_cost('ai_voice_call', estimated_duration);
    req.tokens_required = tokens;
    next();
  },
  token_middleware(20), // Default 3-min call
  async (req, res) => {
    // Execute voice call
    const result = await make_ai_voice_call(req.body);
    
    // Update actual cost
    await pool.query(
      'UPDATE token_usage_logs SET actual_cost = $1 WHERE log_id = $2',
      [result.cost, req.token_log_id]
    );
    
    res.json({ success: true, call_id: result.call_id });
  }
);

// Chat endpoint
router.post('/chat', 
  auth_middleware,
  token_middleware(5), // Per 1K tokens
  async (req, res) => {
    const response = await generate_chat_response(req.body.message, req.user);
    
    // Update actual cost
    await pool.query(
      'UPDATE token_usage_logs SET actual_cost = $1 WHERE log_id = $2',
      [response.cost, req.token_log_id]
    );
    
    res.json({ message: response.text });
  }
);
```

---

## TOKEN PURCHASE FLOW

### Stripe Integration

```javascript
// routes/tokens.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Purchase tokens
router.post('/tokens/purchase', auth_middleware, async (req, res) => {
  try {
    const { bundle_id } = req.body;
    
    // Fetch bundle details
    const { rows } = await pool.query(
      'SELECT * FROM token_bundles WHERE bundle_id = $1 AND is_active = TRUE',
      [bundle_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    const bundle = rows[0];
    
    // Create Stripe payment intent
    const payment_intent = await stripe.paymentIntents.create({
      amount: Math.round(bundle.price * 100), // Convert to cents
      currency: 'usd',
      customer: req.user.stripe_customer_id,
      metadata: {
        user_id: req.user.user_id,
        bundle_id: bundle_id,
        token_amount: bundle.token_amount
      }
    });
    
    res.json({
      client_secret: payment_intent.client_secret,
      bundle: {
        name: bundle.bundle_name,
        tokens: bundle.token_amount,
        price: bundle.price
      }
    });
    
  } catch (error) {
    console.error('Token purchase error:', error);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// Stripe webhook handler
router.post('/tokens/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Handle successful payment
  if (event.type === 'payment_intent.succeeded') {
    const payment_intent = event.data.object;
    const { user_id, token_amount } = payment_intent.metadata;
    
    // Add tokens to user balance
    await pool.query(
      'UPDATE users SET token_balance = token_balance + $1 WHERE user_id = $2',
      [token_amount, user_id]
    );
    
    // Log purchase
    await pool.query(
      `INSERT INTO token_purchases (user_id, tokens, amount_paid, stripe_payment_intent_id)
       VALUES ($1, $2, $3, $4)`,
      [user_id, token_amount, payment_intent.amount / 100, payment_intent.id]
    );
    
    // Log transaction
    await pool.query(
      `INSERT INTO token_transactions (user_id, transaction_type, tokens_amount, description)
       VALUES ($1, 'purchase', $2, 'Token bundle purchase')`,
      [user_id, token_amount]
    );
    
    // Update company pool
    await pool.query(
      `UPDATE company_token_pool 
       SET tokens_purchased = tokens_purchased + $1, 
           total_tokens = total_tokens + $1,
           updated_at = NOW()`,
      [token_amount]
    );
  }
  
  res.json({ received: true });
});
```

---

## ADMIN CONTROLS

### Grant/Refund Tokens

```javascript
// routes/admin.js

router.post('/admin/tokens/grant', admin_auth_middleware, async (req, res) => {
  try {
    const { user_id, tokens, reason } = req.body;
    
    // Add tokens
    await pool.query(
      'UPDATE users SET token_balance = token_balance + $1 WHERE user_id = $2',
      [tokens, user_id]
    );
    
    // Log transaction
    await pool.query(
      `INSERT INTO token_transactions 
       (user_id, transaction_type, tokens_amount, description, admin_user_id)
       VALUES ($1, 'grant', $2, $3, $4)`,
      [user_id, tokens, reason, req.user.user_id]
    );
    
    // Audit log
    await pool.query(
      `INSERT INTO admin_audit_logs 
       (admin_user_id, action, target_entity, target_id, changes)
       VALUES ($1, 'grant_tokens', 'user', $2, $3)`,
      [req.user.user_id, user_id, JSON.stringify({ tokens, reason })]
    );
    
    res.json({ success: true, message: `Granted ${tokens} tokens to user` });
    
  } catch (error) {
    console.error('Grant tokens error:', error);
    res.status(500).json({ error: 'Failed to grant tokens' });
  }
});

router.post('/admin/tokens/deduct', admin_auth_middleware, async (req, res) => {
  try {
    const { user_id, tokens, reason } = req.body;
    
    // Check balance first
    const { rows } = await pool.query(
      'SELECT token_balance FROM users WHERE user_id = $1',
      [user_id]
    );
    
    if (rows[0].token_balance < tokens) {
      return res.status(400).json({ error: 'User has insufficient tokens' });
    }
    
    // Deduct tokens
    await pool.query(
      'UPDATE users SET token_balance = token_balance - $1 WHERE user_id = $2',
      [tokens, user_id]
    );
    
    // Log transaction
    await pool.query(
      `INSERT INTO token_transactions 
       (user_id, transaction_type, tokens_amount, description, admin_user_id)
       VALUES ($1, 'deduct', $2, $3, $4)`,
      [user_id, -tokens, reason, req.user.user_id]
    );
    
    res.json({ success: true, message: `Deducted ${tokens} tokens from user` });
    
  } catch (error) {
    console.error('Deduct tokens error:', error);
    res.status(500).json({ error: 'Failed to deduct tokens' });
  }
});
```

### Update Token Pricing

```javascript
router.put('/admin/tokens/pricing', admin_auth_middleware, async (req, res) => {
  try {
    const { action_type, tokens_required, actual_cost_usd } = req.body;
    
    await pool.query(
      `UPDATE token_pricing 
       SET tokens_required = $1, actual_cost_usd = $2, updated_at = NOW()
       WHERE action_type = $3`,
      [tokens_required, actual_cost_usd, action_type]
    );
    
    // Audit log
    await pool.query(
      `INSERT INTO admin_audit_logs 
       (admin_user_id, action, target_entity, target_id, changes)
       VALUES ($1, 'update_token_pricing', 'token_pricing', $2, $3)`,
      [req.user.user_id, action_type, JSON.stringify(req.body)]
    );
    
    res.json({ success: true, message: 'Token pricing updated' });
    
  } catch (error) {
    console.error('Update pricing error:', error);
    res.status(500).json({ error: 'Failed to update pricing' });
  }
});
```

---

## REPORTING & ANALYTICS

### User Token Dashboard

```javascript
// routes/tokens.js

router.get('/tokens/balance', auth_middleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT 
       u.token_balance,
       u.token_preferences,
       COALESCE(SUM(tul.tokens_used), 0) as tokens_used_today,
       COALESCE(SUM(CASE WHEN tul.timestamp >= NOW() - INTERVAL '30 days' 
                    THEN tul.tokens_used ELSE 0 END), 0) as tokens_used_30_days
     FROM users u
     LEFT JOIN token_usage_logs tul ON u.user_id = tul.user_id
     WHERE u.user_id = $1
     GROUP BY u.user_id`,
    [req.user.user_id]
  );
  
  res.json(rows[0]);
});

router.get('/tokens/usage-history', auth_middleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT 
       action_type,
       tokens_used,
       actual_cost,
       timestamp
     FROM token_usage_logs
     WHERE user_id = $1
     ORDER BY timestamp DESC
     LIMIT 100`,
    [req.user.user_id]
  );
  
  res.json({ history: rows });
});
```

### Admin Analytics

```javascript
router.get('/admin/tokens/analytics', admin_auth_middleware, async (req, res) => {
  const analytics = await pool.query(`
    SELECT 
      COUNT(DISTINCT user_id) as total_users_with_tokens,
      SUM(token_balance) as total_tokens_in_circulation,
      AVG(token_balance) as avg_tokens_per_user,
      (SELECT SUM(tokens) FROM token_purchases WHERE purchased_at >= NOW() - INTERVAL '30 days') as tokens_sold_30_days,
      (SELECT SUM(amount_paid) FROM token_purchases WHERE purchased_at >= NOW() - INTERVAL '30 days') as revenue_30_days,
      (SELECT SUM(tokens_used) FROM token_usage_logs WHERE timestamp >= NOW() - INTERVAL '30 days') as tokens_consumed_30_days,
      (SELECT SUM(actual_cost) FROM token_usage_logs WHERE timestamp >= NOW() - INTERVAL '30 days') as actual_costs_30_days
    FROM users
    WHERE token_balance > 0
  `);
  
  const breakdown = await pool.query(`
    SELECT 
      action_type,
      COUNT(*) as usage_count,
      SUM(tokens_used) as total_tokens,
      SUM(actual_cost) as total_cost
    FROM token_usage_logs
    WHERE timestamp >= NOW() - INTERVAL '30 days'
    GROUP BY action_type
    ORDER BY total_tokens DESC
  `);
  
  res.json({
    overview: analytics.rows[0],
    breakdown_by_action: breakdown.rows
  });
});
```

---

## AUTO-RECHARGE FEATURE

### Configuration

```javascript
// User enables auto-recharge
router.put('/tokens/auto-recharge', auth_middleware, async (req, res) => {
  const { enabled, threshold, amount } = req.body;
  
  await pool.query(
    `UPDATE users 
     SET token_preferences = jsonb_set(
       jsonb_set(
         jsonb_set(token_preferences, '{auto_recharge}', $1::text::jsonb),
         '{recharge_threshold}', $2::text::jsonb
       ),
       '{recharge_amount}', $3::text::jsonb
     )
     WHERE user_id = $4`,
    [enabled, threshold, amount, req.user.user_id]
  );
  
  res.json({ success: true, message: 'Auto-recharge settings updated' });
});
```

### Trigger Logic

```javascript
// In tokenMiddleware, after deduction
if (user.token_preferences.auto_recharge && 
    new_balance < user.token_preferences.recharge_threshold) {
  
  // Trigger auto-purchase
  await trigger_auto_purchase(
    req.user.user_id,
    user.token_preferences.recharge_amount
  );
}

async function trigger_auto_purchase(user_id, token_amount) {
  // Find matching bundle
  const { rows } = await pool.query(
    'SELECT * FROM token_bundles WHERE token_amount >= $1 ORDER BY token_amount ASC LIMIT 1',
    [token_amount]
  );
  
  if (rows.length === 0) return;
  
  const bundle = rows[0];
  
  // Charge via Stripe (using saved payment method)
  const payment_intent = await stripe.paymentIntents.create({
    amount: Math.round(bundle.price * 100),
    currency: 'usd',
    customer: user.stripe_customer_id,
    payment_method: user.default_payment_method_id,
    off_session: true,
    confirm: true,
    metadata: {
      user_id: user_id,
      auto_recharge: true,
      token_amount: bundle.token_amount
    }
  });
  
  // Tokens will be added via webhook
}
```

---

## BEST PRACTICES

### For Subscribers
1. Monitor token balance regularly
2. Set daily limits to prevent accidental overuse
3. Purchase bundles in advance for better rates
4. Enable auto-recharge for uninterrupted service

### For Admins
1. Review token pricing monthly based on actual costs
2. Monitor gross margins by action type
3. Identify high-usage users for upsell opportunities
4. Track token expiration (should be 0% with no-expiry policy)
5. Audit token grants/refunds quarterly

### For Developers
1. Always use tokenMiddleware before token-consuming actions
2. Log actual costs after action completes
3. Handle 402 errors gracefully in frontend
4. Implement optimistic UI updates (assume success)
5. Cache token_pricing table to reduce DB queries
