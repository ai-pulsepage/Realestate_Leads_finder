/**
 * Admin Coupons API Routes
 * Manage discount codes and link them to referrers
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticateToken);

// ============================================================
// GET /api/admin/coupons - List all coupons
// ============================================================
router.get('/', async (req, res) => {
    try {
        const { is_active, referrer_id } = req.query;

        let query = `
            SELECT 
                c.*,
                r.name as referrer_name,
                r.referral_code as referrer_code
            FROM coupons c
            LEFT JOIN referrers r ON c.referrer_id = r.referrer_id
            WHERE 1=1
        `;
        const params = [];

        if (is_active !== undefined) {
            params.push(is_active === 'true');
            query += ` AND c.is_active = $${params.length}`;
        }

        if (referrer_id) {
            params.push(referrer_id);
            query += ` AND c.referrer_id = $${params.length}`;
        }

        query += ' ORDER BY c.created_at DESC';

        const result = await pool.query(query, params);

        res.json({ coupons: result.rows });
    } catch (error) {
        console.error('Error fetching coupons:', error);
        res.status(500).json({ error: 'Failed to fetch coupons' });
    }
});

// ============================================================
// POST /api/admin/coupons - Create new coupon
// ============================================================
router.post('/', async (req, res) => {
    try {
        const {
            code,
            name,
            description,
            discount_type = 'percent',
            discount_value,
            duration = 'repeating',
            duration_months = 6,
            applies_to = 'all',
            max_uses,
            referrer_id,
            expires_at
        } = req.body;

        if (!code || !discount_value) {
            return res.status(400).json({ error: 'Code and discount value are required' });
        }

        // Check if code already exists
        const existing = await pool.query(
            'SELECT coupon_id FROM coupons WHERE code = $1',
            [code.toUpperCase()]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'A coupon with this code already exists' });
        }

        // Create coupon in database
        const result = await pool.query(`
            INSERT INTO coupons (
                code, name, description, discount_type, discount_value,
                duration, duration_months, applies_to, max_uses,
                referrer_id, expires_at, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `, [
            code.toUpperCase(), name, description, discount_type, discount_value,
            duration, duration_months, applies_to, max_uses,
            referrer_id, expires_at, req.user.user_id
        ]);

        // TODO: Create corresponding coupon in Stripe
        // This would use: stripe.coupons.create({ ... })

        res.status(201).json({ coupon: result.rows[0] });
    } catch (error) {
        console.error('Error creating coupon:', error);
        res.status(500).json({ error: 'Failed to create coupon' });
    }
});

// ============================================================
// GET /api/admin/coupons/:id - Get coupon details
// ============================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT 
                c.*,
                r.name as referrer_name,
                r.email as referrer_email
            FROM coupons c
            LEFT JOIN referrers r ON c.referrer_id = r.referrer_id
            WHERE c.coupon_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        res.json({ coupon: result.rows[0] });
    } catch (error) {
        console.error('Error fetching coupon:', error);
        res.status(500).json({ error: 'Failed to fetch coupon' });
    }
});

// ============================================================
// PUT /api/admin/coupons/:id - Update coupon
// ============================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            description,
            is_active,
            max_uses,
            expires_at
        } = req.body;

        const result = await pool.query(`
            UPDATE coupons SET
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                is_active = COALESCE($3, is_active),
                max_uses = COALESCE($4, max_uses),
                expires_at = COALESCE($5, expires_at),
                updated_at = NOW()
            WHERE coupon_id = $6
            RETURNING *
        `, [name, description, is_active, max_uses, expires_at, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        res.json({ coupon: result.rows[0] });
    } catch (error) {
        console.error('Error updating coupon:', error);
        res.status(500).json({ error: 'Failed to update coupon' });
    }
});

// ============================================================
// DELETE /api/admin/coupons/:id - Deactivate coupon
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            UPDATE coupons SET is_active = false, updated_at = NOW()
            WHERE coupon_id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        res.json({ message: 'Coupon deactivated', coupon: result.rows[0] });
    } catch (error) {
        console.error('Error deactivating coupon:', error);
        res.status(500).json({ error: 'Failed to deactivate coupon' });
    }
});

// ============================================================
// POST /api/admin/coupons/validate - Validate a coupon code
// ============================================================
router.post('/validate', async (req, res) => {
    try {
        const { code, user_role } = req.body;

        const result = await pool.query(`
            SELECT * FROM coupons 
            WHERE code = $1 
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (max_uses IS NULL OR times_used < max_uses)
        `, [code.toUpperCase()]);

        if (result.rows.length === 0) {
            return res.json({ valid: false, message: 'Invalid or expired coupon' });
        }

        const coupon = result.rows[0];

        // Check if coupon applies to this role
        if (coupon.applies_to !== 'all' && coupon.applies_to !== user_role) {
            return res.json({
                valid: false,
                message: `This coupon is only valid for ${coupon.applies_to}s`
            });
        }

        res.json({
            valid: true,
            coupon: {
                code: coupon.code,
                discount_type: coupon.discount_type,
                discount_value: coupon.discount_value,
                duration: coupon.duration,
                duration_months: coupon.duration_months
            }
        });
    } catch (error) {
        console.error('Error validating coupon:', error);
        res.status(500).json({ error: 'Failed to validate coupon' });
    }
});

module.exports = router;
