/**
 * Test script to verify brand voice variations
 * Run: node tests/test-brand-voices.js
 */

const { Pool } = require('pg');
const { getBrandVoicePrompt } = require('../utils/voice-customization');

const pool = new Pool({
  host: '127.0.0.1', // Cloud SQL Proxy
  port: 5432,
  database: 'real_estate_leads',
  user: 'api_user',
  password: 'E5"j/Fq|@oqY;+#e'
});

async function testBrandVoices() {
  console.log('🧪 Testing Brand Voice Variations\n');

  try {
    // Load Biz Lead Finders knowledge data
    const { rows } = await pool.query(
      'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1',
      ['6f92d630-38f4-4f61-ae24-2a8568b080bc']
    );

    if (rows.length === 0) {
      throw new Error('No knowledge data found');
    }

    const knowledgeData = rows[0].knowledge_data;

    // Test each brand voice
    const voices = ['professional', 'friendly', 'consultative'];

    for (const voice of voices) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`BRAND VOICE: ${voice.toUpperCase()}`);
      console.log('='.repeat(60));

      // Temporarily set brand voice
      const testData = { ...knowledgeData, brand_voice: voice };

      // Test English
      console.log('\n📝 English Version:');
      const enPrompt = getBrandVoicePrompt(testData, 'en');
      console.log(enPrompt);

      // Test Spanish
      console.log('\n📝 Spanish Version:');
      const esPrompt = getBrandVoicePrompt(testData, 'es');
      console.log(esPrompt);
    }

    console.log('\n✅ All brand voice variations tested successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testBrandVoices();