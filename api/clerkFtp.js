// Clerk FTP API Integration
// Fetches files from Records/Images folders

const axios = require('axios');
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: 6379
});

redisClient.on('error', (err) => console.error('Redis error:', err));

async function fetchFtpFile(fileName, folderName) {
  const cacheKey = `clerk_ftp:${folderName}:${fileName}`;
  const cached = await redisClient.get(cacheKey);
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

  await redisClient.setEx(cacheKey, 86400, JSON.stringify(response.data));
  return response.data;
}

module.exports = { fetchFtpFile };