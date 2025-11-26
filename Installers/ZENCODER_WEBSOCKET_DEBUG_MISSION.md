# ZENCODER: Voice AI WebSocket Debug Mission

## CURRENT STATUS: Application Error on Call

**Deployment:** Cloud Run revision 00030-4jx
**Phone Number:** +1 786-544-6480
**Error:** "We're sorry, an application error has occurred" when calling

## WHAT WORKS ✅
- Language menu plays perfectly: "For English, press 1. Para español, presione 2."
- Custom greetings play without underscore pronunciation issues
- DTMF language selection (press 1 or 2) works

## WHAT FAILS ❌
- Application crashes immediately after greeting plays
- WebSocket connection to `/media-stream` route fails
- No real-time AI conversation happens

## ROOT ISSUE: WebSocket Query Parameter Extraction

**The Problem:**
The `/media-stream` route needs to extract `userId`, `language`, and `callSid` from the WebSocket upgrade request URL, but these parameters are coming through as `undefined`.

**Expected URL Format:**
```
wss://real-estate-leads-api-00037-pcc-775497803476.us-east1.run.app/api/voice-ai/media-stream?language=en&userId=6f92d630-38f4-4f61-ae24-2a8568b080bc&callSid=CAxxxx
```

**Current Code Location:** `routes/voice-ai.js` lines ~1227-1250

**Current Code:**
```javascript
router.all('/media-stream', (req, res) => {
  console.log('🎙️ Media stream connection requested');

  // WebSocket upgrade handler
  res.on('upgrade', async (request, socket, head) => {
    try {
      // Extract query parameters from WebSocket upgrade request URL
      const url = require('url');
      const parsedUrl = url.parse(request.url, true);
      const queryParams = parsedUrl.query;
      const language = queryParams.language || 'en';
      const userId = queryParams.userId;
      const callSid = queryParams.callSid;

      console.log(`✅ WebSocket params - Language: ${language}, User ID: ${userId}, Call SID: ${callSid}`);

      if (!userId) {
        console.error('❌ No userId provided');
        socket.destroy();
        return;
      }

      // Load knowledge data for this user...
```

**The Issue:**
This code SHOULD work, but logs show `undefined` for all params. The most recent deployment (00030-4jx) is now throwing an application error, suggesting the code might be crashing during startup or WebSocket initialization.

## YOUR MISSION

### Step 1: Check Deployment Logs for Startup Errors

```bash
gcloud run services logs read real-estate-leads-api-00037-pcc \
  --region us-east1 \
  --limit 300 | grep -i "error\|fatal\|crash\|failed"
```

**Look for:**
- Syntax errors during route loading
- Module import failures
- Startup crashes

### Step 2: Verify File Integrity

```bash
cd ~/Realestate_Leads_finder
node -c routes/voice-ai.js
```

**If syntax errors, fix them.**

### Step 3: Alternative WebSocket Approach

If the current approach isn't working, try this alternative that uses Express WebSocket library:

**Install ws package if needed:**
```bash
npm install ws --save
```

**Alternative Implementation for `/media-stream` route:**

