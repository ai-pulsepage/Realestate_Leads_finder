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
        }
      ]
    };

    res.json(products);
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/stripe/create-checkout-session - Create Stripe checkout for subscription or tokens
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { user_id, price_id, success_url, cancel_url, mode } = req.body;

    if (!user_id || !price_id || !success_url || !cancel_url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get or create Stripe customer
    const userResult = await req.pool.query(
      'SELECT stripe_customer_id, email FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    let customerId = user.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id }
      });
      customerId = customer.id;

      await req.pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE user_id = $2',
        [customerId, user_id]
      );
    }

    // Determine checkout mode (subscription or payment for tokens)
    const checkoutMode = mode || 'subscription';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: checkoutMode,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: {
        user_id,
        price_id
      }
    });

    res.json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (err) {
    console.error('Checkout session error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /api/stripe/create-portal-session - Create customer portal session
router.post('/create-portal-session', async (req, res) => {
  try {
    const { user_id, return_url } = req.body;

    if (!user_id || !return_url) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userResult = await req.pool.query(
      'SELECT stripe_customer_id FROM users WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].stripe_customer_id) {
      return res.status(404).json({ error: 'No Stripe customer found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: userResult.rows[0].stripe_customer_id,
      return_url: return_url,
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error('Portal session error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// POST /api/stripe/webhook - Handle Stripe webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // For now, just parse the event (webhook secret setup comes later)
    event = JSON.parse(req.body);
    
    console.log('Stripe webhook event:', event.type);

    // Handle subscription events
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.user_id;
      const customerId = session.customer;

      // Update user with customer ID if subscription
      if (session.mode === 'subscription') {
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1, subscription_status = $2 WHERE user_id = $3',
          [customerId, 'active', userId]
        );
        
        // Allocate tokens based on subscription tier
        const priceId = session.metadata.price_id;
        let tokensToAdd = 0;
        
        // Find matching subscription tier
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
          console.log(`Added ${tokensToAdd} tokens to user ${userId}`);
        }
      }

      // Handle token package purchase
      if (session.mode === 'payment') {
        const priceId = session.metadata.price_id;
        let tokensToAdd = 0;

        // Find matching token package
        Object.keys(stripePrices.tokenPackages).forEach(packageSize => {
          if (stripePrices.tokenPackages[packageSize].priceId === priceId) {
            tokensToAdd = stripePrices.tokenPackages[packageSize].tokens;
          }
        });

        if (tokensToAdd > 0) {
          await pool.query(
            'UPDATE users SET token_balance = token_balance + $1 WHERE user_id = $2',
            [tokensToAdd, userId]
          );
          console.log(`Added ${tokensToAdd} tokens to user ${userId} from token package`);
        }
      }
    }

    // Handle subscription updates
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const status = subscription.status;

      await pool.query(
        'UPDATE users SET subscription_status = $1 WHERE stripe_customer_id = $2',
        [status, customerId]
      );
      console.log(`Updated subscription status to ${status} for customer ${customerId}`);
    }

    // Handle subscription deletion
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      await pool.query(
        'UPDATE users SET subscription_status = $1 WHERE stripe_customer_id = $2',
        ['canceled', customerId]
      );
      console.log(`Subscription canceled for customer ${customerId}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

module.exports = router;
