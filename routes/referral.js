/**
 * Public Referral API Routes
 * Validate referral codes and track signups
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// ============================================================
// GET /api/referral/validate/:code - Validate referral code
// Public endpoint - no auth required
// ============================================================
router.get('/validate/:code', async (req, res) => {
    try {
        const { code } = req.params;

        const result = await pool.query(`
            SELECT 
                referrer_id,
                name as referrer_name,
                referral_code,
                status
            FROM referrers 
            WHERE referral_code = $1
        `, [code.toUpperCase()]);

        if (result.rows.length === 0) {
            return res.json({ valid: false, message: 'Invalid referral code' });
        }

        const referrer = result.rows[0];

        if (referrer.status !== 'active') {
            return res.json({ valid: false, message: 'This referral code is no longer active' });
        }

        // Get the associated coupon/discount
        const couponResult = await pool.query(`
            SELECT 
                discount_type,
                discount_value,
                duration_months
            FROM coupons 
            WHERE referrer_id = $1 AND is_active = true
            LIMIT 1
        `, [referrer.referrer_id]);

        const discount = couponResult.rows[0] || {
            discount_type: 'percent',
            discount_value: 10,
            duration_months: 6
        };

        res.json({
            valid: true,
            referrer_name: referrer.referrer_name,
            referral_code: referrer.referral_code,
            discount: {
                type: discount.discount_type,
                value: discount.discount_value,
                duration_months: discount.duration_months,
                message: `${discount.discount_value}% off for ${discount.duration_months} months!`
            }
        });
    } catch (error) {
        console.error('Error validating referral code:', error);
        res.status(500).json({ error: 'Failed to validate referral code' });
    }
});

// ============================================================
// POST /api/referral/track-signup - Track a new signup with referral
// Called after user registration
// ============================================================
router.post('/track-signup', async (req, res) => {
    try {
        const {
            user_id,
            user_email,
            user_name,
            user_role,
            referral_code,
            stripe_customer_id
        } = req.body;

        if (!referral_code || !user_id) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Find the referrer
        const referrerResult = await pool.query(`
            SELECT referrer_id, commission_percent FROM referrers 
            WHERE referral_code = $1 AND status = 'active'
        `, [referral_code.toUpperCase()]);

        if (referrerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Referrer not found or inactive' });
        }

        const referrer = referrerResult.rows[0];

        // Check if user already tracked
        const existingResult = await pool.query(
            'SELECT signup_id FROM referral_signups WHERE user_id = $1',
            [user_id]
        );

        if (existingResult.rows.length > 0) {
            return res.json({ message: 'Signup already tracked', signup_id: existingResult.rows[0].signup_id });
        }

        // Calculate discount end date (6 months from now)
        const discountEndsAt = new Date();
        discountEndsAt.setMonth(discountEndsAt.getMonth() + 6);

        // Create signup record
        const signupResult = await pool.query(`
            INSERT INTO referral_signups (
                referrer_id, user_id, user_email, user_name, user_role,
                stripe_customer_id, discount_ends_at, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING *
        `, [referrer.referrer_id, user_id, user_email, user_name, user_role, stripe_customer_id, discountEndsAt]);

        // Update user record with referral info
        await pool.query(`
            UPDATE users SET 
                referred_by = $1,
                referral_code_used = $2,
                referral_discount_ends_at = $3
            WHERE user_id = $4
        `, [referrer.referrer_id, referral_code, discountEndsAt, user_id]);

        // Update referrer stats
        await pool.query(`
            UPDATE referrers SET 
                total_signups = total_signups + 1,
                updated_at = NOW()
            WHERE referrer_id = $1
        `, [referrer.referrer_id]);

        res.status(201).json({
            message: 'Signup tracked successfully',
            signup: signupResult.rows[0],
            discount_ends_at: discountEndsAt
        });
    } catch (error) {
        console.error('Error tracking signup:', error);
        res.status(500).json({ error: 'Failed to track signup' });
    }
});

// ============================================================
// POST /api/referral/track-payment - Track payment and create commission
// Called by Stripe webhook handler
// ============================================================
router.post('/track-payment', async (req, res) => {
    try {
        const {
            user_id,
            stripe_payment_intent_id,
            stripe_invoice_id,
            payment_amount
        } = req.body;

        // Find the signup record
        const signupResult = await pool.query(`
            SELECT 
                rs.signup_id,
                rs.referrer_id,
                r.commission_percent
            FROM referral_signups rs
            JOIN referrers r ON rs.referrer_id = r.referrer_id
            WHERE rs.user_id = $1 AND r.status = 'active'
        `, [user_id]);

        if (signupResult.rows.length === 0) {
            return res.json({ message: 'User is not a referred signup', commission: 0 });
        }

        const signup = signupResult.rows[0];
        const commissionAmount = (payment_amount * signup.commission_percent) / 100;

        // Check for duplicate
        const existingCommission = await pool.query(
            'SELECT transaction_id FROM commission_transactions WHERE stripe_payment_intent_id = $1',
            [stripe_payment_intent_id]
        );

        if (existingCommission.rows.length > 0) {
            return res.json({ message: 'Commission already recorded' });
        }

        // Create commission transaction
        const commissionResult = await pool.query(`
            INSERT INTO commission_transactions (
                referrer_id, signup_id, user_id,
                stripe_payment_intent_id, stripe_invoice_id,
                payment_amount, commission_percent, commission_amount,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
            RETURNING *
        `, [
            signup.referrer_id, signup.signup_id, user_id,
            stripe_payment_intent_id, stripe_invoice_id,
            payment_amount, signup.commission_percent, commissionAmount
        ]);

        // Update referrer totals
        await pool.query(`
            UPDATE referrers SET 
                total_revenue = total_revenue + $1,
                total_commission_earned = total_commission_earned + $2,
                updated_at = NOW()
            WHERE referrer_id = $3
        `, [payment_amount, commissionAmount, signup.referrer_id]);

        // Update signup lifetime value
        await pool.query(`
            UPDATE referral_signups SET 
                lifetime_value = lifetime_value + $1,
                status = 'active'
            WHERE signup_id = $2
        `, [payment_amount, signup.signup_id]);

        res.json({
            message: 'Commission recorded',
            commission: commissionResult.rows[0]
        });
    } catch (error) {
        console.error('Error tracking payment:', error);
        res.status(500).json({ error: 'Failed to track payment' });
    }
});

module.exports = router;
