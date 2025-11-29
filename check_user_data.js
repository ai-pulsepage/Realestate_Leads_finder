const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUser() {
    try {
        const res = await pool.query(
            `SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc'`
        );
        console.log(JSON.stringify(res.rows[0].knowledge_data, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkUser();
