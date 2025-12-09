const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/projects - List all open projects
router.get('/', async (req, res) => {
    try {
        const { category, zip_code } = req.query;
        let queryText = `
            SELECT p.*, u.full_name as homeowner_name 
            FROM projects p
            JOIN users u ON p.homeowner_id = u.user_id
            WHERE p.status = 'open'
        `;
        const queryParams = [];

        if (category && category !== 'All Categories') {
            queryParams.push(category);
            queryText += ` AND p.category = $${queryParams.length}`;
        }

        // Simple zip matching for now.
        // Ideally we'd do radius search but that requires lat/long on projects.
        // We'll stick to exact zip or skip for MVP.
        if (zip_code) {
            // Implemented later if needed
        }

        queryText += ` ORDER BY p.created_at DESC`;

        const result = await pool.query(queryText, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
    try {
        const { title, description, category, location_zip, budget_range } = req.body;
        const homeowner_id = req.user.user_id;

        const result = await pool.query(
            `INSERT INTO projects (homeowner_id, title, description, category, location_zip, budget_range)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [homeowner_id, title, description, category, location_zip, budget_range]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

module.exports = router;
