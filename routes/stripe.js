
// Stripe Routes - Subscriptions and Token Purchases
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../config/database');
const stripePrices = require('../config/stripe-prices.json');

const router = express.Router();

// GET /api/stripe/products - List all available products and prices
router.get('/products', async (req, res) => {
  try {
    const products = {
      subscriptions: [
        {
          name: 'Contractor Plan',
          description: 'Access to new homeowner leads in Miami-Dade County',
          tier: 'contractor',
          tokens: stripePrices.subscriptions.contractor.tokens,
          prices: {
            monthly: {
              priceId: stripePrices.subscriptions.contractor.monthly,
              amount: 4900,
              interval: 'month'
            },
            yearly: {
              priceId: stripePrices.subscriptions.contractor.yearly,
              amount: 49900,
              interval: 'year'
            }
          }
        },
        {
          name: 'Investor Plan',
          description: 'Access to distressed properties and FSBO leads',
          tier: 'investor',
          tokens: stripePrices.subscriptions.investor.tokens,
          prices: {
            monthly: {
              priceId: stripePrices.subscriptions.investor.monthly,
              amount: 4900,
              interval: 'month'
            },
            yearly: {
              priceId: stripePrices.subscriptions.investor.yearly,
              amount: 49900,
              interval: 'year'
            }
          }
        },
        {
          name: 'Combined Plan',
          description: 'Full access to both contractor and investor leads',
          tier: 'combined',
          tokens: stripePrices.subscriptions.combined.tokens,
          prices: {
            monthly: {
              priceId: stripePrices.subscriptions.combined.monthly,
              amount: 8999,
              interval: 'month'
            },
            yearly: {
              priceId: stripePrices.subscriptions.combined.yearly,
              amount: 89900,
              interval: 'year'
            }
          }
        }
      ],
      tokenPackages: [
        {
          name: '5,000 Token Package',
          tokens: stripePrices.tokenPackages['5000'].tokens,
          priceId: stripePrices.tokenPackages['5000'].priceId,
          amount: stripePrices.tokenPackages['5000'].amount
        },
        {
          name: '10,000 Token Package',
          tokens: stripePrices.tokenPackages['10000'].tokens,
          priceId: stripePrices.tokenPackages['10000'].priceId,
          amount: stripePrices.tokenPackages['10000'].amount
        },
        {
          name: '25,000 Token Package',
          tokens: stripePrices.tokenPackages['25000'].tokens,
          priceId: stripePrices.tokenPackages['25000'].priceId,
          amount: stripePrices.tokenPackages['25000'].amount
        },
        {
          name: '50,000 Token Package',
          tokens: stripePrices.tokenPackages['50000'].tokens,
          priceId: stripePrices.tokenPackages['50000'].priceId,
          amount: stripePrices.tokenPackages['50000'].amount
        },
        {
          name: '100,000 Token Package',
          tokens: stripePrices.tokenPackages['100000'].tokens,
          priceId: stripePrices.tokenPackages['100000'].priceId,
          amount: stripePrices.tokenPackages['100000'].amount
        }
      ]
    };

    res.json(products);
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/stripe/webhook - Handle Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Use rawBody captured in server.js
    if (!req.rawBody) {
      console.error('❌ Webhook Error: No rawBody found. Ensure express.json verify is configured.');
      return res.status(400).send('Webhook Error: No rawBody found');
    }

    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } else {
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set. Skipping signature verification (INSECURE).');
      event = req.body; // Fallback for dev without secret
    }
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🔔 Webhook received: ${event.type}`);

  try {
    // 1. Handle New Subscriptions & Token Purchases
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.user_id;
      const customerId = session.customer;

      if (session.mode === 'subscription') {
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1, subscription_status = $2 WHERE user_id = $3',
          [customerId, 'active', userId]
        );

        // Allocate tokens for new subscription
        const priceId = session.metadata.price_id;

        let tokensToAdd = 0;
        Object.keys(stripePrices.subscriptions).forEach(tier => {
          if (stripePrices.subscriptions[tier].monthly === priceId ||
            stripePrices.subscriptions[tier].yearly === priceId) {
            tokensToAdd = stripePrices.subscriptions[tier].tokens;
          }
        });

        if (tokensToAdd > 0) {
          await pool.query(
            'UPDATE users SET token_balance = token_balance + $1 WHERE user_id = $2',
            [tokensToAdd, userId]
          );

          await pool.query(
            `INSERT INTO token_usage_logs (user_id, action_type, tokens_deducted, metadata)
             VALUES ($1, 'subscription_grant', 0, $2)`,
            [userId, JSON.stringify({ added: tokensToAdd, reason: 'new_subscription' })]
          );

          console.log(`Granted ${tokensToAdd} tokens to user ${userId} (New Sub)`);
        }
      }

      if (session.mode === 'payment') {
        const priceId = session.metadata.price_id;
        let tokensToAdd = 0;

        Object.keys(stripePrices.tokenPackages).forEach(pkg => {
          if (stripePrices.tokenPackages[pkg].priceId === priceId) {
            tokensToAdd = stripePrices.tokenPackages[pkg].tokens;
          }
        });

        if (tokensToAdd > 0) {
          await pool.query(
            'UPDATE users SET token_balance = token_balance + $1 WHERE user_id = $2',
            [tokensToAdd, userId]
          );

          await pool.query(
            `INSERT INTO token_usage_logs (user_id, action_type, tokens_deducted, metadata)
             VALUES ($1, 'token_purchase', 0, $2)`,
            [userId, JSON.stringify({ added: tokensToAdd, reason: 'package_purchase' })]
          );

          console.log(`Added ${tokensToAdd} tokens to user ${userId} (Purchase)`);
        }
      }
    }

    // 2. Handle Monthly Renewals (Invoice Paid)
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;

      if (invoice.subscription) {
        const customerId = invoice.customer;
        const priceId = invoice.lines.data[0].price.id;

        const userResult = await pool.query(
          'SELECT user_id FROM users WHERE stripe_customer_id = $1',
          [customerId]
        );

        if (userResult.rows.length > 0) {
          const userId = userResult.rows[0].user_id;
          let tokensToAdd = 0;

          Object.keys(stripePrices.subscriptions).forEach(tier => {
            if (stripePrices.subscriptions[tier].monthly === priceId ||
              stripePrices.subscriptions[tier].yearly === priceId) {
              tokensToAdd = stripePrices.subscriptions[tier].tokens;
            }
          });

          if (tokensToAdd > 0) {
            await pool.query(
              'UPDATE users SET token_balance = token_balance + $1 WHERE user_id = $2',
              [tokensToAdd, userId]
            );

            await pool.query(
              `INSERT INTO token_usage_logs (user_id, action_type, tokens_deducted, metadata)
               VALUES ($1, 'subscription_renewal', 0, $2)`,
              [userId, JSON.stringify({ added: tokensToAdd, reason: 'monthly_renewal' })]
            );

            console.log(`Granted ${tokensToAdd} tokens to user ${userId} (Renewal)`);
          }
        }
      }
    }

    // 3. Handle Subscription Updates/Cancellations
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      await pool.query(
        'UPDATE users SET subscription_status = $1 WHERE stripe_customer_id = $2',
        [subscription.status, subscription.customer]
      );
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      await pool.query(
        'UPDATE users SET subscription_status = $1 WHERE stripe_customer_id = $2',
        ['canceled', subscription.customer]
      );
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

module.exports = router;
