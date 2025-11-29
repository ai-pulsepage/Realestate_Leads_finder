const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

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

async function runMigration() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('Connected.');

        const migrationFile = path.join(__dirname, 'migrations', '012_inbound_intelligence.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        console.log('Running migration 012_inbound_intelligence.sql...');
        await client.query(sql);
        console.log('Migration completed successfully.');

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
