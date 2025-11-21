console.log('=== Starting Minimal Server ===');
console.log('Node version:', process.version);
console.log('PORT:', process.env.PORT);

const express = require('express');
console.log('✓ Express loaded');

const app = express();
app.use(express.json());
console.log('✓ Express app created');

// Health endpoints only - NO route imports
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Real Estate Leads API - MINIMAL',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    message: 'Minimal server - route files disabled for testing'
  });
});

console.log('✓ Health routes added');

const PORT = process.env.PORT || 8080;

console.log('=== Starting HTTP Server ===');

app.listen(PORT, '0.0.0.0', () => {
  console.log('✓✓✓ MINIMAL SERVER STARTED SUCCESSFULLY ✓✓✓');
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});