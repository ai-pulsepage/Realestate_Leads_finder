/**
 * APPOINTMENTS ROUTES
 * Full CRUD operations for appointment management
 */

const express = require('express');
const router = express.Router();

// ============================================================
// GET /api/appointments/:user_id
// Get all appointments for a subscriber
// ============================================================

router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { status, upcoming_only } = req.query;

    let query = `
      SELECT
        a.*,
        sl.lead_status as lead_status,
        sl.property_address as saved_lead_property
      FROM appointments a
      LEFT JOIN saved_leads sl ON a.saved_lead_id = sl.saved_lead_id
      WHERE a.user_id = $1
    `;

    const queryParams = [user_id];

    // Filter by status
    if (status) {
      query += ` AND a.appointment_status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    // Filter upcoming only
    if (upcoming_only === 'true') {
      query += ` AND a.appointment_datetime >= NOW()`;
    }

    query += ` ORDER BY a.appointment_datetime DESC`;

    const result = await req.db.query(query, queryParams);

    res.json({
      success: true,
      count: result.rows.length,
      appointments: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message
    });
  }
});

// ============================================================
// GET /api/appointments/single/:appointment_id
// Get single appointment details
// ============================================================

router.get('/single/:appointment_id', async (req, res) => {
  try {
    const { appointment_id } = req.params;

    const result = await req.db.query(`
      SELECT
        a.*,
        u.email as subscriber_email,
        sl.lead_status,
        sl.property_address as saved_lead_property,
        acl.conversation_transcript,
        acl.call_recording_url
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN saved_leads sl ON a.saved_lead_id = sl.saved_lead_id
      LEFT JOIN ai_voice_call_logs acl ON a.call_sid = acl.call_sid
      WHERE a.appointment_id = $1
    `, [appointment_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      appointment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment',
      error: error.message
    });
  }
});

// ============================================================
// POST /api/appointments
// Create new appointment manually
// ============================================================

router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      contact_name,
      contact_phone,
      contact_email,
      appointment_datetime,
      appointment_type,
      notes,
      property_address,
      saved_lead_id,
      urgency_level
    } = req.body;

    // Validation
    if (!user_id || !appointment_datetime) {
      return res.status(400).json({
        success: false,
        message: 'user_id and appointment_datetime are required'
      });
    }

    const result = await req.db.query(`
      INSERT INTO appointments (
        user_id, contact_name, contact_phone, contact_email,
        appointment_datetime, appointment_type, appointment_status,
        notes, property_address, saved_lead_id, urgency_level,
        lead_source
      ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $8, $9, $10, 'manual')
      RETURNING *
    `, [
      user_id,
      contact_name,
      contact_phone,
      contact_email,
      appointment_datetime,
      appointment_type || 'consultation',
      notes,
      property_address,
      saved_lead_id,
      urgency_level || 'normal'
    ]);

    console.log('✅ Appointment created:', result.rows[0].appointment_id);

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating appointment',
      error: error.message
    });
  }
});

// ============================================================
// PUT /api/appointments/:appointment_id
// Update appointment
// ============================================================

router.put('/:appointment_id', async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const {
      contact_name,
      contact_phone,
      contact_email,
      appointment_datetime,
      appointment_type,
      appointment_status,
      notes,
      property_address,
      urgency_level
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (contact_name !== undefined) {
      updates.push(`contact_name = $${paramCount++}`);
      values.push(contact_name);
    }
    if (contact_phone !== undefined) {
      updates.push(`contact_phone = $${paramCount++}`);
      values.push(contact_phone);
    }
    if (contact_email !== undefined) {
      updates.push(`contact_email = $${paramCount++}`);
      values.push(contact_email);
    }
    if (appointment_datetime !== undefined) {
      updates.push(`appointment_datetime = $${paramCount++}`);
      values.push(appointment_datetime);
    }
    if (appointment_type !== undefined) {
      updates.push(`appointment_type = $${paramCount++}`);
      values.push(appointment_type);
    }
    if (appointment_status !== undefined) {
      updates.push(`appointment_status = $${paramCount++}`);
      values.push(appointment_status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    if (property_address !== undefined) {
      updates.push(`property_address = $${paramCount++}`);
      values.push(property_address);
    }
    if (urgency_level !== undefined) {
      updates.push(`urgency_level = $${paramCount++}`);
      values.push(urgency_level);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(appointment_id);

    const query = `
      UPDATE appointments
      SET ${updates.join(', ')}
      WHERE appointment_id = $${paramCount}
      RETURNING *
    `;

    const result = await req.db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    console.log('✅ Appointment updated:', appointment_id);

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating appointment',
      error: error.message
    });
  }
});

// ============================================================
// DELETE /api/appointments/:appointment_id
// Delete (cancel) appointment
// ============================================================

router.delete('/:appointment_id', async (req, res) => {
  try {
    const { appointment_id } = req.params;

    // Soft delete by updating status
    const result = await req.db.query(`
      UPDATE appointments
      SET appointment_status = 'cancelled'
      WHERE appointment_id = $1
      RETURNING *
    `, [appointment_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    console.log('✅ Appointment cancelled:', appointment_id);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment',
      error: error.message
    });
  }
});

// ============================================================
// GET /api/appointments/stats/:user_id
// Get appointment statistics
// ============================================================

router.get('/stats/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await req.db.query(`
      SELECT
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE appointment_status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE appointment_status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE appointment_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE appointment_status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE appointment_status = 'no_show') as no_shows,
        COUNT(*) FILTER (WHERE appointment_datetime >= NOW()) as upcoming,
        COUNT(*) FILTER (WHERE urgency_level = 'urgent') as urgent_count,
        COUNT(*) FILTER (WHERE lead_source = 'voice_ai') as from_voice_ai
      FROM appointments
      WHERE user_id = $1
    `, [user_id]);

    res.json({
      success: true,
      stats: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching appointment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
});

module.exports = router;