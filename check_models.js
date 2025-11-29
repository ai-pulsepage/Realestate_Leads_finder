const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        console.log('Available Flash Models:');
        response.data.models.forEach(model => {
            if (model.name.includes('flash')) {
                console.log(`- ${model.name}`);
            }
        });
    } catch (error) {
        console.error('Error listing models:', error.response ? error.response.data : error.message);
    }
}

listModels();
