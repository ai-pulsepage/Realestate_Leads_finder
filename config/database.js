const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_URL) {
  // Parse the connection string to check if it's a private IP
  const isPrivateIP = process.env.DATABASE_URL.includes('172.27.64.3');
  
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,  // Private IP over VPC - no SSL needed
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,  // Increased for VPC cold starts
    query_timeout: 10000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  pool.on('connect', () => {
    console.log('✓ Database pool connection established');
  });

  // Test connection immediately on startup
  pool.query('SELECT 1')
    .then(() => console.log('✓ Database connection test successful'))
    .catch(err => console.error('✗ Database connection test failed:', err.message, err.code));
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
