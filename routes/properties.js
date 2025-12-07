// Properties Routes
const express = require('express');
const { fetchOfficialRecords } = require('../api/miamiDade');

const router = express.Router();

// GET /api/properties - Search with filters
router.get('/', async (req, res) => {
  try {
    const {
      min_price, max_price, city, zip, min_last_sale_date,
      distressed_score_min, property_type, minEquity, maxYearBuilt, distressType
    } = req.query;

    // Base Query on Real Data
    let query = `
      SELECT p.*,
             p.address_street as address,
             p.address_street as full_address,
             p.appraised_value as assessed_value,
             p.appraised_value as sale_price, -- Fallback if sale_price is needed
             l.lis_pendens_filed, l.tax_lien_filed, l.foreclosure_status, 
             l.divorce_filing, l.bankruptcy_filing
      FROM properties_real p
      LEFT JOIN property_legal_status l ON p.parcel_id = l.parcel_id
      WHERE 1=1
    `;
    const params = [];

    // Price Filter (Appraised Value)
    if (min_price) {
      params.push(min_price);
      query += ` AND p.appraised_value >= $${params.length}`;
    }
    if (max_price) {
      params.push(max_price);
      query += ` AND p.appraised_value <= $${params.length}`;
    }

    // Location Filters
    if (city) {
      params.push(`%${city}%`);
      query += ` AND p.address_city ILIKE $${params.length}`;
    }
    if (zip) {
      params.push(zip);
      query += ` AND p.address_zip = $${params.length}`;
    }

    // Recent Sales
    if (min_last_sale_date) {
      params.push(min_last_sale_date);
      query += ` AND p.last_sale_date >= $${params.length}`;
    }

    // Distress Filters (Legal Status)
    if (distressType) {
      switch (distressType) {
        case 'foreclosure':
          query += ` AND l.foreclosure_status IS NOT NULL AND l.foreclosure_status != 'none'`;
          break;
        case 'tax_lien':
          query += ` AND l.tax_lien_filed = true`;
          break;
        case 'lis_pendens':
          query += ` AND l.lis_pendens_filed = true`;
          break;
        case 'divorce':
          query += ` AND l.divorce_filing = true`;
          break;
        case 'bankruptcy':
          query += ` AND l.bankruptcy_filing = true`;
          break;
        default:
          // Any distress
          query += ` AND (l.lis_pendens_filed = true OR l.tax_lien_filed = true OR l.divorce_filing = true OR l.bankruptcy_filing = true)`;
      }
    }

    query += ` ORDER BY p.created_at DESC LIMIT 50`;

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
    // Try real table first, fallback to mock if needed? 
    // For now, let's assume we want real data.
    const result = await req.pool.query(
      'SELECT * FROM properties_real WHERE property_id = $1',
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
