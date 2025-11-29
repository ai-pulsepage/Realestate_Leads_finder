const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateUser() {
    try {
        const userId = '6f92d630-38f4-4f61-ae24-2a8568b080bc';

        // 1. Update Email
        await pool.query('UPDATE users SET email = $1 WHERE user_id = $2', ['Test_user@bizleadfinders.com', userId]);
        console.log('✅ Email Updated');

        // 2. Fetch Knowledge Base
        const res = await pool.query('SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1', [userId]);
        let kb = res.rows[0].knowledge_data;

        // 3. Modify JSON in JS
        if (!kb.languages) kb.languages = {};

        // Ensure 'en' object exists
        if (!kb.languages.en) kb.languages.en = {};
        kb.languages.en.greeting = "Ahoy! Captain Jack here at Biz Lead Finders. Ready to hunt for some treasure leads?";

        // Ensure 'es' object exists
        if (!kb.languages.es) kb.languages.es = {};
        kb.languages.es.greeting = "¡Ahoy! Aquí el Capitán Jack en Biz Lead Finders. ¿Listo para cazar tesoros?";

        // 4. Write back to DB
        await pool.query('UPDATE subscriber_knowledge_base SET knowledge_data = $1 WHERE user_id = $2', [kb, userId]);
        console.log('✅ Knowledge Base Updated');

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

updateUser();
