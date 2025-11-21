// Clerk FTP API Integration
// Fetches files from Records/Images folders

const axios = require('axios');
const redis = require('redis');

const redisClient = process.env.REDIS_HOST ? redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
}) : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('Redis error:', err));
}

async function fetchFtpFile(fileName, folderName) {
  const cacheKey = `clerk_ftp:${folderName}:${fileName}`;
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

  const response = await axios.get('https://api.miami-dadeclerk.com/FTPapi', {
    params: {
      fileName,
      folderName,
      AuthKey: process.env.CLERK_AUTH_KEY
    }
  });

  if (redisClient) {
    try {
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(response.data));
    } catch (err) {
      console.error('Redis set error:', err);
    }
  }
  return response.data;
}

module.exports = { fetchFtpFile };