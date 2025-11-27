-- Migration: Add voice_settings to subscriber_knowledge_base
-- This allows storing custom system prompts and voice configurations

-- Note: We are adding this as a top-level key inside the existing JSONB column 'knowledge_data'
-- If we wanted a separate column, we would do ALTER TABLE ADD COLUMN.
-- But keeping it in JSONB allows for flexibility.

-- Update the existing test user with a default voice_settings structure
UPDATE subscriber_knowledge_base
SET knowledge_data = jsonb_set(
  knowledge_data,
  '{voice_settings}',
  '{
    "system_prompt": null,
    "voice_id": "Kore",
    "language": "en-US",
    "safety_settings": "medium",
    "last_updated": null
  }'::jsonb
)
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';

-- Verification
SELECT 
  user_id, 
  knowledge_data->'voice_settings' as voice_settings 
FROM subscriber_knowledge_base 
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';
