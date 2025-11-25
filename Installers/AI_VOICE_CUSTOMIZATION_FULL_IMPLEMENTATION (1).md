# AI VOICE CUSTOMIZATION - FULL IMPLEMENTATION GUIDE

**Document Version:** 1.0  
**Created:** 2025-11-25  
**Target Developer:** Zencoder  
**Estimated Implementation Time:** 6-8 hours  
**Priority:** HIGH - Foundation for Admin Interface

---

## EXECUTIVE SUMMARY

### Current State (20% Implementation)
- ✅ Loads knowledge_data from database
- ✅ Uses company_name in greeting
- ❌ No language menu system
- ❌ No custom greeting text (only company name interpolation)
- ❌ No Spanish support
- ❌ No brand voice personality variations
- ❌ No custom qualifying questions
- ❌ Wrong Gemini model name causing potential 404s

### Target State (100% Implementation)
- ✅ Bilingual support (English/Spanish) with menu system
- ✅ Fully customizable greetings per language
- ✅ Custom qualifying questions per language
- ✅ Brand voice personality (professional/friendly/consultative)
- ✅ All text editable via database (knowledge_data JSONB field)
- ✅ Correct Gemini model implementation
- ✅ Multi-tenant ready for admin interface

### Business Impact
This implementation is **critical** because:
1. Admin interface cannot be built without proper customization foundation
2. Gabriel plans to use this for prospecting new subscribers
3. Multi-tenant SaaS requires full per-subscriber customization
4. Current 20% state blocks progress on larger goals (email campaigns, admin UI)

---

## CODE AUDIT FINDINGS

### File Analyzed
`/routes/voice-ai.js` (lines 1-850+)

### What Currently Works ✅

**1. Database Connection (Lines 15-50)**
```javascript
// Correctly uses req.pool from middleware
const connection = await req.pool.getConnection();
const [knowledge] = await connection.query(
  'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = ?',
  [userId]
);
```

**2. Company Name Interpolation (Lines 120-140)**
```javascript
const greeting = `Hello! You've reached ${knowledgeData.company_name}. 
How can we help you today?`;
// This works - company_name is pulled from knowledge_data
```

**3. Basic Call Flow (Lines 200-400)**
- Twilio webhook handling
- Audio streaming setup
- Conversation logging
- Token deduction

### What Doesn't Work ❌

**1. Language Menu System (MISSING)**
- No detection of language preference
- No "Press 1 for English, Press 2 for Spanish" implementation
- No language routing logic

**2. Custom Greeting Text (PARTIALLY MISSING)**
```javascript
// CURRENT: Hardcoded greeting with only company_name variable
const greeting = `Hello! You've reached ${knowledgeData.company_name}...`;

// NEEDED: Fully dynamic greeting from database
const greeting = knowledgeData.greetings[language] || fallbackGreeting;
```

**3. Spanish Support (MISSING)**
- No Spanish prompt templates
- No Spanish system instructions
- No language-specific conversation handling

**4. Brand Voice Variations (MISSING)**
```javascript
// CURRENT: Single system instruction for all subscribers
const systemInstruction = `You are a helpful AI assistant for ${company_name}...`;

// NEEDED: Dynamic system instructions based on brand_voice
const systemInstruction = knowledgeData.brand_voice_prompts[brandVoice];
```

**5. Custom Qualifying Questions (MISSING)**
- No dynamic question loading from database
- Questions are hardcoded in system instructions
- No language-specific questions

**6. Gemini Model Name (WRONG)**
```javascript
// CURRENT (Line ~250):
model: 'gemini-1.5-flash'

