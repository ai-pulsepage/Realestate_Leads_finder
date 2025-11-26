const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_URL) {
  // Parse the connection string to check if it's a private IP (Cloud SQL)
  const isPrivateIP = process.env.DATABASE_URL.includes('172.27.64.3');
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction && !isPrivateIP,  // SSL for production, but not for private IPs
      max: isProduction ? 20 : 5,  // More connections in production
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: isProduction ? 20000 : 10000,  // Shorter timeout locally
      query_timeout: isProduction ? 15000 : 5000,  // Shorter query timeout locally
    });

    pool.on('error', (err) => {
      console.error('❌ Unexpected database pool error:', err.message);
      if (err.code) console.error('Error code:', err.code);
    });

    pool.on('connect', () => {
      console.log('✓ Database pool connection established');
    });

    console.log('✓ Database pool created successfully');
    console.log(`📍 Will connect to: ${isPrivateIP ? 'Cloud SQL (VPC)' : 'External database'}`);

    // Skip connection test to avoid startup failures - connections will be tested lazily
    console.log('⏭️ Skipping immediate database connection test (will test lazily)');

  } catch (error) {
    console.error('❌ Failed to create database pool:', error.message);
    console.log('⚠️ Application will continue without database connectivity');
    // Don't set pool to null - let the application handle missing pool gracefully
  }
} else {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('⚠️ Application will continue without database connectivity');
}

function checkDatabase(req, res, next) {
  if (!pool) {
    return res.status(503).json({
      error: 'Database not configured',
      message: 'DATABASE_URL environment variable is missing'
    });
  }
  req.pool = pool;
  next();
}

module.exports = { pool, checkDatabase };
