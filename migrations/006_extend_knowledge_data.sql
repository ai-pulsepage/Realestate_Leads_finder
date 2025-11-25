-- Migration: Extend knowledge_data structure for full customization
-- This migration updates existing records with full customization structure

-- Update Biz Lead Finders test subscriber with full structure
UPDATE subscriber_knowledge_base
SET knowledge_data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          knowledge_data,
          '{greetings}',
          '{"en": "Hello! You''ve reached {company_name}. Press 1 for English or 2 for Spanish.", "es": "¡Hola! Has llamado a {company_name}. Presiona 1 para inglés o 2 para español."}'::jsonb
        ),
        '{custom_greetings}',
        '{"en": "Thank you for calling {company_name}! We specialize in helping {target_industries} businesses generate quality leads. How can we assist you today?", "es": "¡Gracias por llamar a {company_name}! Nos especializamos en ayudar a negocios de {target_industries} a generar clientes potenciales de calidad. ¿Cómo podemos ayudarte hoy?"}'::jsonb
      ),
      '{qualifying_questions}',
      '{"en": ["What type of business do you operate?", "Which service area are you interested in?", "How many leads are you looking to generate per month?", "When would you like to get started?"], "es": ["¿Qué tipo de negocio opera?", "¿En qué área de servicio está interesado?", "¿Cuántos clientes potenciales busca generar por mes?", "¿Cuándo le gustaría comenzar?"]}'::jsonb
    ),
    '{brand_voice_prompts}',
    '{"professional": "You are a professional AI assistant for {company_name}. Maintain a formal, business-like tone. Focus on efficiency and clear communication.", "friendly": "You are a friendly AI assistant for {company_name}. Use a warm, conversational tone. Make callers feel comfortable and valued.", "consultative": "You are a consultative AI assistant for {company_name}. Ask thoughtful questions, listen actively, and provide tailored recommendations."}'::jsonb
  ),
  '{language_preferences}',
  '{"default": "en", "available": ["en", "es"], "menu_prompt": {"en": "Press 1 for English or 2 for Spanish.", "es": "Presiona 1 para inglés o 2 para español."}}'::jsonb
)
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';

-- Verify the update
SELECT
  user_id,
  knowledge_data->>'company_name' as company_name,
  knowledge_data->'greetings' as greetings,
  knowledge_data->'brand_voice_prompts' as brand_voice_prompts
FROM subscriber_knowledge_base
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';