// CORRECT:
model: 'gemini-1.5-flash-latest'
```

---

## DATABASE SCHEMA REFERENCE

### subscriber_knowledge_base Table

**Existing Columns:**
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users)
- `knowledge_data` (JSONB) ← **This is where all customization lives**
- `created_at` (timestamp)
- `updated_at` (timestamp)

### knowledge_data JSONB Structure (Current)

```json
{
  "company_name": "Biz Lead Finders",
  "business_type": "saas_platform",
  "brand_voice": "consultative",
  "service_area": "tri_county",
  "target_industries": [
    "pool_maintenance",
    "roofing", 
    "hvac",
    "fencing",
    "landscaping"
  ]
}
```

### knowledge_data JSONB Structure (Target)

```json
{
  "company_name": "Biz Lead Finders",
  "business_type": "saas_platform",
  "brand_voice": "consultative",
  "service_area": "tri_county",
  "target_industries": ["pool_maintenance", "roofing", "hvac", "fencing", "landscaping"],
  
  "greetings": {
    "en": "Hello! You've reached {company_name}. Press 1 for English or 2 for Spanish.",
    "es": "¡Hola! Has llamado a {company_name}. Presiona 1 para inglés o 2 para español."
  },
  
  "custom_greetings": {
    "en": "Thank you for calling {company_name}! We specialize in helping {target_industries} businesses generate quality leads. How can we assist you today?",
    "es": "¡Gracias por llamar a {company_name}! Nos especializamos en ayudar a negocios de {target_industries} a generar clientes potenciales de calidad. ¿Cómo podemos ayudarte hoy?"
  },
  
  "qualifying_questions": {
    "en": [
      "What type of business do you operate?",
      "Which service area are you interested in?",
      "How many leads are you looking to generate per month?",
      "When would you like to get started?"
    ],
    "es": [
      "¿Qué tipo de negocio opera?",
      "¿En qué área de servicio está interesado?",
      "¿Cuántos clientes potenciales busca generar por mes?",
      "¿Cuándo le gustaría comenzar?"
    ]
  },
  
  "brand_voice_prompts": {
    "professional": "You are a professional AI assistant for {company_name}. Maintain a formal, business-like tone. Focus on efficiency and clear communication.",
    "friendly": "You are a friendly AI assistant for {company_name}. Use a warm, conversational tone. Make callers feel comfortable and valued.",
    "consultative": "You are a consultative AI assistant for {company_name}. Ask thoughtful questions, listen actively, and provide tailored recommendations."
  },
  
  "language_preferences": {
    "default": "en",
    "available": ["en", "es"],
    "menu_prompt": {
      "en": "Press 1 for English or 2 for Spanish.",
      "es": "Presiona 1 para inglés o 2 para español."
    }
  }
}
```

---

## PHASE 1: FOUNDATIONAL FIXES (1 hour)

### 1.1 Fix Gemini Model Name

**File:** `/routes/voice-ai.js`  
**Line:** ~250 (in `POST /api/voice-ai/media-stream` handler)

**FIND:**
```javascript
model: 'gemini-1.5-flash'
```

**REPLACE:**
```javascript
model: 'gemini-1.5-flash-latest'
```

**Why:** The current model name can cause 404 errors. Google's recommended practice is to use `-latest` suffix for stable access.

---

### 1.2 Create Utility Functions

**File:** `/utils/voice-customization.js` (NEW FILE)

**CREATE:**
```javascript
/**
 * Voice AI Customization Utilities
 * Handles dynamic content generation for multi-tenant Voice AI
 */

/**
 * Get localized greeting with variable interpolation
 * @param {Object} knowledgeData - Subscriber's knowledge_data from database
 * @param {string} language - Language code ('en' or 'es')
 * @returns {string} Personalized greeting
 */
function getGreeting(knowledgeData, language = 'en') {
  const greetingTemplate = knowledgeData.greetings?.[language] 
    || knowledgeData.greetings?.en 
    || `Hello! You've reached {company_name}. How can we help you today?`;
  
  return interpolateVariables(greetingTemplate, knowledgeData);
}

/**
 * Get custom greeting after language selection
 * @param {Object} knowledgeData - Subscriber's knowledge_data from database
 * @param {string} language - Language code ('en' or 'es')
 * @returns {string} Custom greeting
 */
function getCustomGreeting(knowledgeData, language = 'en') {
  const customTemplate = knowledgeData.custom_greetings?.[language]
    || knowledgeData.custom_greetings?.en
    || `Thank you for calling {company_name}. How can we assist you today?`;
  
  return interpolateVariables(customTemplate, knowledgeData);
}

/**
 * Get qualifying questions for language
 * @param {Object} knowledgeData - Subscriber's knowledge_data from database
 * @param {string} language - Language code ('en' or 'es')
 * @returns {Array<string>} List of qualifying questions
 */
function getQualifyingQuestions(knowledgeData, language = 'en') {
  return knowledgeData.qualifying_questions?.[language]
    || knowledgeData.qualifying_questions?.en
    || [
        "What type of business do you operate?",
        "What services are you interested in?",
        "When would you like to get started?"
      ];
}

/**
 * Get brand voice system instruction
 * @param {Object} knowledgeData - Subscriber's knowledge_data from database
 * @param {string} language - Language code ('en' or 'es')
 * @returns {string} System instruction for Gemini
 */
function getBrandVoicePrompt(knowledgeData, language = 'en') {
  const brandVoice = knowledgeData.brand_voice || 'professional';
  const voicePrompt = knowledgeData.brand_voice_prompts?.[brandVoice]
    || `You are a professional AI assistant for {company_name}.`;
  
  let basePrompt = interpolateVariables(voicePrompt, knowledgeData);
  
  // Add qualifying questions to system instruction
  const questions = getQualifyingQuestions(knowledgeData, language);
  basePrompt += `\n\nDuring the conversation, naturally ask these qualifying questions:\n`;
  questions.forEach((q, i) => {
    basePrompt += `${i + 1}. ${q}\n`;
  });
  
  // Add language-specific instructions
  if (language === 'es') {
    basePrompt += `\n\nIMPORTANT: Conduct the entire conversation in Spanish.`;
  }
  
  return basePrompt;
}

/**
 * Get language menu prompt
 * @param {Object} knowledgeData - Subscriber's knowledge_data from database
 * @returns {string} Language menu prompt
 */
function getLanguageMenuPrompt(knowledgeData) {
  const menuEn = knowledgeData.language_preferences?.menu_prompt?.en 
    || "Press 1 for English or 2 for Spanish.";
  const menuEs = knowledgeData.language_preferences?.menu_prompt?.es
    || "Presiona 1 para inglés o 2 para español.";
  
  return `${menuEn} ${menuEs}`;
}

