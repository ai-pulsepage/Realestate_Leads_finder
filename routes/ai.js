// AI Routes
// POST /api/ai/chat

const express = require('express');
const { generateChatResponse } = require('../api/togetherAi');

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, userId } = req.body;
    const kb = await req.pool.query('SELECT content FROM subscriber_knowledge_base WHERE user_id = $1', [userId]);
    const context = kb.rows.map(r => r.content).join('\n');
    const response = await generateChatResponse(message, context);
    res.json({ response });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({
      error: 'AI service unavailable',
      message: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

module.exports = router;