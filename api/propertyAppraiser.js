// Property Appraiser API Integration
// Fetches assessments like sq_ft, bedrooms, etc.

const axios = require('axios');
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

redisClient.on('error', (err) => console.error('Redis error:', err));

async function fetchPropertyAssessment(folioNumber) {
  const cacheKey = `property_appraiser:${folioNumber}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const response = await axios.get(`https://api.miami-dade.gov/propertyappraiser/assessment/${folioNumber}`, {
    headers: {
      'Authorization': `Bearer ${process.env.PROPERTY_APPRAISER_KEY}`
    }
  });

  await redisClient.setEx(cacheKey, 86400, JSON.stringify(response.data));
  return response.data;
}

module.exports = { fetchPropertyAssessment };