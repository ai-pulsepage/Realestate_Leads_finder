/**
 * Run Migration 006: Extend knowledge_data structure
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
    console.log('🔄 Running Migration 006: Extend knowledge_data structure...');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '006_extend_knowledge_data.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await pool.query(statement);
      }
    }

    console.log('✅ Migration 006 completed successfully!');

    // Verify the migration
    console.log('🔍 Verifying migration...');
    const result = await pool.query(`
      SELECT
        user_id,
        knowledge_data->>'company_name' as company_name,
        knowledge_data->'greetings' as greetings,
        knowledge_data->'brand_voice_prompts' as brand_voice_prompts
      FROM subscriber_knowledge_base
      WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc'
    `);

    console.log('Migration verification:', result.rows[0]);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();