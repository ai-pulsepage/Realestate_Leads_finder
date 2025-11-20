// Together.ai Chat Integration

const axios = require('axios');

async function generateChatResponse(prompt, context) {
  const response = await axios.post('https://api.together.ai/chat', {
    model: 'meta-llama/Llama-3.1-70B-Instruct-Turbo',
    messages: [{ role: 'user', content: `${context}\n${prompt}` }]
  }, {
    headers: { 'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}` }
  });

  return response.data.choices[0].message.content;
}

module.exports = { generateChatResponse };