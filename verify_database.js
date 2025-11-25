/**
 * Database verification script for AI Voice Customization
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'real_estate_leads',
  user: 'api_user',
  password: 'E5"j/Fq|@oqY;+#e',
  ssl: false
});

async function verifyDatabase() {
  try {
    console.log('🔍 Database Verification - knowledge_data structure:');
    const result1 = await pool.query(`
      SELECT
        user_id,
        knowledge_data->>'company_name' as company,
        knowledge_data->>'brand_voice' as brand_voice,
        knowledge_data->'greetings' as greetings,
        knowledge_data->'custom_greetings' as custom_greetings,
        knowledge_data->'qualifying_questions' as questions,
        knowledge_data->'brand_voice_prompts' as voice_prompts
      FROM subscriber_knowledge_base
      WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc'
    `);
    console.log(JSON.stringify(result1.rows[0], null, 2));

    console.log('\n🔍 Database Verification - call logs language column:');
    const result2 = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'ai_voice_call_logs'
        AND column_name = 'language'
    `);
    console.log('Language column:', result2.rows[0]);

    console.log('\n✅ Database verification completed successfully!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await pool.end();
  }
}

verifyDatabase();