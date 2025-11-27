/**
 * EMAIL TEMPLATES ROUTES
 * CRUD operations for email template management
 */

const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini Lazily
const getGenAI = () => {
    if (!process.env.GEMINI_API_KEY) {
        console.warn('⚠️ GEMINI_API_KEY is not set. AI features will be disabled.');
        return null;
    }
    return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

// ============================================================
// GET /api/email-templates/:user_id
// Get all templates for a user (includes system templates)
// ============================================================

router.get('/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { category, template_type } = req.query;

        let query = `
      SELECT 
        template_id,
        user_id,
        template_name,
        template_type,
        category,
        subject_line,
        LEFT(html_body, 200) as html_preview,
        available_variables,
        is_active,
        usage_count,
        created_at,
        updated_at
      FROM email_templates
      WHERE (user_id = $1 OR user_id IS NULL)
    `;

        const queryParams = [user_id];

        // Filter by category
        if (category) {
            query += ` AND category = $${queryParams.length + 1}`;
            queryParams.push(category);
        }

        // Filter by type
        if (template_type) {
            query += ` AND template_type = $${queryParams.length + 1}`;
            queryParams.push(template_type);
        }

        query += ` AND is_active = true ORDER BY template_type, template_name`;

        const result = await req.pool.query(query, queryParams);

        res.json({
            success: true,
            count: result.rows.length,
            templates: result.rows
        });

    } catch (error) {
        console.error('❌ Error fetching templates:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching templates',
            error: error.message
        });
    }
});

// ============================================================
// GET /api/email-templates/single/:template_id
// Get single template with full content
// ============================================================

router.get('/single/:template_id', async (req, res) => {
    try {
        const { template_id } = req.params;

        const result = await req.pool.query(`
      SELECT * FROM email_templates
      WHERE template_id = $1
    `, [template_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.json({
            success: true,
            template: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error fetching template:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching template',
            error: error.message
        });
    }
});

// ============================================================
// POST /api/email-templates
// Create new custom template
// ============================================================

router.post('/', async (req, res) => {
    try {
        const {
            user_id,
            template_name,
            category,
            subject_line,
            html_body,
            plain_text_body,
            available_variables
        } = req.body;

        // Validation
        if (!user_id || !template_name || !subject_line || !html_body) {
            return res.status(400).json({
                success: false,
                message: 'user_id, template_name, subject_line, and html_body are required'
            });
        }

        const result = await req.pool.query(`
      INSERT INTO email_templates (
        user_id, template_name, template_type, category,
        subject_line, html_body, plain_text_body, available_variables
      ) VALUES ($1, $2, 'custom', $3, $4, $5, $6, $7)
      RETURNING *
    `, [
            user_id,
            template_name,
            category || 'custom',
            subject_line,
            html_body,
            plain_text_body,
            JSON.stringify(available_variables || [])
        ]);

        console.log('✅ Template created:', result.rows[0].template_id);

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            template: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error creating template:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating template',
            error: error.message
        });
    }
});

// ============================================================
// PUT /api/email-templates/:template_id
// Update template (custom templates only)
// ============================================================

router.put('/:template_id', async (req, res) => {
    try {
        const { template_id } = req.params;
        const {
            template_name,
            category,
            subject_line,
            html_body,
            plain_text_body,
            available_variables,
            is_active
        } = req.body;

        // Check if template is custom (can't edit system templates)
        const checkQuery = await req.pool.query(
            'SELECT template_type FROM email_templates WHERE template_id = $1',
            [template_id]
        );

        if (checkQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        if (checkQuery.rows[0].template_type === 'system') {
            return res.status(403).json({
                success: false,
                message: 'Cannot modify system templates'
            });
        }

        // Build dynamic update
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (template_name !== undefined) {
            updates.push(`template_name = $${paramCount++}`);
            values.push(template_name);
        }
        if (category !== undefined) {
            updates.push(`category = $${paramCount++}`);
            values.push(category);
        }
        if (subject_line !== undefined) {
            updates.push(`subject_line = $${paramCount++}`);
            values.push(subject_line);
        }
        if (html_body !== undefined) {
            updates.push(`html_body = $${paramCount++}`);
            values.push(html_body);
        }
        if (plain_text_body !== undefined) {
            updates.push(`plain_text_body = $${paramCount++}`);
            values.push(plain_text_body);
        }
        if (available_variables !== undefined) {
            updates.push(`available_variables = $${paramCount++}`);
            values.push(JSON.stringify(available_variables));
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${paramCount++}`);
            values.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        values.push(template_id);

        const query = `
      UPDATE email_templates
      SET ${updates.join(', ')}
      WHERE template_id = $${paramCount}
      RETURNING *
    `;

        const result = await req.pool.query(query, values);

        console.log('✅ Template updated:', template_id);

        res.json({
            success: true,
            message: 'Template updated successfully',
            template: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error updating template:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating template',
            error: error.message
        });
    }
});

// ============================================================
// DELETE /api/email-templates/:template_id
// Soft delete template (mark as inactive)
// ============================================================

router.delete('/:template_id', async (req, res) => {
    try {
        const { template_id } = req.params;

        // Can't delete system templates
        const checkQuery = await req.pool.query(
            'SELECT template_type FROM email_templates WHERE template_id = $1',
            [template_id]
        );

        if (checkQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        if (checkQuery.rows[0].template_type === 'system') {
            return res.status(403).json({
                success: false,
                message: 'Cannot delete system templates'
            });
        }

        // Soft delete
        const result = await req.pool.query(`
      UPDATE email_templates
      SET is_active = false
      WHERE template_id = $1
      RETURNING *
    `, [template_id]);

        console.log('✅ Template deleted:', template_id);

        res.json({
            success: true,
            message: 'Template deleted successfully',
            template: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error deleting template:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting template',
            error: error.message
        });
    }
});

// ============================================================
// POST /api/email-templates/ai-assist
// AI-assisted email content generation
// ============================================================

router.post('/ai-assist', async (req, res) => {
    try {
        const {
            prompt,
            context,
            tone = 'professional'
        } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                message: 'prompt is required'
            });
        }

        const genAI = getGenAI();
        if (!genAI) {
            return res.status(503).json({
                success: false,
                message: 'AI service not configured (GEMINI_API_KEY missing)'
            });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const fullPrompt = `
    You are an expert real estate email copywriter. Generate email content for this request:

    REQUEST: ${prompt}

    CONTEXT: ${context || 'General real estate lead outreach'}

    TONE: ${tone}

    Generate:
    1. Subject line (under 60 characters, attention-grabbing)
    2. Email body (HTML format, professional, 150-250 words)
    3. Plain text version

    Format your response as JSON:
    {
      "subject_line": "...",
      "html_body": "<html>...</html>",
      "plain_text_body": "...",
      "suggested_variables": ["{{first_name}}", "{{property_address}}", ...]
    }

    Keep it conversational, not salesy. Focus on value and building relationships.

    JSON:`;

        const result = await model.generateContent(fullPrompt);
        let responseText = result.response.text().trim();

        // Clean markdown
        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (responseText.startsWith('```')) {
            responseText = responseText.replace(/```\n?/g, '');
        }

        const generated = JSON.parse(responseText);

        console.log('✅ AI-assisted content generated');

        res.json({
            success: true,
            generated_content: generated
        });

    } catch (error) {
        console.error('❌ Error generating AI content:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating content',
            error: error.message
        });
    }
});

module.exports = router;
