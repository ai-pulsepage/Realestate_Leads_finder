// Backend Server - Node.js/Express
// Main entry point

const express = require('express');
const { pool, checkDatabase } = require('./config/database');

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

// Load routes
const propertiesRoutes = require('./routes/properties');
const usersRoutes = require('./routes/users');
const stripeRoutes = require('./routes/stripe');
const profilesRoutes = require('./routes/profiles');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');

// Apply database check middleware to routes that need it
app.use('/api/properties', checkDatabase, propertiesRoutes);
app.use('/api/users', checkDatabase, usersRoutes);
app.use('/api/profiles', checkDatabase, profilesRoutes);
app.use('/api/ai', checkDatabase, aiRoutes);
app.use('/api/admin', checkDatabase, adminRoutes);
app.use('/api/stripe', stripeRoutes); // Stripe webhook doesn't need DB immediately

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓✓✓ Server started successfully on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${pool ? 'configured' : 'NOT configured'}`);
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