// Saved Leads Routes - CRM functionality
const express = require('express');

const router = express.Router();

// POST /api/saved-leads - Save a property as a lead
router.post('/', async (req, res) => {
  try {
    const { 
      user_id, 
      property_id, 
      lead_status = 'new',
      notes,
      tags 
    } = req.body;

    if (!user_id || !property_id) {
      return res.status(400).json({ error: 'user_id and property_id are required' });
    }

    // Check if property exists
    const propertyCheck = await req.pool.query(
      'SELECT property_id FROM properties WHERE property_id = $1',
      [property_id]
    );

    if (propertyCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check if already saved
    const existingLead = await req.pool.query(
      'SELECT saved_lead_id FROM saved_leads WHERE user_id = $1 AND property_id = $2',
      [user_id, property_id]
    );

    if (existingLead.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Property already saved',
        saved_lead_id: existingLead.rows[0].saved_lead_id 
      });
    }

    // Save the lead
    const result = await req.pool.query(
      `INSERT INTO saved_leads 
       (user_id, property_id, lead_status, notes, tags) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [user_id, property_id, lead_status, notes, tags || []]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('Save lead error:', err);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

// GET /api/saved-leads/:user_id - Get all saved leads for a user
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { 
      lead_status, 
      limit = 50, 
      offset = 0,
      sort_by = 'saved_at',
      sort_order = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        sl.saved_lead_id,
        sl.user_id,
        sl.property_id,
        sl.lead_status,
        sl.notes,
        sl.tags,
        sl.saved_at,
        sl.last_contact_at,
        p.address,
        p.zip_code,
        p.county,
        p.owner_name,
        p.sale_price,
        p.property_type,
        p.distressed_score
      FROM saved_leads sl
      JOIN properties p ON sl.property_id = p.property_id
      WHERE sl.user_id = $1
    `;
    const params = [user_id];

    if (lead_status) {
      params.push(lead_status);
      query += ` AND sl.lead_status = $${params.length}`;
    }

    // Validate sort fields
    const validSortFields = ['saved_at', 'last_contact_at', 'distressed_score'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'saved_at';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    params.push(limit, offset);
    query += ` ORDER BY sl.${sortField} ${sortDir} LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await req.pool.query(query, params);

    // Get total count
    const countResult = await req.pool.query(
      'SELECT COUNT(*) FROM saved_leads WHERE user_id = $1',
      [user_id]
    );

    res.json({
      leads: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (err) {
    console.error('Get saved leads error:', err);
    res.status(500).json({ error: 'Failed to fetch saved leads' });
  }
});

// GET /api/saved-leads/lead/:id - Get single saved lead
router.get('/lead/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.pool.query(
      `SELECT 
        sl.*,
        p.address,
        p.zip_code,
        p.county,
        p.owner_name,
        p.sale_price,
        p.property_type,
        p.distressed_score,
        p.latitude,
        p.longitude,
        p.property_details
      FROM saved_leads sl
      JOIN properties p ON sl.property_id = p.property_id
      WHERE sl.saved_lead_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Saved lead not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Get saved lead error:', err);
    res.status(500).json({ error: 'Failed to fetch saved lead' });
  }
});

// PUT /api/saved-leads/:id - Update saved lead
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      lead_status, 
      notes, 
      tags,
      last_contact_at 
    } = req.body;

    const updates = [];
    const params = [];

    if (lead_status !== undefined) {
      params.push(lead_status);
      updates.push(`lead_status = $${params.length}`);
    }

    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }

    if (tags !== undefined) {
      params.push(tags);
      updates.push(`tags = $${params.length}`);
    }

    if (last_contact_at !== undefined) {
      params.push(last_contact_at);
      updates.push(`last_contact_at = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `
      UPDATE saved_leads 
      SET ${updates.join(', ')}
      WHERE saved_lead_id = $${params.length}
      RETURNING *
    `;

    const result = await req.pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Saved lead not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('Update saved lead error:', err);
    res.status(500).json({ error: 'Failed to update saved lead' });
  }
});

// DELETE /api/saved-leads/:id - Remove saved lead
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await req.pool.query(
      'DELETE FROM saved_leads WHERE saved_lead_id = $1 RETURNING saved_lead_id, property_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Saved lead not found' });
    }

    res.json({
      success: true,
      message: 'Saved lead removed',
      saved_lead_id: result.rows[0].saved_lead_id
    });

  } catch (err) {
    console.error('Delete saved lead error:', err);
    res.status(500).json({ error: 'Failed to delete saved lead' });
  }
});

module.exports = router;
