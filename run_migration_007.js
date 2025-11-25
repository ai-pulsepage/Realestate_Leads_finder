/**
 * Run Migration 007: Add language column to ai_voice_call_logs
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: '172.27.64.3',
  port: 5432,
  database: 'real_estate_leads',
  user: 'api_user',
  password: 'E5"j/Fq|@oqY;+#e',
  ssl: false
});

async function runMigration() {
  try {
    console.log('🔄 Running Migration 007: Add language column to ai_voice_call_logs...');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '007_add_language_to_call_logs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration 007 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();