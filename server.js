console.log('=== SERVER STARTUP ===');
console.log('Node:', process.version);
console.log('PORT:', process.env.PORT);

try {
  console.log('Loading express...');
  const express = require('express');
  console.log('✓ Express loaded');

  console.log('Loading database config...');
  const { pool, checkDatabase } = require('./config/database');
  console.log('✓ Database config loaded');

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.urlencoded({ extended: true }));

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
      }
    }
    res.json(health);
  });

  console.log('Loading routes...');
  
  console.log('  Loading properties...');
  const propertiesRoutes = require('./routes/properties');
  console.log('  ✓ Properties');

  console.log('  Loading users...');
  const usersRoutes = require('./routes/users');
  console.log('  ✓ Users');

  console.log('  Loading stripe...');
  const stripeRoutes = require('./routes/stripe');
  console.log('  ✓ Stripe');

  console.log('  Loading profiles...');
  const profilesRoutes = require('./routes/profiles');
  console.log('  ✓ Profiles');

  console.log('  Loading ai...');
  const aiRoutes = require('./routes/ai');
  console.log('  ✓ AI');

  console.log('  Loading admin...');
  const adminRoutes = require('./routes/admin');
  const savedLeadsRoutes = require('./routes/saved-leads');
  console.log('  ✓ Admin');

  console.log('  Loading voice-ai...');
  const voiceAiRoutes = require('./routes/voice-ai');
  console.log('  ✓ Voice AI');

  console.log('  Loading appointments...');
  const appointmentsRoutes = require('./routes/appointments');
  console.log('  ✓ Appointments');

  console.log('Mounting routes...');
  app.use('/api/properties', checkDatabase, propertiesRoutes);
  app.use('/api/users', checkDatabase, usersRoutes);
  app.use('/api/stripe', checkDatabase, stripeRoutes);
  app.use('/api/profiles', checkDatabase, profilesRoutes);
  app.use('/api/ai', checkDatabase, aiRoutes);
  app.use('/api/admin', checkDatabase, adminRoutes);
  app.use('/api/saved-leads', checkDatabase, savedLeadsRoutes);
  app.use('/api/voice-ai', checkDatabase, voiceAiRoutes);
  app.use('/api/appointments', checkDatabase, appointmentsRoutes);
  console.log('✓ Routes mounted');

  app.use((err, req, res, next) => {
    console.error('ERROR:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const PORT = process.env.PORT || 8080;
  console.log('Starting server on port', PORT);
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log('✓✓✓ SERVER STARTED ✓✓✓');
  });

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received');
    if (pool) await pool.end();
    process.exit(0);
  });

} catch (err) {
  console.error('FATAL STARTUP ERROR:', err);
  process.exit(1);
}