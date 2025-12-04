// Properties Routes
const express = require('express');
const { fetchOfficialRecords } = require('../api/miamiDade');

const router = express.Router();

// GET /api/properties - Search with filters
router.get('/', async (req, res) => {
  try {
    const {
      zip_code,
      county,
      distressed_score_min,
      property_type,
      minEquity,
      maxYearBuilt,
      distressType
    } = req.query;

    let query = 'SELECT * FROM properties WHERE 1=1';
    const params = [];

    // Existing filters
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

    // New complex filters from Sprint 10
    if (minEquity) {
      // minEquity: (assessed_value - mortgage_balance) / assessed_value >= threshold
      const equityThreshold = parseFloat(minEquity);
      params.push(equityThreshold);
      query += ` AND (assessed_value - COALESCE(mortgage_balance, 0)) / NULLIF(assessed_value, 0) >= $${params.length}`;
    }

    if (maxYearBuilt) {
      // maxYearBuilt: year_built <= threshold (older homes)
      const yearThreshold = parseInt(maxYearBuilt);
      params.push(yearThreshold);
      query += ` AND year_built <= $${params.length}`;
    }

    if (distressType) {
      // distressType: filter by specific distress indicators
      switch (distressType) {
        case 'foreclosure':
          query += ` AND is_foreclosure = true`;
          break;
        case 'tax_lien':
          query += ` AND has_tax_lien = true`;
          break;
        case 'code_violation':
          query += ` AND has_code_violation = true`;
          break;
        case 'vacant':
          query += ` AND is_vacant = true`;
          break;
        case 'probate':
          query += ` AND is_probate = true`;
          break;
        case 'divorce':
          query += ` AND is_divorce = true`;
          break;
        case 'heirship':
          query += ` AND is_heirship = true`;
          break;
        case 'pre_foreclosure':
          query += ` AND is_pre_foreclosure = true`;
          break;
        default:
          // Any distress
          query += ` AND (is_foreclosure = true OR has_tax_lien = true OR has_code_violation = true OR is_vacant = true OR is_probate = true OR is_divorce = true OR is_heirship = true OR is_pre_foreclosure = true)`;
      }
    }

    const result = await req.pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Properties search error:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// POST /api/properties - Create new property
router.post('/', async (req, res) => {
  try {
    const { 
      address, 
      zip_code, 
      county, 
      owner_name, 
      sale_price, 
      property_type,
      latitude,
      longitude,
      distressed_score,
      source 
    } = req.body;

    const result = await req.pool.query(
      `INSERT INTO properties 
       (address, zip_code, county, owner_name, sale_price, property_type, latitude, longitude, distressed_score, source) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [address, zip_code, county, owner_name, sale_price, property_type, latitude, longitude, distressed_score, source || 'manual']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Property creation error:', err);
    res.status(500).json({ error: 'Database insert failed' });
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

// DELETE /api/properties/:id - Delete property
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await req.pool.query(
      'DELETE FROM properties WHERE property_id = $1 RETURNING property_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json({ 
      success: true, 
      message: 'Property deleted',
      property_id: result.rows[0].property_id 
    });
  } catch (err) {
    console.error('Property delete error:', err);
    res.status(500).json({ error: 'Database delete failed' });
  }
});

module.exports = router;
