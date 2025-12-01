const { Pool } = require('pg');

async function setupBaseSchema() {
    const connectionString = process.env.DATABASE_URL;

    const poolConfig = connectionString
        ? { connectionString }
        : {
            host: '127.0.0.1',
            port: 5432,
            database: 'real_estate_leads',
            user: 'api_user',
            password: 'E5"j/Fq|@oqY;+#e',
        };

    const pool = new Pool({
        ...poolConfig,
        ssl: false,
    });

    try {
        console.log('🏗️ Creating base schema...');

        // 1. Create Users Table
        console.log('👤 Creating users table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        company_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        subscription_tier VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

        // 2. Create Saved Leads Table
        console.log('🏠 Creating saved_leads table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS saved_leads (
        lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        property_address TEXT NOT NULL,
        owner_name VARCHAR(255),
        owner_phone VARCHAR(50),
        owner_email VARCHAR(255),
        estimated_value NUMERIC,
        status VARCHAR(50) DEFAULT 'new',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

        // 3. Create Subscriber Scripts Table (needed for voice campaigns)
        console.log('📜 Creating subscriber_scripts table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriber_scripts (
        script_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        script_name VARCHAR(255) NOT NULL,
        script_content TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

        console.log('✅ Base schema created successfully!');

    } catch (error) {
        console.error('❌ Schema setup failed:', error);
    } finally {
        await pool.end();
    }
}

setupBaseSchema();
