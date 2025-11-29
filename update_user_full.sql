-- Update User Email
UPDATE users 
SET email = 'Test_user@bizleadfinders.com' 
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';

-- Update Knowledge Base (Greetings) using jsonb_set to add the new keys
-- We wrap the new structure in jsonb_build_object to merge it properly
UPDATE subscriber_knowledge_base
SET knowledge_data = jsonb_set(
    jsonb_set(
        knowledge_data,
        '{languages,en}',
        '{"greeting": "Ahoy! Captain Jack here at Biz Lead Finders. Ready to hunt for some treasure leads?"}'::jsonb,
        true -- create if missing
    ),
    '{languages,es}',
    '{"greeting": "¡Ahoy! Aquí el Capitán Jack en Biz Lead Finders. ¿Listo para cazar tesoros?"}'::jsonb,
    true -- create if missing
)
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';
