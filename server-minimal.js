// Minimal test server for Cloud Run deployment
const express = require('express');
const app = express();

console.log('=== MINIMAL TEST SERVER STARTUP ===');
console.log('Node:', process.version);
console.log('PORT:', process.env.PORT || 8080);
console.log('Environment:', process.env.NODE_ENV || 'development');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Real Estate Leads API - Minimal Test',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 8080;
console.log(`🚀 Starting minimal server on port ${PORT}...`);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal test server successfully listening on port ${PORT}`);
  console.log(`📍 Server URL: http://0.0.0.0:${PORT}`);
  console.log(`🌐 Health check URL: http://0.0.0.0:${PORT}/health`);
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});