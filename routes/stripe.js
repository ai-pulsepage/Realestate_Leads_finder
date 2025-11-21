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
    try {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const status = subscription.status;
      const tier = subscription.items.data[0].price.lookup_key; // e.g., 'contractors'

      // Note: Stripe webhook doesn't go through checkDatabase middleware
      // We'll need to handle DB connection here or move to a service
      console.log('Stripe subscription update:', { customerId, status, tier });
      // For now, just log - DB update would need pool access
    } catch (err) {
      console.error('Stripe webhook processing error:', err);
      return res.status(500).send('Webhook processing failed');
    }
  }

  res.json({ received: true });
});

module.exports = router;