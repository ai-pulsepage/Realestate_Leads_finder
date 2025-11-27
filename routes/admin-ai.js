/**
 * ADMIN AI ROUTES
 * Handles AI Persona Generation and Voice Settings Management
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
// POST /api/admin/generate-persona
// Generates a system prompt from a user description
// ============================================================
router.post('/generate-persona', async (req, res) => {
    try {
        const { description, company_name } = req.body;

        if (!description) {
            return res.status(400).json({
                success: false,
                message: 'Description is required'
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

        const metaPrompt = `
    You are an expert Prompt Engineer for Voice AI. 
    Your goal is to convert a user's plain English description into a high-performance System Prompt for a telephone-based AI agent.

    USER DESCRIPTION: "${description}"
    COMPANY NAME: "${company_name || 'The Company'}"

    INSTRUCTIONS:
    1. Create a "System Prompt" that defines the AI's Persona, Tone, Objective, and Guardrails.
    2. The prompt must be optimized for SPEECH (short sentences, conversational, no complex markdown).
    3. The AI should be instructed to be helpful but concise.
    4. Do NOT include any preamble like "Here is the prompt". Just output the prompt text itself.

    OUTPUT FORMAT:
    You are [Name/Role], the AI assistant for ${company_name || 'us'}. [Rest of the prompt...]
    `;

        const result = await model.generateContent(metaPrompt);
        const generatedPrompt = result.response.text().trim();

        console.log('✨ Generated Persona for:', company_name);

        res.json({
            success: true,
            generated_prompt: generatedPrompt
        });

    } catch (error) {
        console.error('❌ Error generating persona:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating persona',
            error: error.message
        });
    }
});

// ============================================================
// GET /api/admin/voice-settings/:user_id
// Fetch current voice settings
// ============================================================
router.get('/voice-settings/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;

        const result = await req.pool.query(`
      SELECT knowledge_data->'voice_settings' as voice_settings
      FROM subscriber_knowledge_base
      WHERE user_id = $1
    `, [user_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Settings not found'
            });
        }

        res.json({
            success: true,
            voice_settings: result.rows[0].voice_settings || {}
        });

    } catch (error) {
        console.error('❌ Error fetching voice settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching settings',
            error: error.message
        });
    }
});

// ============================================================
// PUT /api/admin/voice-settings/:user_id
// Update voice settings
// ============================================================
router.put('/voice-settings/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { system_prompt, voice_id, language } = req.body;

        // We use jsonb_set to update just the voice_settings key, preserving other knowledge
        // But since we want to update multiple fields inside voice_settings, it's safer to 
        // read-modify-write or use a deep merge function. 
        // For simplicity/robustness, we'll assume the client sends the FULL voice_settings object 
        // or we merge it here. Let's merge it.

        // First, get existing to merge
        const existing = await req.pool.query(`
      SELECT knowledge_data->'voice_settings' as voice_settings
      FROM subscriber_knowledge_base
      WHERE user_id = $1
    `, [user_id]);

        let currentSettings = {};
        if (existing.rows.length > 0) {
            currentSettings = existing.rows[0].voice_settings || {};
        }

        const newSettings = {
            ...currentSettings,
            system_prompt: system_prompt !== undefined ? system_prompt : currentSettings.system_prompt,
            voice_id: voice_id !== undefined ? voice_id : currentSettings.voice_id,
            language: language !== undefined ? language : currentSettings.language,
            last_updated: new Date().toISOString()
        };

        const updateResult = await req.pool.query(`
      UPDATE subscriber_knowledge_base
      SET knowledge_data = jsonb_set(
        knowledge_data,
        '{voice_settings}',
        $1::jsonb
      )
      WHERE user_id = $2
      RETURNING knowledge_data->'voice_settings' as voice_settings
    `, [JSON.stringify(newSettings), user_id]);

        console.log('✅ Voice settings updated for:', user_id);

        res.json({
            success: true,
            voice_settings: updateResult.rows[0].voice_settings
        });

    } catch (error) {
        console.error('❌ Error updating voice settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating settings',
            error: error.message
        });
    }
});

module.exports = router;
