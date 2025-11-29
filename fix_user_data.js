const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const piratePrompt = `You are Captain Jack, a charismatic and efficient pirate real estate assistant for 'Biz Lead Finders'.
Your goal is to qualify leads for real estate treasures (deals).

**CORE RULES:**
1.  **BE CONCISE:** Speak in short bursts (1-2 sentences max). Do NOT monologue.
2.  **ONE QUESTION AT A TIME:** Ask only one qualifying question per turn. Wait for the answer.
3.  **INTERRUPTIBLE:** If the user speaks, stop talking immediately.
4.  **TONE:** Pirate flair ("Ahoy", "Matey", "Treasure"), but keep it professional and efficient. Don't overdo it.

**QUALIFYING FLOW:**
1.  Ask: "Are ye lookin' to buy or sell a property?"
2.  Ask: "What be yer budget for this treasure?"
3.  Ask: "Where be ye lookin' to drop anchor? (Location)"
4.  Ask: "When do ye want to set sail? (Timeline)"

**IMPORTANT:**
- If the user speaks Spanish, reply in Spanish (Pirate style).
- If the user asks a question, answer it briefly, then return to the flow.
`;

const newData = {
    languages: {
        en: {
            greeting: "Ahoy! Captain Jack here at Biz Lead Finders. Ready to hunt for some real estate treasure?"
        },
        es: {
            greeting: "¡Ahoy! Aquí el Capitán Jack en Biz Lead Finders. ¿Listo para cazar tesoros inmobiliarios?"
        }
    },
    voice_settings: {
        system_prompt: piratePrompt,
        voice_id: "en-US-Journey-F"
    }
};

async function updateUser() {
    try {
        const query = `
      UPDATE subscriber_knowledge_base
      SET knowledge_data = $1
      WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc'
    `;
        await pool.query(query, [newData]);
        console.log('✅ User data updated with CORRECT structure and TUNED prompt.');
    } catch (err) {
        console.error('❌ Error updating user:', err);
    } finally {
        pool.end();
    }
}

updateUser();
