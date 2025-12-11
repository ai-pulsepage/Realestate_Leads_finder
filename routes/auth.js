const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Validate Role (Optional but good practice)
        const validRoles = ['investor', 'contractor', 'provider', 'agent'];
        let subscriptionTier = 'basic';

        if (role) {
            const normalizedRole = role.toLowerCase();
            if (normalizedRole === 'contractor') subscriptionTier = 'provider';
            else if (validRoles.includes(normalizedRole)) subscriptionTier = normalizedRole;
        }

        // Check if user exists
        const existingUser = await req.pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create User
        const result = await req.pool.query(
            'INSERT INTO users (email, password_hash, subscription_tier) VALUES ($1, $2, $3) RETURNING user_id, email, subscription_tier, created_at',
            [email, passwordHash, subscriptionTier]
        );

        const user = result.rows[0];

        // Generate Token
        const token = jwt.sign({ userId: user.user_id, email: user.email, role: user.subscription_tier }, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
            message: 'User created successfully',
            user: user,
            token: token
        });

    } catch (err) {
        console.error('Signup Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find User
        const result = await req.pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Verify Password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate Token (include role for admin access)
        const token = jwt.sign({
            userId: user.user_id,
            email: user.email,
            role: user.role || user.subscription_tier
        }, JWT_SECRET, { expiresIn: '24h' });

        // Update Last Login
        await req.pool.query('UPDATE users SET last_login = NOW() WHERE user_id = $1', [user.user_id]);

        res.json({
            message: 'Login successful',
            user: {
                user_id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                role: user.role || user.subscription_tier,
                subscription_tier: user.subscription_tier
            },
            token: token
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
