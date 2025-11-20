// CRM Sync Worker

const { Worker } = require('bullmq');
const { syncLeadToCRM } = require('../api/twenty');
const { pool } = require('../server');

const worker = new Worker('crm-sync', async (job) => {
  const { leadId } = job.data;
  const lead = await pool.query('SELECT * FROM saved_leads WHERE lead_id = $1', [leadId]);
  await syncLeadToCRM(lead.rows[0]);
}, { connection: { host: process.env.REDIS_HOST } });

module.exports = worker;