```javascript
const WebSocket = require('ws');
const url = require('url');

router.all('/media-stream', (req, res) => {
  console.log('🎙️ Media stream connection requested');
  
  // Don't use res.on('upgrade') - let server handle upgrade
  // This route just acknowledges the request
  res.status(200).send('WebSocket endpoint ready');
});

// In server.js, add WebSocket server setup
// After app initialization, before app.listen():

const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;
  
  if (pathname === '/api/voice-ai/media-stream') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      handleVoiceAIWebSocket(ws, request, pool);
    });
  } else {
    socket.destroy();
  }
});

async function handleVoiceAIWebSocket(ws, request, pool) {
  try {
    // Extract query parameters
    const parsedUrl = url.parse(request.url, true);
    const { language = 'en', userId, callSid } = parsedUrl.query;
    
    console.log(`✅ WebSocket connected - Language: ${language}, User ID: ${userId}, Call SID: ${callSid}`);
    
    if (!userId) {
      console.error('❌ No userId provided');
      ws.close();
      return;
    }
    
    // Load knowledge data
    const knowledgeResult = await pool.query(
      'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1',
      [userId]
    );
    
    if (knowledgeResult.rows.length === 0) {
      console.error('❌ No knowledge data found');
      ws.close();
      return;
    }
    
    const knowledgeData = knowledgeResult.rows[0].knowledge_data;
    
    // Initialize Gemini
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const { getBrandVoicePrompt } = require('./utils/voice-customization');
    const systemInstruction = getBrandVoicePrompt(knowledgeData, language);
    
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      systemInstruction: systemInstruction
    });
    
    const voiceConfig = {
      en: { voiceName: 'Kore' },
      es: { voiceName: 'Puck' }
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
    
    console.log('✅ Gemini live session started');
    
    let streamSid = null;
    
    // Handle WebSocket messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.event) {
          case 'connected':
            console.log('📞 Twilio connected');
            break;
            
          case 'start':
            streamSid = data.start.streamSid;
            console.log('🎙️ Stream started:', streamSid);
            
            await pool.query(
              'UPDATE ai_voice_call_logs SET stream_sid = $1, call_status = $2 WHERE call_sid = $3',
              [streamSid, 'in-progress', callSid]
            );
            break;
            
          case 'media':
            await handleIncomingAudio(data.media, liveSession, ws, streamSid);
            break;
            
          case 'stop':
            console.log('🛑 Stream stopped');
            await finalizeCall(pool, userId, callSid, language);
            ws.close();
            break;
        }
      } catch (error) {
        console.error('❌ WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket closed');
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
    
  } catch (error) {
    console.error('❌ Error setting up WebSocket:', error);
    ws.close();
  }
}

// Helper functions (keep existing ones)
const { decode: decodeMulaw, encode: encodeMulaw } = require('g711');

async function handleIncomingAudio(mediaData, liveSession, ws, streamSid) {
  // Keep existing implementation
}

async function finalizeCall(pool, userId, callSid, language) {
  // Keep existing implementation
}
```

### Step 4: Check Dependencies

```bash
cd ~/Realestate_Leads_finder
cat package.json | grep -A 5 "dependencies"
```

**Ensure these are present:**
- `ws: "^8.18.3"` or later
- `g711: "^1.0.0"` or later
- `@google/generative-ai`: latest

### Step 5: Check Environment Variables

```bash
gcloud run services describe real-estate-leads-api-00037-pcc \
  --region us-east1 \
  --format='get(spec.template.spec.containers[0].env)' | grep GEMINI
```

**Verify GEMINI_API_KEY is set.**

### Step 6: Simplified Test

Before full WebSocket implementation, test if the route is even reachable:

```javascript
router.all('/media-stream', (req, res) => {
  console.log('🎙️ Media stream connection requested');
  console.log('Request URL:', req.url);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));
  res.status(200).send('OK');
});
```

Deploy this simplified version and check logs to see what's actually being received.

## EXPECTED OUTCOMES

After your fix:

1. **Logs should show:**
```
🎙️ Media stream connection requested
✅ WebSocket connected - Language: en, User ID: 6f92d630-38f4-4f61-ae24-2a8568b080bc, Call SID: CAxxxx
✅ Gemini live session started
📞 Twilio connected
🎙️ Stream started: MZxxxx
```

2. **Call flow should be:**
- Language menu plays
- Press 1 or 2
- Custom greeting plays
- **AI responds to caller's voice** (no hangup!)
- Conversation continues
- Proper hangup when done

3. **No more "application error" message**

## FILES TO CHECK

1. `routes/voice-ai.js` - Lines 1220-1400 (WebSocket handler)
2. `server.js` - WebSocket server setup
3. `package.json` - Dependencies
4. `utils/voice-customization.js` - Utility functions

## COMMIT STRUCTURE

When you fix it:
```bash
git add <files>
git commit -m "Fix: WebSocket query param extraction for Voice AI real-time conversation"
git push origin main

gcloud run deploy real-estate-leads-api-00037-pcc \
  --source . \
  --region us-east1 \
  --allow-unauthenticated
```

## SUCCESS CRITERIA

- ✅ No application errors when calling
- ✅ userId, language, callSid extracted successfully
- ✅ Gemini live session initializes
- ✅ WebSocket stays connected
- ✅ AI responds to caller's voice
- ✅ Call logs updated with conversation data

## CONTEXT

This is the FINAL piece of a 6-hour debugging marathon. Everything else works:
- Database connections ✅
- Language menu ✅
- Custom greetings ✅
- DTMF input ✅
- WebSocket audio handlers exist ✅

Only the WebSocket connection initialization is failing.

---

**Good luck, Zencoder! You've got all the context. Fix the WebSocket param extraction and we're done!** 🚀
