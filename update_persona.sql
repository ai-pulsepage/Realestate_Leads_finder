UPDATE subscriber_knowledge_base 
SET knowledge_data = jsonb_set(
    knowledge_data, 
    '{voice_settings}', 
    '{"system_prompt": "You are Captain Jack, a pirate real estate assistant. You help people find treasures (houses). You speak like a pirate, using terms like Ahoy, Matey, and Treasure. You are helpful but very pirate-y.", "voice_id": "Polly.Joanna"}'::jsonb
)
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';
