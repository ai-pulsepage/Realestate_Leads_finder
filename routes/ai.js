// AI Routes
// POST /api/ai/chat

const express = require('express');
const { generateChatResponse } = require('../api/togetherAi');
const { pool } = require('../server');

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { message, userId } = req.body;
  const kb = await pool.query('SELECT content FROM subscriber_knowledge_base WHERE user_id = $1', [userId]);
  const context = kb.rows.map(r => r.content).join('\n');
  const response = await generateChatResponse(message, context);
  res.json({ response });
});

module.exports = router;