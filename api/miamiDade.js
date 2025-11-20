// Miami-Dade Official Records API Integration
// Node.js module for fetching property data

const axios = require('axios');
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

redisClient.on('error', (err) => console.error('Redis error:', err));

async function fetchOfficialRecords(cfn, seq) {
  const cacheKey = `miami_dade:${cfn}:${seq}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const response = await axios.get('https://api.miami-dade.com/OfficialRecords', {
    params: {
      parameter1: cfn,
      parameter2: `R${seq}`,
      authKey: process.env.MIAMI_DADE_AUTH_KEY
    }
  });

  await redisClient.setEx(cacheKey, 86400, JSON.stringify(response.data)); // 24h TTL
  return response.data;
}

module.exports = { fetchOfficialRecords };