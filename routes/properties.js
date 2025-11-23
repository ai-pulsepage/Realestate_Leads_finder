// Properties Routes
const express = require('express');
const { fetchOfficialRecords } = require('../api/miamiDade');

const router = express.Router();

// GET /api/properties - Search with filters
router.get('/', async (req, res) => {
  try {
    const { zip_code, county, distressed_score_min, property_type } = req.query;
    let query = 'SELECT * FROM properties WHERE 1=1';
    const params = [];

    if (zip_code) {
      params.push(zip_code);
      query += ` AND zip_code = $${params.length}`;
    }
    if (county) {
      params.push(county);
      query += ` AND county = $${params.length}`;
    }
    if (distressed_score_min) {
      params.push(distressed_score_min);
      query += ` AND distressed_score >= $${params.length}`;
    }
    if (property_type) {
      params.push(property_type);
      query += ` AND property_type = $${params.length}`;
    }

    const result = await req.pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Properties search error:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// GET /api/properties/:id - Get single property
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await req.pool.query(
      'SELECT * FROM properties WHERE property_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Property lookup error:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// PUT /api/properties/:id - Update property
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      address, 
      zip_code, 
      county, 
      owner_name, 
      sale_price, 
      property_type,
      distressed_score 
    } = req.body;

    const result = await req.pool.query(
      `UPDATE properties 
       SET address = COALESCE($1, address),
           zip_code = COALESCE($2, zip_code),
           county = COALESCE($3, county),
           owner_name = COALESCE($4, owner_name),
           sale_price = COALESCE($5, sale_price),
           property_type = COALESCE($6, property_type),
           distressed_score = COALESCE($7, distressed_score),
           updated_at = CURRENT_TIMESTAMP
       WHERE property_id = $8
       RETURNING *`,
      [address, zip_code, county, owner_name, sale_price, property_type, distressed_score, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Property update error:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

module.exports = router;
