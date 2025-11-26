#!/usr/bin/env node

/**
 * Local Database Connection Test
 * Run this before deploying to verify database connectivity
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('Please set DATABASE_URL in your .env file');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // Local proxy doesn't need SSL
    connectionTimeoutMillis: 10000,
    query_timeout: 5000,
  });

  try {
    console.log('⏳ Attempting to connect...');

    // Test basic connection
    const startTime = Date.now();
    const result = await pool.query('SELECT 1 as test, NOW() as current_time');
    const endTime = Date.now();

    console.log('✅ Database connection successful!');
    console.log(`⏱️  Response time: ${endTime - startTime}ms`);
    console.log('📊 Test query result:', result.rows[0]);

    // Test a more complex query (check if our tables exist)
    console.log('\n🔍 Checking Voice AI tables...');
    const tablesQuery = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'ai_voice_call_logs', 'subscriber_knowledge_base')
      ORDER BY table_name
    `);

    console.log('📋 Found tables:', tablesQuery.rows.map(r => r.table_name));

    // Test Voice AI specific queries
    console.log('\n🎙️ Testing Voice AI queries...');

    // Test user lookup (this is what fails in production)
    const userTest = await pool.query(
      'SELECT COUNT(*) as user_count FROM users WHERE voice_ai_enabled = true'
    );
    console.log(`👥 Users with Voice AI enabled: ${userTest.rows[0].user_count}`);

    console.log('\n✅ All database tests passed! Ready for deployment.');

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    console.error('Hint:', error.hint || 'Check your DATABASE_URL and ensure the database/proxy is running');

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('1. Make sure your database proxy is running');
      console.log('2. Check that DATABASE_URL points to the correct host/port');
      console.log('3. Verify database credentials are correct');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();