require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function runMigration() {
  const pool = new Pool({
    host: '127.0.0.1',
    port: 5433,
    database: 'real_estate_leads',
    user: 'api_user',
    password: 'E5"j/Fq|@oqY;+#e',
    ssl: false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  try {
    const migrationFile = path.join(__dirname, 'migrations', '011_token_system.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('Running migration: 011_token_system.sql');
    await pool.query(sql);
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();