// Miami-Dade Official Records API Integration
// Node.js module for fetching property data

const axios = require('axios');
const redis = require('redis');

const redisClient = process.env.REDIS_HOST ? redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
}) : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('Redis error:', err));
}

async function fetchOfficialRecords(cfn, seq) {
  const cacheKey = `miami_dade:${cfn}:${seq}`;
  let cached = null;
  if (redisClient) {
    try {
      cached = await redisClient.get(cacheKey);
    } catch (err) {
      console.error('Redis get error:', err);
    }
  }
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

  if (redisClient) {
    try {
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(response.data)); // 24h TTL
    } catch (err) {
      console.error('Redis set error:', err);
    }
  }
  return response.data;
}

module.exports = { fetchOfficialRecords };