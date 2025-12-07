const express = require('express');
const router = express.Router();

// GET /api/wallet - Get current balance and transaction history
router.get('/', async (req, res) => {
    try {
        const { user_id } = req.user; // Assumes authenticateToken middleware

        // Get Wallet
        let walletResult = await req.pool.query(
            `SELECT * FROM wallets WHERE user_id = $1`,
            [user_id]
        );

        // Create wallet if not exists
        if (walletResult.rows.length === 0) {
            walletResult = await req.pool.query(
                `INSERT INTO wallets (user_id) VALUES ($1) RETURNING *`,
                [user_id]
            );
        }

        const wallet = walletResult.rows[0];

        // Get Recent Transactions
        const transactionsResult = await req.pool.query(
            `SELECT * FROM token_transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [wallet.wallet_id]
        );

        res.json({
            balance: wallet.balance,
            transactions: transactionsResult.rows
        });

    } catch (err) {
        console.error('Wallet fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch wallet' });
    }
});

// POST /api/wallet/add-funds - Mock endpoint for purchasing tokens
router.post('/add-funds', async (req, res) => {
    try {
        const { user_id } = req.user;
        const { amount, package_name } = req.body; // e.g. 100, 'Starter Pack'

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        // Get Wallet ID
        const walletRes = await req.pool.query(`SELECT wallet_id FROM wallets WHERE user_id = $1`, [user_id]);
        if (walletRes.rows.length === 0) return res.status(404).json({ error: 'Wallet not found' });
        const wallet_id = walletRes.rows[0].wallet_id;

        // Start Transaction (Simple version without BEGIN/COMMIT for brevity, but recommended for prod)
        // 1. Update Balance
        await req.pool.query(
            `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE wallet_id = $2`,
            [amount, wallet_id]
        );

        // 2. Record Transaction
        await req.pool.query(
            `INSERT INTO token_transactions (wallet_id, amount, transaction_type, description)
       VALUES ($1, $2, 'purchase', $3)`,
            [wallet_id, amount, `Purchased ${package_name || 'Tokens'}`]
        );

        res.json({ message: 'Funds added successfully', added: amount });

    } catch (err) {
        console.error('Add funds error:', err);
        res.status(500).json({ error: 'Failed to add funds' });
    }
});

// POST /api/wallet/deduct - Internal use for spending tokens
// Note: In a real app, this might be an internal function called by other services, not a public route
router.post('/deduct', async (req, res) => {
    try {
        const { user_id } = req.user;
        const { amount, description, related_entity_type, related_entity_id } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

        // Get Wallet
        const walletRes = await req.pool.query(`SELECT wallet_id, balance FROM wallets WHERE user_id = $1`, [user_id]);
        if (walletRes.rows.length === 0) return res.status(404).json({ error: 'Wallet not found' });

        const wallet = walletRes.rows[0];
        if (wallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient funds' });
        }

        // Deduct
        await req.pool.query(
            `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE wallet_id = $2`,
            [amount, wallet.wallet_id]
        );

        // Record
        await req.pool.query(
            `INSERT INTO token_transactions (wallet_id, amount, transaction_type, description, related_entity_type, related_entity_id)
       VALUES ($1, $2, 'usage', $3, $4, $5)`,
            [wallet.wallet_id, -amount, description, related_entity_type, related_entity_id]
        );

        res.json({ success: true, remaining: wallet.balance - amount });

    } catch (err) {
        console.error('Deduct funds error:', err);
        res.status(500).json({ error: 'Failed to deduct funds' });
    }
});

module.exports = router;
