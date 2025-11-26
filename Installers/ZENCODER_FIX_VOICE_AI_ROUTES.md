# ZENCODER: Fix Voice AI Language Routes

## Problem Statement
The current voice-ai.js has WebSocket implementation but the language menu routes don't properly connect to it. We need to fix two routes to enable the bilingual Voice AI flow.

## Current State
- ✅ WebSocket `handleIncomingAudio` exists (line 1134)
- ✅ `/media-stream` WebSocket endpoint exists (line 1224)
- ❌ `/language-menu` doesn't use streamlined bilingual prompt
- ❌ `/language-selected` doesn't connect to WebSocket properly

## Required Changes

### Change 1: Fix `/language-menu` Route (Line 160)

**Replace the entire `/language-menu` route with:**

```javascript
router.post('/language-menu', async (req, res) => {
  console.log('📞 Language menu requested');
  console.log('Request body:', req.body);

  try {
    const { To, From, CallSid } = req.body;
    const subscriberNumber = To;

    // Look up subscriber by phone number
    const subscriberQuery = await req.pool.query(
      'SELECT user_id, email FROM users WHERE twilio_phone_number = $1',
      [subscriberNumber]
    );

    if (subscriberQuery.rows.length === 0) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('This number is not configured. Please contact support.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const subscriber = subscriberQuery.rows[0];
    const userId = subscriber.user_id;

    // Load subscriber's knowledge base
    const knowledgeQuery = await req.pool.query(
      'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1',
      [userId]
    );

    const knowledgeData = knowledgeQuery.rows[0]?.knowledge_data || {};

    // Create TwiML response with streamlined bilingual menu
    const twiml = new twilio.twiml.VoiceResponse();
    const gather = twiml.gather({
      numDigits: 1,
      action: '/api/voice-ai/language-selected',
      method: 'POST',
      timeout: 5
    });

    // Streamlined bilingual prompt (no redundancy)
    gather.say({ voice: 'Polly.Joanna', language: 'en-US' }, 'For English, press 1.');
    gather.say({ voice: 'Polly.Lupe', language: 'es-US' }, 'Para español, presione 2.');

    // If no input, repeat
    twiml.redirect('/api/voice-ai/language-menu');

    console.log('✅ Language menu generated');
    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error in language menu:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred. Please try again.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});
```

### Change 2: Fix `/language-selected` Route (Line 252)

**Replace the entire `/language-selected` route with:**

```javascript
router.post('/language-selected', async (req, res) => {
  console.log('📞 Language selected');
  console.log('Request body:', req.body);

  try {
    const { Digits, To, From, CallSid } = req.body;
    const language = Digits === '1' ? 'en' : Digits === '2' ? 'es' : 'en';
    const subscriberNumber = To;

    console.log(`✅ Selected language: ${language}`);

    // Look up subscriber
    const subscriberQuery = await req.pool.query(
      'SELECT user_id FROM users WHERE twilio_phone_number = $1',
      [subscriberNumber]
    );

    if (subscriberQuery.rows.length === 0) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Configuration error.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const userId = subscriberQuery.rows[0].user_id;

    // Update call log with language
    await req.pool.query(
      `UPDATE ai_voice_call_logs 
       SET language = $1, call_status = 'in-progress'
       WHERE call_sid = $2`,
      [language, CallSid]
    );

    // Load knowledge base
    const knowledgeQuery = await req.pool.query(
      'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1',
      [userId]
    );

    const knowledgeData = knowledgeQuery.rows[0]?.knowledge_data || {};
    const languageData = knowledgeData.languages?.[language] || {};
    
    // Get custom greeting (with underscore fix)
    let greeting = languageData.greeting;
    
    // If no custom greeting, use default
    if (!greeting) {
      greeting = language === 'en' 
        ? 'Welcome to our service. How can I help you today?' 
        : 'Bienvenido a nuestro servicio. ¿Cómo puedo ayudarle hoy?';
    }
    
    // Fix underscores in greeting (replace with spaces)
    const cleanGreeting = greeting.replace(/_/g, ' ');

    // Create TwiML with greeting and WebSocket connection
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Play custom greeting
    const voiceMap = { en: 'Polly.Joanna', es: 'Polly.Lupe' };
    const langMap = { en: 'en-US', es: 'es-US' };
    
    twiml.say({ 
      voice: voiceMap[language], 
      language: langMap[language] 
    }, cleanGreeting);

    // Connect to WebSocket for real-time conversation
    const host = req.get('host');
    const protocol = host.includes('localhost') ? 'ws' : 'wss';
    
    const connect = twiml.connect();
    connect.stream({
      url: `${protocol}://${host}/api/voice-ai/media-stream?language=${language}&userId=${userId}&callSid=${CallSid}`
    });

    console.log(`✅ Connected to WebSocket: ${protocol}://${host}/api/voice-ai/media-stream`);
    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error in language-selected:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});
```

## Implementation Steps

1. **Backup current file:**
   ```bash
   cp routes/voice-ai.js routes/voice-ai.js.backup
   ```

2. **Open file for editing:**
   ```bash
   nano routes/voice-ai.js
   ```

3. **Find and replace `/language-menu` route:**
   - Press `Ctrl+W`, search for `router.post('/language-menu'`
   - Delete from that line until the closing `});` of that route
   - Paste the new `/language-menu` code from Change 1

4. **Find and replace `/language-selected` route:**
   - Press `Ctrl+W`, search for `router.post('/language-selected'`
   - Delete from that line until the closing `});` of that route
   - Paste the new `/language-selected` code from Change 2

5. **Save and exit:**
   - Press `Ctrl+X`, then `Y`, then `Enter`

6. **Commit changes:**
   ```bash
   git add routes/voice-ai.js
   git commit -m "Fix: Connect language routes to WebSocket for real-time conversations

   - Update /language-menu with streamlined bilingual prompt
   - Update /language-selected to connect to WebSocket media-stream
   - Add custom greeting support with underscore fix
   - Pass language, userId, and callSid to WebSocket
   - Enable full bilingual Voice AI with Gemini Live API"
   
   git push origin main
   ```

7. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy real-estate-leads-api-00037-pcc \
     --source . \
     --region us-east1 \
     --allow-unauthenticated
   ```

## Expected Result

After deployment:
1. Caller dials +1 786-544-6480
2. Hears: "For English, press 1. Para español, presione 2."
3. Presses 1 or 2
4. Hears custom greeting in selected language
5. **Can have real-time conversation with Gemini AI** (not hang up)
6. Call logs show language, duration, and transcript

## Testing Checklist

- [ ] Call the number
- [ ] Hear streamlined language menu
- [ ] Press 1 for English
- [ ] Hear custom greeting without underscores
- [ ] **AI responds to your voice** (WebSocket working)
- [ ] Have multi-turn conversation
- [ ] Hang up naturally
- [ ] Check call logs show language and transcript
- [ ] Test again with Spanish (press 2)

## What This Fixes

- ✅ Streamlined bilingual prompt (no redundancy)
- ✅ Custom greetings from database
- ✅ Underscore pronunciation fix
- ✅ WebSocket connection for real-time conversations
- ✅ Language tracking in call logs
- ✅ Full Gemini Live API integration

## Time Estimate
- Implementation: 15 minutes
- Testing: 10 minutes
- Total: 25 minutes

---

**This is the FINAL piece needed to make Voice AI 100% functional.**
