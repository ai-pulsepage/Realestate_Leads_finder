// Properties Routes
// GET /api/properties - Search with filters

const express = require('express');
const { pool } = require('../server');
const { fetchOfficialRecords } = require('../api/miamiDade');

const router = express.Router();

router.get('/', async (req, res) => {
  const { zip_code, distressed_score_min, property_type } = req.query;
  let query = 'SELECT * FROM properties WHERE 1=1';
  const params = [];

  if (zip_code) {
    params.push(zip_code);
    query += ` AND zip_code = $${params.length}`;
  }
  if (distressed_score_min) {
    params.push(distressed_score_min);
    query += ` AND distressed_score >= $${params.length}`;
  }
  if (property_type) {
    params.push(property_type);
    query += ` AND property_type = $${params.length}`;
  }

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;