// Google Reviews Integration

const axios = require('axios');

async function postReview(accountId, review) {
  await axios.post(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/reviews`, review, {
    headers: { 'Authorization': `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}` }
  });
}

async function getReviews(accountId) {
  const res = await axios.get(`https://mybusiness.googleapis.com/v4/accounts/${accountId}/reviews`, {
    headers: { 'Authorization': `Bearer ${process.env.GOOGLE_ACCESS_TOKEN}` }
  });
  return res.data;
}

module.exports = { postReview, getReviews };