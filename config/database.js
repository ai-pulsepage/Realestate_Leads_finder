const { Pool } = require('pg');

let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });
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
