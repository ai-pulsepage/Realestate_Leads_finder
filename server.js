// Backend Server - Node.js/Express
// Main entry point

const express = require('express');
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL
}) : null;

module.exports = { pool };

const propertiesRoutes = require('./routes/properties');
const usersRoutes = require('./routes/users');
const stripeRoutes = require('./routes/stripe');
const profilesRoutes = require('./routes/profiles');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(express.json());

// Health check endpoints (MUST come before other routes)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Real Estate Leads API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: Date.now(),
    database: 'checking',
    environment: process.env.NODE_ENV || 'development'
  };

  // Check database connection
  const testPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await testPool.query('SELECT 1');
    health.database = 'connected';
  } catch (err) {
    health.database = 'disconnected';
    health.database_error = err.message;
  } finally {
    await testPool.end();
  }

  res.json(health);
});

app.use('/api/properties', propertiesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown for Cloud Run
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});