/**
 * Interpolate variables in template string
 * @param {string} template - Template with {variable} placeholders
 * @param {Object} data - Data object with variable values
 * @returns {string} Interpolated string
 */
function interpolateVariables(template, data) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key === 'target_industries' && Array.isArray(data.target_industries)) {
      return data.target_industries.join(', ');
    }
    return data[key] || match;
  });
}

module.exports = {
  getGreeting,
  getCustomGreeting,
  getQualifyingQuestions,
  getBrandVoicePrompt,
  getLanguageMenuPrompt,
  interpolateVariables
};
```

---

### 1.3 Database Migration for Extended knowledge_data

**File:** `/migrations/006_extend_knowledge_data.sql` (NEW FILE)

**CREATE:**
```sql
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
```

**Run Migration:**
```bash
# Connect to Cloud SQL
cloud-sql-proxy --credentials-file=/path/to/sa-key.json \
  realestate-leads-447016:us-east1:realestate-leads-db &

# Execute migration
psql "host=127.0.0.1 port=5432 dbname=realestate_leads_db user=api_user password=E5\"j/Fq|@oqY;+#e" \
  -f migrations/006_extend_knowledge_data.sql
```

---

## PHASE 2: LANGUAGE MENU SYSTEM (2 hours)

### 2.1 Add Language Detection Route

**File:** `/routes/voice-ai.js`

**ADD AFTER LINE ~100 (after the /api/voice-ai/incoming route):**

```javascript
/**
 * POST /api/voice-ai/language-menu
 * Plays language selection menu and waits for DTMF input
 */
