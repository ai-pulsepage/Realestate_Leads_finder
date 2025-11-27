const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Running Migration 009...');
        const migrationPath = path.join(__dirname, 'migrations', '009_add_voice_settings.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolon to handle multiple statements if needed, 
        // but pg driver can often handle multiple. 
        // For safety, we'll just run the whole block if it's simple.

        await pool.query(migrationSQL);

        console.log('✅ Migration 009 completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
