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

// ADD THESE ROUTES
const propertiesRoutes = require('./routes/properties');
const usersRoutes = require('./routes/users');
const profilesRoutes = require('./routes/profiles');
const stripeRoutes = require('./routes/stripe');

app.use('/api/properties', checkDatabase, propertiesRoutes);
app.use('/api/users', checkDatabase, usersRoutes);
app.use('/api/profiles', checkDatabase, profilesRoutes);
app.use('/api/stripe', stripeRoutes); // Stripe doesn't need DB check

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  if (pool) await pool.end();
  process.exit(0);
});