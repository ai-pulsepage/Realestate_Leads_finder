const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_URL) {
  // Parse the connection string to check if it's a private IP (Cloud SQL)
  const isPrivateIP = process.env.DATABASE_URL.includes('172.27.64.3');
  const isProduction = process.env.NODE_ENV === 'production';

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

  // Test connection immediately on startup
  pool.query('SELECT 1 as test')
    .then((result) => {
      console.log('✓ Database connection test successful');
      console.log(`📍 Connected to: ${isPrivateIP ? 'Cloud SQL (VPC)' : 'External database'}`);
    })
    .catch(err => {
      console.error('✗ Database connection test failed:', err.message);
      if (err.code) console.error('Error code:', err.code);

      if (!isProduction) {
        console.log('\n💡 Local development troubleshooting:');
        console.log('1. Make sure your database proxy is running');
        console.log('2. Check DATABASE_URL in .env file');
        console.log('3. Verify database credentials');
        console.log('4. Run: node test-db-connection.js');
      }
    });
} else {
  console.error('❌ DATABASE_URL environment variable is not set');
  if (process.env.NODE_ENV !== 'production') {
    console.log('💡 Set DATABASE_URL in your .env file for local development');
  }
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
