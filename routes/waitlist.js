const express = require('express');
const router = express.Router();

// POST /api/waitlist - Join the waitlist
router.post('/', async (req, res) => {
    try {
        const { email, full_name, role, consent_given } = req.body;

        // Validation
        if (!email || !role) {
            return res.status(400).json({ error: 'Email and Role are required' });
        }
        if (!consent_given) {
            return res.status(400).json({ error: 'Consent is required' });
        }

        // Insert into database
        const result = await req.pool.query(
            `INSERT INTO waitlist_entries (email, full_name, role, consent_given, ip_address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         role = EXCLUDED.role,
         consent_given = EXCLUDED.consent_given
       RETURNING *`,
            [email, full_name, role, consent_given, req.ip]
        );

        // TODO: Send notification email to Admin (thedevingrey@gmail.com)
        // TODO: Send welcome email to User

        res.status(201).json({
            message: 'Successfully joined the waitlist',
            entry: result.rows[0]
        });

    } catch (err) {
        console.error('Waitlist error:', err);
        res.status(500).json({ error: 'Failed to join waitlist' });
    }
});

module.exports = router;
