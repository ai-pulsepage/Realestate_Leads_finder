// Stripe Webhooks
// Handles subscription updates

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../server');

const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const customerId = subscription.customer;
    const status = subscription.status;
    const tier = subscription.items.data[0].price.lookup_key; // e.g., 'contractors'

    await pool.query(
      'UPDATE users SET subscription_status = $1, subscription_tier = $2 WHERE stripe_customer_id = $3',
      [status, tier, customerId]
    );
  }

  res.json({ received: true });
});

module.exports = router;