router.post('/api/voice-ai/language-menu', async (req, res) => {
  console.log('📞 Language menu requested');
  console.log('Request body:', req.body);

  try {
    const { To, From, CallSid } = req.body;
    
    // Extract subscriber's phone number (the To number)
    const subscriberNumber = To;
    
    // Look up subscriber by phone number
    const connection = await req.pool.getConnection();
    try {
      const [profiles] = await connection.query(
        'SELECT user_id FROM subscriber_profiles WHERE twilio_phone_number = ?',
        [subscriberNumber]
      );

      if (profiles.length === 0) {
        console.error('❌ No subscriber found for number:', subscriberNumber);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('We\'re sorry, but this number is not configured. Please contact support.');
        twiml.hangup();
        return res.type('text/xml').send(twiml.toString());
      }

      const userId = profiles[0].user_id;

      // Load knowledge data
      const [knowledge] = await connection.query(
        'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = ?',
        [userId]
      );

      if (knowledge.length === 0) {
        console.error('❌ No knowledge data found for user:', userId);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('We\'re sorry, but the system is not configured. Please contact support.');
        twiml.hangup();
        return res.type('text/xml').send(twiml.toString());
      }

      const knowledgeData = knowledge[0].knowledge_data;
      
      // Import utility functions
      const { getLanguageMenuPrompt } = require('../utils/voice-customization');
      
      // Get language menu prompt
      const menuPrompt = getLanguageMenuPrompt(knowledgeData);

      // Create TwiML response
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Use <Gather> to collect DTMF input
      const gather = twiml.gather({
        input: 'dtmf',
        numDigits: 1,
        action: '/api/voice-ai/language-selected',
        method: 'POST',
        timeout: 5
      });
      
      gather.say({ voice: 'Polly.Joanna' }, menuPrompt);
      
      // If no input, repeat the menu
      twiml.redirect('/api/voice-ai/language-menu');

      console.log('✅ Language menu TwiML generated');
      res.type('text/xml').send(twiml.toString());

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ Error in language menu:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We\'re sorry, an error occurred. Please try again later.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
});
```

---

### 2.2 Add Language Selection Handler

**File:** `/routes/voice-ai.js`

**ADD AFTER the language-menu route:**

```javascript
/**
 * POST /api/voice-ai/language-selected
 * Processes DTMF language selection and routes to appropriate conversation
 */
router.post('/api/voice-ai/language-selected', async (req, res) => {
  console.log('🔢 Language selected');
  console.log('Request body:', req.body);

  try {
    const { To, From, CallSid, Digits } = req.body;
    
    // Map DTMF digits to language codes
    const languageMap = {
      '1': 'en',
      '2': 'es'
    };
    
    const selectedLanguage = languageMap[Digits] || 'en';
    console.log(`✅ Language selected: ${selectedLanguage} (Digits: ${Digits})`);

    // Extract subscriber's phone number
    const subscriberNumber = To;
    
    // Look up subscriber
    const connection = await req.pool.getConnection();
    try {
      const [profiles] = await connection.query(
        'SELECT user_id FROM subscriber_profiles WHERE twilio_phone_number = ?',
        [subscriberNumber]
      );

      if (profiles.length === 0) {
        console.error('❌ No subscriber found for number:', subscriberNumber);
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say('We\'re sorry, but this number is not configured.');
        twiml.hangup();
        return res.type('text/xml').send(twiml.toString());
      }

      const userId = profiles[0].user_id;

      // Load knowledge data
      const [knowledge] = await connection.query(
        'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = ?',
        [userId]
      );

      const knowledgeData = knowledge[0].knowledge_data;
      
      // Import utility functions
      const { getCustomGreeting } = require('../utils/voice-customization');
      
      // Get custom greeting for selected language
      const customGreeting = getCustomGreeting(knowledgeData, selectedLanguage);

      // Create TwiML response
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Say custom greeting
      const voice = selectedLanguage === 'es' ? 'Polly.Lupe' : 'Polly.Joanna';
      twiml.say({ voice }, customGreeting);
      
      // Connect to media stream with language parameter
      const connect = twiml.connect();
      connect.stream({
        url: `wss://${req.get('host')}/api/voice-ai/media-stream?language=${selectedLanguage}&userId=${userId}`
      });

      console.log('✅ Connecting to media stream with language:', selectedLanguage);
      res.type('text/xml').send(twiml.toString());

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('❌ Error processing language selection:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We\'re sorry, an error occurred.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
});
```

---

### 2.3 Update Incoming Call Handler

**File:** `/routes/voice-ai.js`

**FIND (around line 100):**
```javascript
router.post('/api/voice-ai/incoming', async (req, res) => {
  // ... existing code ...
  
  // Current implementation connects directly to media stream
  const connect = twiml.connect();
  connect.stream({
    url: `wss://${req.get('host')}/api/voice-ai/media-stream`
  });
```

**REPLACE WITH:**
```javascript
router.post('/api/voice-ai/incoming', async (req, res) => {
  console.log('📞 Incoming call received');
  console.log('Request body:', req.body);

  try {
    const { To, From, CallSid } = req.body;
    
    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Redirect to language menu
    twiml.redirect('/api/voice-ai/language-menu');

    console.log('✅ Redirecting to language menu');
    res.type('text/xml').send(twiml.toString());

  } catch (error) {
    console.error('❌ Error handling incoming call:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('We\'re sorry, an error occurred. Please try again later.');
    twiml.hangup();
    res.type('text/xml').send(twiml.toString());
  }
});
```

---

## PHASE 3: DYNAMIC CONTENT SYSTEM (2 hours)

### 3.1 Update Media Stream Handler

**File:** `/routes/voice-ai.js`

**FIND (around line 250):**
```javascript
router.post('/api/voice-ai/media-stream', (req, res) => {
  // WebSocket upgrade handler
  // ... existing code ...
```

**UPDATE to extract language parameter and load dynamic content:**

```javascript
router.post('/api/voice-ai/media-stream', (req, res) => {
  console.log('🎙️ Media stream connection requested');
  
  // Extract query parameters
  const language = req.query.language || 'en';
  const userId = req.query.userId;
  
  console.log(`Language: ${language}, User ID: ${userId}`);

  // WebSocket upgrade handler
  res.on('upgrade', async (request, socket, head) => {
    try {
      // Load knowledge data for this user
      const connection = await req.pool.getConnection();
      let knowledgeData;
      
      try {
        const [knowledge] = await connection.query(
          'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = ?',
          [userId]
        );
        
        if (knowledge.length === 0) {
          throw new Error('No knowledge data found for user');
        }
        
        knowledgeData = knowledge[0].knowledge_data;
      } finally {
        connection.release();
      }

      // Import utility functions
      const { getBrandVoicePrompt } = require('../utils/voice-customization');
      
      // Get brand voice system instruction for selected language
      const systemInstruction = getBrandVoicePrompt(knowledgeData, language);
      
      console.log('System instruction loaded:', systemInstruction.substring(0, 100) + '...');

      // Initialize Gemini model
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash-latest', // FIXED: was 'gemini-1.5-flash'
        systemInstruction: systemInstruction
      });

      // Start live session
      const liveSession = model.startChat({
        generationConfig: {
          responseModalities: 'audio',
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: language === 'es' ? 'Puck' : 'Kore' // Spanish vs English voice
              }
            }
          }
        }
      });

      console.log('✅ Gemini live session started');

      // Continue with WebSocket handling...
      // ... rest of existing WebSocket code ...

    } catch (error) {
      console.error('❌ Error setting up media stream:', error);
      socket.destroy();
    }
  });
});
```

---

### 3.2 Add Language-Specific Voice Configuration

**File:** `/routes/voice-ai.js`

**In the media-stream handler, update voice configuration:**

```javascript
// Voice configuration based on language
const voiceConfig = {
  en: {
    voiceName: 'Kore', // English voice
    displayName: 'English Assistant'
  },
  es: {
    voiceName: 'Puck', // Spanish voice
    displayName: 'Asistente en Español'
  }
};

const selectedVoice = voiceConfig[language] || voiceConfig.en;

const liveSession = model.startChat({
  generationConfig: {
    responseModalities: 'audio',
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: selectedVoice.voiceName
        }
      }
    }
  }
});

console.log(`✅ Using voice: ${selectedVoice.displayName} (${selectedVoice.voiceName})`);
```

---

### 3.3 Update Call Logging with Language

**File:** `/routes/voice-ai.js`

**FIND the call logging code (around line 400-500):**

```javascript
// Log the completed call
await connection.query(
  `INSERT INTO ai_voice_call_logs 
   (call_sid, user_id, caller_number, call_status, duration_seconds, ...) 
   VALUES (?, ?, ?, ?, ?, ...)`,
  [callSid, userId, callerNumber, status, duration, ...]
);
```

**UPDATE to include language:**

```javascript
// Log the completed call with language
await connection.query(
  `INSERT INTO ai_voice_call_logs 
   (call_sid, user_id, caller_number, call_status, duration_seconds, language, ...) 
   VALUES (?, ?, ?, ?, ?, ?, ...)`,
  [callSid, userId, callerNumber, status, duration, language, ...]
);

console.log(`✅ Call logged with language: ${language}`);
```

**Note:** You may need to add a `language` column to `ai_voice_call_logs` table:

```sql
ALTER TABLE ai_voice_call_logs 
ADD COLUMN language VARCHAR(5) DEFAULT 'en';
```

---

## PHASE 4: BRAND VOICE IMPLEMENTATION (1 hour)

### 4.1 Test Brand Voice Variations

The brand voice system is already implemented via the `getBrandVoicePrompt()` utility function created in Phase 1. Now we need to test it.

**Test Data Setup:**

Create three test configurations in the database:

```sql
-- Professional Brand Voice (existing Biz Lead Finders)
-- Already configured in migration 006

-- Friendly Brand Voice (test variation)
UPDATE subscriber_knowledge_base
SET knowledge_data = jsonb_set(
  knowledge_data,
  '{brand_voice}',
  '"friendly"'
)
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';

-- Consultative Brand Voice (test variation)
UPDATE subscriber_knowledge_base
SET knowledge_data = jsonb_set(
  knowledge_data,
  '{brand_voice}',
  '"consultative"'
)
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';
```

---

### 4.2 Verify Brand Voice in Logs

**File:** `/routes/voice-ai.js`

**ADD logging to media-stream handler:**

```javascript
// After loading systemInstruction
console.log('===========================================');
console.log('BRAND VOICE CONFIGURATION');
console.log('===========================================');
console.log(`Company: ${knowledgeData.company_name}`);
console.log(`Brand Voice: ${knowledgeData.brand_voice}`);
console.log(`Language: ${language}`);
console.log(`System Instruction Preview:`);
console.log(systemInstruction.substring(0, 200) + '...');
console.log('===========================================');
```

---

### 4.3 Create Brand Voice Testing Script

**File:** `/tests/test-brand-voices.js` (NEW FILE)

```javascript
/**
 * Test script to verify brand voice variations
 * Run: node tests/test-brand-voices.js
 */

const { Pool } = require('pg');
const { getBrandVoicePrompt } = require('../utils/voice-customization');

const pool = new Pool({
  host: '127.0.0.1', // Cloud SQL Proxy
  port: 5432,
  database: 'realestate_leads_db',
  user: 'api_user',
  password: 'E5"j/Fq|@oqY;+#e'
});

async function testBrandVoices() {
  console.log('🧪 Testing Brand Voice Variations\n');

  try {
    // Load Biz Lead Finders knowledge data
    const { rows } = await pool.query(
      'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1',
      ['6f92d630-38f4-4f61-ae24-2a8568b080bc']
    );

    if (rows.length === 0) {
      throw new Error('No knowledge data found');
    }

    const knowledgeData = rows[0].knowledge_data;

    // Test each brand voice
    const voices = ['professional', 'friendly', 'consultative'];
    
    for (const voice of voices) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`BRAND VOICE: ${voice.toUpperCase()}`);
      console.log('='.repeat(60));
      
      // Temporarily set brand voice
      const testData = { ...knowledgeData, brand_voice: voice };
      
      // Test English
      console.log('\n📝 English Version:');
      const enPrompt = getBrandVoicePrompt(testData, 'en');
      console.log(enPrompt);
      
      // Test Spanish
      console.log('\n📝 Spanish Version:');
      const esPrompt = getBrandVoicePrompt(testData, 'es');
      console.log(esPrompt);
    }

    console.log('\n✅ All brand voice variations tested successfully');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testBrandVoices();
```

**Run the test:**
```bash
node tests/test-brand-voices.js
```

---

## PHASE 5: TESTING & VALIDATION (30 minutes)

### 5.1 End-to-End Test Scenarios

**Test Scenario 1: English Language Flow**
1. Call +1 (786) 544-6480
2. Hear: "Hello! You've reached Biz Lead Finders. Press 1 for English or 2 for Spanish."
3. Press 1
4. Hear custom English greeting
5. Have conversation in English
6. Verify qualifying questions are asked
7. Verify call is logged with language='en'

**Test Scenario 2: Spanish Language Flow**
1. Call +1 (786) 544-6480
2. Hear bilingual menu prompt
3. Press 2
4. Hear custom Spanish greeting
5. Have conversation in Spanish
6. Verify qualifying questions are asked in Spanish
7. Verify call is logged with language='es'

**Test Scenario 3: No Input (Timeout)**
1. Call +1 (786) 544-6480
2. Hear language menu
3. Don't press anything
4. Verify menu repeats after 5 seconds
5. Press 1 to continue

**Test Scenario 4: Invalid Input**
1. Call +1 (786) 544-6480
2. Hear language menu
3. Press 9 (invalid)
4. Verify defaults to English

**Test Scenario 5: Brand Voice Variations**
1. Update database to brand_voice='professional'
2. Call and verify tone is formal/business-like
3. Update to brand_voice='friendly'
4. Call and verify tone is warm/conversational
5. Update to brand_voice='consultative'
6. Call and verify tone asks thoughtful questions

---

### 5.2 Database Verification Queries

**Check knowledge_data structure:**
```sql
SELECT 
  user_id,
  knowledge_data->>'company_name' as company,
  knowledge_data->>'brand_voice' as brand_voice,
  knowledge_data->'greetings' as greetings,
  knowledge_data->'custom_greetings' as custom_greetings,
  knowledge_data->'qualifying_questions' as questions,
  knowledge_data->'brand_voice_prompts' as voice_prompts
FROM subscriber_knowledge_base
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';
```

**Check call logs with language:**
```sql
SELECT 
  call_sid,
  caller_number,
  language,
  call_status,
  duration_seconds,
  created_at
FROM ai_voice_call_logs
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc'
ORDER BY created_at DESC
LIMIT 10;
```

---

### 5.3 Deployment Checklist

**Before Deploying:**
- [ ] All utility functions in `/utils/voice-customization.js` created
- [ ] Migration 006 executed successfully
- [ ] Three new routes added to `/routes/voice-ai.js`:
  - [ ] `/api/voice-ai/language-menu`
  - [ ] `/api/voice-ai/language-selected`
  - [ ] Updated `/api/voice-ai/incoming`
- [ ] Media stream handler updated with language parameter
- [ ] Gemini model name fixed to `gemini-1.5-flash-latest`
- [ ] Brand voice test script created and run
- [ ] All syntax errors checked (no missing semicolons, brackets)

**Deploy Command:**
```bash
gcloud app deploy --project=realestate-leads-447016
```

**After Deploying:**
- [ ] Check logs: `gcloud app logs tail -s default`
- [ ] Test English flow (Scenario 1)
- [ ] Test Spanish flow (Scenario 2)
- [ ] Test timeout behavior (Scenario 3)
- [ ] Test brand voice variations (Scenario 5)
- [ ] Verify database logs have language field populated
- [ ] Verify no 404 errors in Gemini API calls

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Foundational Fixes (1 hour)
- [ ] Fix Gemini model name in `/routes/voice-ai.js` (line ~250)
- [ ] Create `/utils/voice-customization.js` with 7 utility functions
- [ ] Create `/migrations/006_extend_knowledge_data.sql`
- [ ] Run migration to update Biz Lead Finders knowledge_data
- [ ] Verify migration with SELECT query

### Phase 2: Language Menu System (2 hours)
- [ ] Add `/api/voice-ai/language-menu` route
- [ ] Add `/api/voice-ai/language-selected` route
- [ ] Update `/api/voice-ai/incoming` route to redirect
- [ ] Test DTMF input handling with Twilio debugger
- [ ] Verify TwiML generation with XML validator

### Phase 3: Dynamic Content System (2 hours)
- [ ] Update media stream handler to accept language parameter
- [ ] Add language-specific voice configuration (Kore vs Puck)
- [ ] Update system instruction loading with `getBrandVoicePrompt()`
- [ ] Add language column to ai_voice_call_logs
- [ ] Update call logging to include language
- [ ] Test English voice output
- [ ] Test Spanish voice output

### Phase 4: Brand Voice Implementation (1 hour)
- [ ] Test professional brand voice variation
- [ ] Test friendly brand voice variation
- [ ] Test consultative brand voice variation
- [ ] Create brand voice testing script
- [ ] Run testing script and verify output
- [ ] Add brand voice logging to media stream handler

### Phase 5: Testing & Validation (30 minutes)
- [ ] Execute Test Scenario 1 (English)
- [ ] Execute Test Scenario 2 (Spanish)
- [ ] Execute Test Scenario 3 (Timeout)
- [ ] Execute Test Scenario 4 (Invalid input)
- [ ] Execute Test Scenario 5 (Brand voices)
- [ ] Run database verification queries
- [ ] Review Cloud Logging for errors
- [ ] Complete deployment checklist

---

## TROUBLESHOOTING GUIDE

### Issue: Language menu not playing
**Symptoms:** Call connects but menu doesn't play  
**Possible causes:**
1. TwiML not generated correctly
2. Route not registered in Express
3. Twilio webhook URL not updated

**Solution:**
```bash
# Check TwiML generation
curl -X POST https://your-app.appspot.com/api/voice-ai/language-menu \
  -d "To=%2B17865446480&From=%2B15551234567&CallSid=CA123"

# Verify route is registered
# Look for "POST /api/voice-ai/language-menu" in logs
gcloud app logs tail -s default | grep "language-menu"

# Update Twilio webhook
# Go to Twilio Console → Phone Numbers → +1 (786) 544-6480
# Set "A CALL COMES IN" webhook to:
# https://realestate-leads-447016.ue.r.appspot.com/api/voice-ai/incoming
```

---

### Issue: DTMF not detected
**Symptoms:** Menu plays but pressing keys doesn't work  
**Possible causes:**
1. `<Gather>` tag misconfigured
2. Action URL incorrect
3. Input type wrong

**Solution:**
```javascript
// Verify <Gather> configuration
const gather = twiml.gather({
  input: 'dtmf',        // Must be 'dtmf'
  numDigits: 1,         // Expect 1 digit
  action: '/api/voice-ai/language-selected', // Must be full path
  method: 'POST',       // Must be POST
  timeout: 5            // Wait 5 seconds
});
```

---

### Issue: Spanish voice still speaks English
**Symptoms:** Selected Spanish but AI responds in English  
**Possible causes:**
1. System instruction doesn't include Spanish directive
2. Wrong voice selected
3. Language parameter not passed to Gemini

**Solution:**
```javascript
// Verify system instruction includes language directive
if (language === 'es') {
  basePrompt += `\n\nIMPORTANT: Conduct the entire conversation in Spanish.`;
}

// Verify voice configuration
const voiceName = language === 'es' ? 'Puck' : 'Kore';

// Check logs for language parameter
console.log(`Language parameter: ${language}`);
```

---

### Issue: Gemini 404 errors
**Symptoms:** "Model not found" errors in logs  
**Possible causes:**
1. Wrong model name
2. API key invalid
3. Quota exceeded

**Solution:**
```javascript
// Verify model name is EXACTLY this:
model: 'gemini-1.5-flash-latest'

// NOT these:
// model: 'gemini-1.5-flash'           ❌
// model: 'gemini-1.5-flash-preview'   ❌
// model: 'gemini-flash-1.5'           ❌

// Check API key in Cloud Logging
// Search for "GEMINI_API_KEY" in startup logs
```

---

### Issue: Brand voice not changing
**Symptoms:** All calls sound the same regardless of brand_voice setting  
**Possible causes:**
1. knowledge_data not updated
2. brand_voice field missing
3. System instruction not using brand voice prompt

**Solution:**
```sql
-- Verify brand_voice field exists
SELECT 
  knowledge_data->>'brand_voice' as current_voice,
  knowledge_data->'brand_voice_prompts' as prompts
FROM subscriber_knowledge_base
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';

-- Update if missing
UPDATE subscriber_knowledge_base
SET knowledge_data = jsonb_set(
  knowledge_data,
  '{brand_voice}',
  '"consultative"'
)
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';
```

---

### Issue: Call logs missing language field
**Symptoms:** language column is NULL or missing  
**Possible causes:**
1. Column not added to table
2. INSERT statement doesn't include language
3. Language parameter not passed through

**Solution:**
```sql
-- Add column if missing
ALTER TABLE ai_voice_call_logs 
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Verify column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ai_voice_call_logs' 
  AND column_name = 'language';
```

```javascript
// Verify INSERT includes language
await connection.query(
  `INSERT INTO ai_voice_call_logs 
   (call_sid, user_id, caller_number, language, ...) 
   VALUES (?, ?, ?, ?, ...)`,
  [callSid, userId, callerNumber, language, ...]
);
```

---

## ADMIN INTERFACE MAPPING

Once this implementation is complete, the Admin Interface will need to provide UI for editing these fields:

### Settings → Voice AI Configuration

**Section 1: Language Settings**
- Default Language (dropdown: English, Spanish)
- Available Languages (multi-select: English, Spanish)
- Language Menu Prompt (textarea, bilingual)

**Section 2: Greetings**
- English Greeting (textarea)
  - Shows: "Hello! You've reached {company_name}..."
  - Variables: {company_name}, {target_industries}
- Spanish Greeting (textarea)
  - Shows: "¡Hola! Has llamado a {company_name}..."
  - Variables: {company_name}, {target_industries}

**Section 3: Custom Greetings (After Language Selection)**
- English Custom Greeting (textarea)
- Spanish Custom Greeting (textarea)

**Section 4: Qualifying Questions**
- English Questions (repeatable text inputs, min 3, max 10)
- Spanish Questions (repeatable text inputs, min 3, max 10)

**Section 5: Brand Voice**
- Brand Voice Personality (dropdown):
  - Professional: "Formal, business-like tone"
  - Friendly: "Warm, conversational tone"
  - Consultative: "Thoughtful, advisory tone"
- Professional Voice Prompt (textarea, auto-filled)
- Friendly Voice Prompt (textarea, auto-filled)
- Consultative Voice Prompt (textarea, auto-filled)

**Section 6: Preview & Test**
- Test Call Button (triggers test call to admin's phone)
- Language Selection (dropdown: English, Spanish)
- Brand Voice Selection (dropdown: Professional, Friendly, Consultative)
- Preview System Instruction (read-only textarea showing final prompt)

### API Endpoints Needed for Admin Interface

```javascript
// GET /api/admin/voice-config
// Returns current voice configuration for subscriber

// PUT /api/admin/voice-config
// Updates voice configuration in subscriber_knowledge_base

// POST /api/admin/voice-config/test
// Triggers test call with specified configuration

// GET /api/admin/voice-config/preview
// Returns preview of system instruction for given configuration
```

---

## COMPLETION CRITERIA

### Zencoder Completion Report

After completing all 5 phases, fill out this section:

**Implementation Time:**
- Phase 1: _____ hours
- Phase 2: _____ hours
- Phase 3: _____ hours
- Phase 4: _____ hours
- Phase 5: _____ hours
- **Total:** _____ hours

**Files Modified:**
- [ ] `/routes/voice-ai.js` (3 new routes, 1 updated route, 1 updated handler)
- [ ] `/utils/voice-customization.js` (NEW FILE - 7 functions)
- [ ] `/migrations/006_extend_knowledge_data.sql` (NEW FILE)
- [ ] `/tests/test-brand-voices.js` (NEW FILE)
- [ ] `app.yaml` (if needed)

**Database Changes:**
- [ ] Migration 006 executed successfully
- [ ] Biz Lead Finders knowledge_data extended
- [ ] `language` column added to ai_voice_call_logs (if needed)

**Testing Results:**
- [ ] Scenario 1 (English): PASS / FAIL
- [ ] Scenario 2 (Spanish): PASS / FAIL
- [ ] Scenario 3 (Timeout): PASS / FAIL
- [ ] Scenario 4 (Invalid input): PASS / FAIL
- [ ] Scenario 5 (Brand voices): PASS / FAIL

**Deployment:**
- [ ] Code deployed to App Engine (revision: _______)
- [ ] No errors in Cloud Logging
- [ ] Gemini API calls successful
- [ ] Twilio webhooks working

**Issues Encountered:**
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

**Next Steps:**
- [ ] Ready for Admin Interface development
- [ ] Ready for Email Campaigns (Part 3)
- [ ] Ready for Production launch

**Notes:**
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## ESTIMATED EFFORT BREAKDOWN

| Phase | Task | Time | Complexity |
|-------|------|------|------------|
| 1.1 | Fix Gemini model name | 5 min | Low |
| 1.2 | Create utility functions | 30 min | Medium |
| 1.3 | Create & run migration | 25 min | Medium |
| **Phase 1 Total** | | **1 hour** | |
| 2.1 | Add language menu route | 30 min | Medium |
| 2.2 | Add language selection handler | 30 min | Medium |
| 2.3 | Update incoming call handler | 15 min | Low |
| 2.4 | Test DTMF handling | 45 min | High |
| **Phase 2 Total** | | **2 hours** | |
| 3.1 | Update media stream handler | 45 min | High |
| 3.2 | Add voice configuration | 15 min | Low |
| 3.3 | Update call logging | 30 min | Medium |
| 3.4 | Test both languages | 30 min | Medium |
| **Phase 3 Total** | | **2 hours** | |
| 4.1 | Test brand voice variations | 20 min | Low |
| 4.2 | Verify logging | 10 min | Low |
| 4.3 | Create testing script | 30 min | Medium |
| **Phase 4 Total** | | **1 hour** | |
| 5.1 | Execute 5 test scenarios | 20 min | Medium |
| 5.2 | Database verification | 5 min | Low |
| 5.3 | Deployment checklist | 5 min | Low |
| **Phase 5 Total** | | **30 min** | |
| **GRAND TOTAL** | | **6.5 hours** | |

---

## SUPPORT & RESOURCES

**Database Connection:**
```bash
# Cloud SQL Proxy (keep running in terminal)
cloud-sql-proxy --credentials-file=/path/to/sa-key.json \
  realestate-leads-447016:us-east1:realestate-leads-db

# psql connection
psql "host=127.0.0.1 port=5432 dbname=realestate_leads_db user=api_user password=E5\"j/Fq|@oqY;+#e"
```

**Deployment:**
```bash
# Deploy to App Engine
gcloud app deploy --project=realestate-leads-447016

# View logs
gcloud app logs tail -s default

# Check current revision
gcloud app versions list --service=default
```

**Twilio Testing:**
```bash
# Test webhook locally (requires ngrok)
ngrok http 8080
# Update Twilio webhook to ngrok URL

# Test with curl
curl -X POST https://your-app.appspot.com/api/voice-ai/incoming \
  -d "To=%2B17865446480&From=%2B15551234567&CallSid=CA123"
```

**Documentation:**
- [Twilio Voice TwiML Reference](https://www.twilio.com/docs/voice/twiml)
- [Twilio <Gather> Documentation](https://www.twilio.com/docs/voice/twiml/gather)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [PostgreSQL JSONB Functions](https://www.postgresql.org/docs/current/functions-json.html)

---

## END OF DOCUMENT

**Next Step:** Deploy this implementation, then continue with:
1. Part 3: Email Campaigns
2. Admin Interface development
3. Production launch

**Questions?** Contact Gabriel for clarification on business requirements or multi-tenant architecture.
