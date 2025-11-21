const express = require('express');
const { pool, checkDatabase } = require('./config/database');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Real Estate Leads API', version: '1.0.0' });
});

app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    database: pool ? 'configured' : 'not configured',
    environment: process.env.NODE_ENV || 'development'
  };
  
  if (pool) {
    try {
      await pool.query('SELECT 1');
      health.database = 'connected';
    } catch (err) {
      health.database = 'error';
      health.database_error = err.message;
    }
  }
  
  res.json(health);
});

// Load all routes
const propertiesRoutes = require('./routes/properties');
const usersRoutes = require('./routes/users');
const stripeRoutes = require('./routes/stripe');
const profilesRoutes = require('./routes/profiles');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');

app.use('/api/properties', checkDatabase, propertiesRoutes);
app.use('/api/users', checkDatabase, usersRoutes);
app.use('/api/profiles', checkDatabase, profilesRoutes);
app.use('/api/ai', checkDatabase, aiRoutes);
app.use('/api/admin', checkDatabase, adminRoutes);
app.use('/api/stripe', stripeRoutes); // No DB check for webhooks

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  if (pool) await pool.end();
  process.exit(0);
});