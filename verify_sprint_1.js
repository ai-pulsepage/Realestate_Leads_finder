const { spawn } = require('child_process');
const axios = require('axios');
const { Pool } = require('pg');
const path = require('path');
const jwt = require('jsonwebtoken');

// Configuration
const TEST_PORT = 3001;
const API_URL = `http://localhost:${TEST_PORT}/api`;
const DB_CONFIG = {
    host: '127.0.0.1',
    port: 5433,
    database: 'real_estate_leads',
    user: 'api_user',
    password: 'E5"j/Fq|@oqY;+#e',
    ssl: false
};
const TEST_SECRET = 'test_secret_key_12345';

const pool = new Pool(DB_CONFIG);

let serverProcess;
let testUserId;
let testToken;

async function setupTestData() {
    console.log('🛠️ Setting up test data...');

    // Create or get a test user
    const email = 'test_sprint1@example.com';

    // 1. Create User
    const userResult = await pool.query(`
        INSERT INTO users (email, password_hash, token_balance)
        VALUES ($1, $2, 1000)
        ON CONFLICT (email) DO UPDATE SET token_balance = 1000
        RETURNING user_id
    `, [email, 'hash_placeholder']);

    testUserId = userResult.rows[0].user_id;
    console.log(`👤 Test User ID: ${testUserId}`);

    // 2. Generate JWT with known secret
    // routes/auth.js uses 'userId', so we match that.
    console.log('Payload:', { userId: testUserId, email });
    testToken = jwt.sign({ userId: testUserId, email }, TEST_SECRET, { expiresIn: '1h' });
    console.log('🔑 Test Token Generated');
}

async function startServer() {
    console.log('🚀 Starting server for testing...');
    return new Promise((resolve, reject) => {
        const env = {
            ...process.env,
            PORT: TEST_PORT,
            DATABASE_URL: `postgresql://api_user:E5%22j%2FFq%7C%40oqY%3B%2B%23e@127.0.0.1:5433/real_estate_leads`,
            JWT_SECRET: TEST_SECRET
        };

        serverProcess = spawn('node', ['server.js'], { env, cwd: __dirname });

        serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('[Server]:', output);
            if (output.includes('SERVER STARTED')) {
                resolve();
            }
        });

        serverProcess.stderr.on('data', (data) => {
            console.error('[Server Error]:', data.toString());
        });
    });
}

async function runTests() {
    try {
        console.log('\n🧪 STARTING TESTS\n');

        // Test 1: Check Token Pricing
        console.log('Test 1: GET /api/token-pricing/cost/email_send');
        const priceRes = await axios.get(`${API_URL}/token-pricing/cost/email_send?quantity=50`, {
            headers: { Authorization: `Bearer ${testToken}` }
        });

        if (priceRes.data.total_cost === 50 && priceRes.data.unit_cost === 1) {
            console.log('✅ Pricing API Correct: Cost is 50 tokens for 50 emails');
        } else {
            console.error('❌ Pricing API Failed:', priceRes.data);
        }

        // Test 2: Create Campaign (Deduction)
        console.log('\nTest 2: POST /api/email-campaigns (Token Deduction)');
        const recipients = Array(10).fill({ email: 'test@example.com' });

        const campaignRes = await axios.post(`${API_URL}/email-campaigns`, {
            user_id: testUserId,
            campaign_name: 'Verification Campaign',
            subject_line: 'Test',
            html_body: '<p>Test</p>',
            recipients: recipients
        }, {
            headers: { Authorization: `Bearer ${testToken}` }
        });

        if (campaignRes.status === 201) {
            console.log('✅ Campaign Created Successfully');
        } else {
            console.error('❌ Campaign Creation Failed:', campaignRes.status);
        }

        // Test 3: Verify Balance and Logs
        console.log('\nTest 3: Verify DB State');
        const userRes = await pool.query('SELECT token_balance FROM users WHERE user_id = $1', [testUserId]);
        const newBalance = userRes.rows[0].token_balance;

        // Initial was 1000. Cost was 10. Expect 990.
        if (newBalance === 990) {
            console.log(`✅ Balance Deducted Correctly: 1000 -> ${newBalance}`);
        } else {
            console.error(`❌ Balance Incorrect: Expected 990, got ${newBalance}`);
        }

        const logRes = await pool.query('SELECT * FROM token_usage_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [testUserId]);
        if (logRes.rows.length > 0 && logRes.rows[0].tokens_deducted === 10) {
            console.log('✅ Usage Logged Correctly');
        } else {
            console.error('❌ Usage Log Missing or Incorrect');
        }

    } catch (error) {
        console.error('❌ Test Execution Failed:', error.response ? error.response.data : error.message);
    }
}

async function cleanup() {
    console.log('\n🧹 Cleaning up...');
    if (serverProcess) serverProcess.kill();
    await pool.end();
}

// Main Execution
(async () => {
    try {
        await setupTestData();
        await startServer();
        await runTests();
    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await cleanup();
        process.exit(0);
    }
})();
