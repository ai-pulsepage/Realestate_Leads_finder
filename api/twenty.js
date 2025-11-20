// Twenty CRM Integration

const axios = require('axios');

async function syncLeadToCRM(lead) {
  await axios.post(`${process.env.TWENTY_API_URL}/contacts`, {
    name: lead.owner_name,
    email: lead.email,
    phone: lead.phone,
    intent_rating: lead.intent_rating
  }, {
    headers: { 'Authorization': `Bearer ${process.env.TWENTY_API_KEY}` }
  });
}

module.exports = { syncLeadToCRM };