/**
 * Admin Referrers API Routes
 * Manage referral partners and their commissions
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticateToken);

// ============================================================
// GET /api/admin/referrers - List all referrers with stats
// ============================================================
router.get('/', async (req, res) => {
    try {
        const { status, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

        let query = `
            SELECT 
                r.*,
                (SELECT COUNT(*) FROM referral_signups rs WHERE rs.referrer_id = r.referrer_id) as signup_count,
                (SELECT COUNT(*) FROM referral_signups rs WHERE rs.referrer_id = r.referrer_id AND rs.status = 'active') as active_count,
                (SELECT COALESCE(SUM(ct.commission_amount), 0) FROM commission_transactions ct WHERE ct.referrer_id = r.referrer_id AND ct.status = 'pending') as pending_commission
            FROM referrers r
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            params.push(status);
            query += ` AND r.status = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (r.name ILIKE $${params.length} OR r.email ILIKE $${params.length} OR r.referral_code ILIKE $${params.length})`;
        }

        const validSorts = ['created_at', 'name', 'total_signups', 'total_commission_earned'];
        const sortColumn = validSorts.includes(sortBy) ? sortBy : 'created_at';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY r.${sortColumn} ${order}`;

        const result = await pool.query(query, params);

        // Get summary stats
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_referrers,
                COUNT(*) FILTER (WHERE status = 'active') as active_referrers,
                COALESCE(SUM(total_signups), 0) as total_signups,
                COALESCE(SUM(total_commission_earned), 0) as total_commission_earned,
                COALESCE(SUM(total_commission_paid), 0) as total_commission_paid,
                COALESCE(SUM(total_commission_earned - total_commission_paid), 0) as pending_payouts
            FROM referrers
        `);

        res.json({
            referrers: result.rows,
            stats: statsResult.rows[0]
        });
    } catch (error) {
        console.error('Error fetching referrers:', error);
        res.status(500).json({ error: 'Failed to fetch referrers' });
    }
});

// ============================================================
// POST /api/admin/referrers - Create new referrer
// ============================================================
router.post('/', async (req, res) => {
    try {
        const {
            name,
            email,
            phone,
            company,
            commission_percent = 10.00,
            payout_method,
            payout_details,
            notes
        } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Check if email already exists
        const existing = await pool.query(
            'SELECT referrer_id FROM referrers WHERE email = $1',
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'A referrer with this email already exists' });
        }

        // Generate unique referral code
        const codeResult = await pool.query(
            'SELECT generate_referral_code($1) as code',
            [name]
        );
        const referral_code = codeResult.rows[0].code;

        // Create referrer
        const result = await pool.query(`
            INSERT INTO referrers (name, email, phone, company, referral_code, commission_percent, payout_method, payout_details, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [name, email, phone, company, referral_code, commission_percent, payout_method, payout_details || {}, notes]);

        res.status(201).json({
            referrer: result.rows[0],
            referral_link: `https://app.bizleadfinders.com/signup?ref=${referral_code}`
        });
    } catch (error) {
        console.error('Error creating referrer:', error);
        res.status(500).json({ error: 'Failed to create referrer' });
    }
});

// ============================================================
// GET /api/admin/referrers/:id - Get referrer details
// ============================================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const referrerResult = await pool.query(`
            SELECT * FROM referrers WHERE referrer_id = $1
        `, [id]);

        if (referrerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Referrer not found' });
        }

        // Get recent signups
        const signupsResult = await pool.query(`
            SELECT 
                rs.*,
                u.full_name,
                u.email as user_email
            FROM referral_signups rs
            LEFT JOIN users u ON rs.user_id = u.user_id
            WHERE rs.referrer_id = $1
            ORDER BY rs.created_at DESC
            LIMIT 20
        `, [id]);

        // Get commission summary
        const commissionResult = await pool.query(`
            SELECT 
                status,
                COUNT(*) as count,
                COALESCE(SUM(commission_amount), 0) as total
            FROM commission_transactions
            WHERE referrer_id = $1
            GROUP BY status
        `, [id]);

        // Get monthly stats (last 6 months)
        const monthlyResult = await pool.query(`
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                COUNT(*) as signups,
                COALESCE(SUM(lifetime_value), 0) as revenue
            FROM referral_signups
            WHERE referrer_id = $1 AND created_at >= NOW() - INTERVAL '6 months'
            GROUP BY DATE_TRUNC('month', created_at)
            ORDER BY month DESC
        `, [id]);

        res.json({
            referrer: referrerResult.rows[0],
            signups: signupsResult.rows,
            commissions: commissionResult.rows,
            monthly_stats: monthlyResult.rows,
            referral_link: `https://app.bizleadfinders.com/signup?ref=${referrerResult.rows[0].referral_code}`
        });
    } catch (error) {
        console.error('Error fetching referrer details:', error);
        res.status(500).json({ error: 'Failed to fetch referrer details' });
    }
});

// ============================================================
// PUT /api/admin/referrers/:id - Update referrer
// ============================================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            email,
            phone,
            company,
            commission_percent,
            status,
            payout_method,
            payout_details,
            notes
        } = req.body;

        const result = await pool.query(`
            UPDATE referrers SET
                name = COALESCE($1, name),
                email = COALESCE($2, email),
                phone = COALESCE($3, phone),
                company = COALESCE($4, company),
                commission_percent = COALESCE($5, commission_percent),
                status = COALESCE($6, status),
                payout_method = COALESCE($7, payout_method),
                payout_details = COALESCE($8, payout_details),
                notes = COALESCE($9, notes),
                updated_at = NOW()
            WHERE referrer_id = $10
            RETURNING *
        `, [name, email, phone, company, commission_percent, status, payout_method, payout_details, notes, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Referrer not found' });
        }

        res.json({ referrer: result.rows[0] });
    } catch (error) {
        console.error('Error updating referrer:', error);
        res.status(500).json({ error: 'Failed to update referrer' });
    }
});

// ============================================================
// DELETE /api/admin/referrers/:id - Deactivate referrer
// ============================================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            UPDATE referrers SET status = 'suspended', updated_at = NOW()
            WHERE referrer_id = $1
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Referrer not found' });
        }

        res.json({ message: 'Referrer suspended', referrer: result.rows[0] });
    } catch (error) {
        console.error('Error suspending referrer:', error);
        res.status(500).json({ error: 'Failed to suspend referrer' });
    }
});

// ============================================================
// GET /api/admin/referrers/:id/signups - List all signups for referrer
// ============================================================
router.get('/:id/signups', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                rs.*,
                u.full_name,
                u.email as user_email,
                u.created_at as user_created_at
            FROM referral_signups rs
            LEFT JOIN users u ON rs.user_id = u.user_id
            WHERE rs.referrer_id = $1
        `;
        const params = [id];

        if (status) {
            params.push(status);
            query += ` AND rs.status = $${params.length}`;
        }

        query += ` ORDER BY rs.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get total count
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM referral_signups WHERE referrer_id = $1',
            [id]
        );

        res.json({
            signups: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Error fetching signups:', error);
        res.status(500).json({ error: 'Failed to fetch signups' });
    }
});

// ============================================================
// GET /api/admin/referrers/:id/commissions - List commission transactions
// ============================================================
router.get('/:id/commissions', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                ct.*,
                rs.user_email,
                rs.user_name
            FROM commission_transactions ct
            LEFT JOIN referral_signups rs ON ct.signup_id = rs.signup_id
            WHERE ct.referrer_id = $1
        `;
        const params = [id];

        if (status) {
            params.push(status);
            query += ` AND ct.status = $${params.length}`;
        }

        query += ` ORDER BY ct.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({ commissions: result.rows });
    } catch (error) {
        console.error('Error fetching commissions:', error);
        res.status(500).json({ error: 'Failed to fetch commissions' });
    }
});

// ============================================================
// POST /api/admin/referrers/:id/payout - Create payout for referrer
// ============================================================
router.post('/:id/payout', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payout_reference, notes } = req.body;
        const adminId = req.user.user_id;

        // Start transaction
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get pending commission amount
            const pendingResult = await client.query(`
                SELECT COALESCE(SUM(commission_amount), 0) as pending
                FROM commission_transactions
                WHERE referrer_id = $1 AND status = 'approved'
            `, [id]);

            const pendingAmount = parseFloat(pendingResult.rows[0].pending);
            const payoutAmount = amount || pendingAmount;

            if (payoutAmount <= 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'No pending commissions to pay' });
            }

            // Create payout record
            const payoutResult = await client.query(`
                INSERT INTO commission_payouts (referrer_id, amount, payout_reference, status, processed_by, notes)
                VALUES ($1, $2, $3, 'completed', $4, $5)
                RETURNING *
            `, [id, payoutAmount, payout_reference, adminId, notes]);

            // Mark commissions as paid
            await client.query(`
                UPDATE commission_transactions 
                SET status = 'paid', paid_at = NOW()
                WHERE referrer_id = $1 AND status = 'approved'
            `, [id]);

            // Update referrer totals
            await client.query(`
                UPDATE referrers 
                SET total_commission_paid = total_commission_paid + $1, updated_at = NOW()
                WHERE referrer_id = $2
            `, [payoutAmount, id]);

            await client.query('COMMIT');

            res.json({
                message: 'Payout processed successfully',
                payout: payoutResult.rows[0]
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error processing payout:', error);
        res.status(500).json({ error: 'Failed to process payout' });
    }
});

module.exports = router;
