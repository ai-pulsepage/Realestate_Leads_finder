const express = require('express');
const router = express.Router();

// GET /api/projects - List all open projects
router.get('/', async (req, res) => {
    try {
        const { category, zip_code } = req.query;

        let query = `
      SELECT p.*, pr.business_name as homeowner_name, pr.avatar_url 
      FROM projects p
      JOIN profiles pr ON p.homeowner_id = pr.profile_id
      WHERE p.status = 'open'
    `;
        const params = [];

        if (category && category !== 'All Categories') {
            params.push(category);
            query += ` AND p.category = $${params.length}`;
        }

        if (zip_code) {
            params.push(zip_code);
            query += ` AND p.location_zip = $${params.length}`;
        }

        query += ` ORDER BY p.created_at DESC`;

        const result = await req.pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Projects list error:', err);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
    try {
        const { homeowner_id, title, description, category, budget_range, location_address, location_zip, images } = req.body;

        const result = await req.pool.query(
            `INSERT INTO projects (
         homeowner_id, title, description, category, budget_range, 
         location_address, location_zip, images
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [homeowner_id, title, description, category, budget_range, location_address, location_zip, images]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Project creation error:', err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// GET /api/projects/:id - Get project details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await req.pool.query(
            `SELECT p.*, pr.business_name as homeowner_name, pr.avatar_url 
       FROM projects p
       JOIN profiles pr ON p.homeowner_id = pr.profile_id
       WHERE p.project_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Project details error:', err);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

module.exports = router;
