# WebSocket Implementation for Voice AI - NEXT SESSION

**Status:** Voice AI currently works with bilingual support but hangs up after custom greeting because WebSocket handler is incomplete.

**Current Behavior:**
1. ✅ Caller hears bilingual language menu
2. ✅ Caller presses 1 (English) or 2 (Spanish)  
3. ✅ Caller hears custom greeting without "underscore" pronunciation
4. ❌ Call hangs up (WebSocket destroys connection immediately)

**Target Behavior:**
1. ✅ Language menu
2. ✅ Custom greeting
3. ✅ **Full AI conversation using Gemini Live API**
4. ✅ Call logged with transcript and language

---

## WHAT'S ALREADY DONE ✅

**Location:** `/routes/voice-ai.js` lines 1126-1224

**Completed Setup:**
- WebSocket route exists: `POST /media-stream`
- Query parameters extracted (language, userId)
- Knowledge data loaded from database
- Brand voice system instruction generated
- Gemini model initialized with correct config
- Voice configuration set (Kore for EN, Puck for ES)
- Live session created

**Current Placeholder (line 1220):**
```javascript
// Full WebSocket implementation would go here
console.log('WebSocket upgrade requested - placeholder implementation');
socket.destroy();  // ← This causes the hangup!
```

---

## WHAT NEEDS TO BE BUILT 🔧

### 1. Install Required Packages

```bash
npm install ws --save
npm install @suldashi/g711 --save  # For μ-law/PCM conversion
```

### 2. WebSocket Server Implementation

**Replace `socket.destroy()` with proper WebSocket handling:**

```javascript
const WebSocket = require('ws');

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Handle upgrade
wss.handleUpgrade(req, socket, head, (ws) => {
  console.log('✅ WebSocket connection established');
  
  let streamSid = null;
  let callSid = req.query.callSid || 'unknown';
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.event) {
        case 'connected':
          console.log('📞 Twilio connected');
          break;
          
        case 'start':
          streamSid = data.start.streamSid;
          callSid = data.start.callSid;
          console.log('🎙️ Stream started:', streamSid);
          
          // Log call start
          await pool.query(`
            UPDATE ai_voice_call_logs 
            SET stream_sid = $1, call_status = 'in-progress'
            WHERE call_sid = $2
          `, [streamSid, callSid]);
          break;
          
        case 'media':
          // Handle incoming audio from caller
          await handleIncomingAudio(data.media, liveSession, ws, streamSid);
          break;
          
        case 'stop':
          console.log('🛑 Stream stopped');
          await finalizeCall(userId, callSid, language);
          ws.close();
          break;
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});
```

### 3. Audio Handling Functions

**3.1 Handle Incoming Audio (Twilio → Gemini)**

```javascript
const { decode: decodeMulaw } = require('@suldashi/g711/mulaw');

async function handleIncomingAudio(mediaData, liveSession, ws, streamSid) {
  try {
    // Decode base64 μ-law audio from Twilio
    const mulawBuffer = Buffer.from(mediaData.payload, 'base64');
    
    // Convert μ-law to 16-bit PCM (Gemini expects PCM)
    const pcmBuffer = decodeMulaw(mulawBuffer);
    
    // Send to Gemini Live API
    const response = await liveSession.sendMessage({
      inlineData: {
        mimeType: 'audio/pcm',
        data: pcmBuffer.toString('base64')
      }
    });
    
    // Get Gemini's audio response
    if (response?.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const geminiAudioData = response.candidates[0].content.parts[0].inlineData.data;
      
      // Convert PCM back to μ-law for Twilio
      const { encode: encodeMulaw } = require('@suldashi/g711/mulaw');
      const pcmForEncode = Buffer.from(geminiAudioData, 'base64');
      const mulawForTwilio = encodeMulaw(pcmForEncode);
      
      // Send back to Twilio via WebSocket
      ws.send(JSON.stringify({
        event: 'media',
        streamSid: streamSid,
        media: {
          payload: mulawForTwilio.toString('base64')
        }
      }));
      
      console.log('🔊 Sent Gemini response to caller');
    }
  } catch (error) {
    console.error('❌ Audio handling error:', error);
  }
}
```

**3.2 Finalize Call Logging**

```javascript
async function finalizeCall(userId, callSid, language) {
  try {
    await pool.query(`
      UPDATE ai_voice_call_logs
      SET 
        call_status = 'completed',
        end_time = NOW(),
        duration_seconds = EXTRACT(EPOCH FROM (NOW() - start_time)),
        language = $1
      WHERE call_sid = $2 AND user_id = $3
    `, [language, callSid, userId]);
    
    console.log('✅ Call finalized:', callSid);
  } catch (error) {
    console.error('❌ Call finalization error:', error);
  }
}
```

### 4. Error Handling

```javascript
// Handle Gemini API errors
liveSession.on('error', (error) => {
  console.error('❌ Gemini API error:', error);
  
  // Send error message to caller
  const errorAudio = generateErrorAudio(
    "We're experiencing technical difficulties. Please try again later."
  );
  
  ws.send(JSON.stringify({
    event: 'media',
    media: { payload: errorAudio }
  }));
  
  ws.close();
});

// Handle unexpected disconnections
ws.on('close', async (code, reason) => {
  console.log(`WebSocket closed: ${code} - ${reason}`);
  
  await pool.query(`
    UPDATE ai_voice_call_logs
    SET call_status = 'disconnected'
    WHERE call_sid = $1 AND call_status = 'in-progress'
  `, [callSid]);
});
```

---

## TESTING CHECKLIST ✅

After implementation, test these scenarios:

**Basic Flow:**
- [ ] Call connects and language menu plays
- [ ] Press 1: English greeting plays
- [ ] **Conversation continues** (doesn't hang up)
- [ ] AI responds to questions in English
- [ ] AI asks qualifying questions
- [ ] Call completes gracefully
- [ ] Call logged with correct language ('en')

**Spanish Flow:**
- [ ] Press 2: Spanish greeting plays
- [ ] **Conversation continues** in Spanish
- [ ] AI responds in Spanish
- [ ] AI asks Spanish qualifying questions
- [ ] Call logged with language ('es')

**Edge Cases:**
- [ ] Mid-call disconnect (caller hangs up)
- [ ] Gemini API error handling
- [ ] Network timeout handling
- [ ] Multiple simultaneous calls
- [ ] Long pauses (no speech detected)

---

## ESTIMATED EFFORT

**Total Time:** 3-4 hours

| Task | Time | Complexity | Priority |
|------|------|------------|----------|
| WebSocket server setup | 30 min | Medium | High |
| Twilio MediaStream protocol | 1 hour | High | High |
| Audio format conversion | 1 hour | High | High |
| Gemini Live API integration | 1 hour | High | High |
| Error handling & logging | 30 min | Medium | Medium |
| Testing & debugging | 1 hour | High | High |

---

## CRITICAL DEPENDENCIES

**NPM Packages:**
```bash
npm install ws --save
npm install @suldashi/g711 --save
```

**Environment Variables (already configured):**
- ✅ GEMINI_API_KEY
- ✅ DATABASE_URL
- ✅ PORT=8080

**Database Schema:**
- ✅ ai_voice_call_logs table with language column
- ✅ subscriber_knowledge_base with extended knowledge_data

---

## CURRENT WORKAROUND (If Needed Urgently)

**Temporary Fix:** Redirect to old `/incoming` route instead of WebSocket:

```javascript
// In /api/voice-ai/language-selected route (line ~310)
// Replace connect.stream() with:
twiml.redirect(`/api/voice-ai/incoming?language=${selectedLanguage}&userId=${userId}`);
```

This provides basic Voice AI without real-time Gemini conversation features.

---

## TECHNICAL NOTES

**Audio Format Details:**
- Twilio sends: μ-law encoded, 8kHz, mono, base64
- Gemini expects: PCM 16-bit, 16kHz or 24kHz, mono
- Need to: Decode μ-law → Resample → Send to Gemini → Get PCM → Resample → Encode μ-law

**Gemini Live API:**
- Uses bidirectional streaming
- Supports turn-based conversation
- Can interrupt mid-response
- Handles voice activity detection

**WebSocket Protocol:**
- Twilio sends JSON messages with events
- Must respond with same format
- StreamSid identifies the audio stream
- Must handle `connected`, `start`, `media`, `stop` events

---

## RESOURCES

- [Twilio MediaStream Documentation](https://www.twilio.com/docs/voice/twiml/stream)
- [Gemini Live API Docs](https://ai.google.dev/gemini-api/docs/audio)
- [WebSocket Library (ws)](https://github.com/websockets/ws)
- [G.711 Audio Codec](https://www.npmjs.com/package/@suldashi/g711)

---

## SESSION SUMMARY

**What's Working Now:**
- ✅ Bilingual language menu (English/Spanish)
- ✅ DTMF detection (Press 1 or 2)
- ✅ Custom greetings per language
- ✅ Clean pronunciation (no "underscore")
- ✅ Database migrations complete
- ✅ Migration endpoints (temporary)

**What Still Needs Work:**
- ❌ WebSocket real-time conversation
- ❌ Call doesn't hang up after greeting
- ❌ Full Gemini Live integration
- ❌ Transcript logging

**Commits Today:**
- e459f47: Fix duplicate connect declaration
- acb5996: Fix underscore pronunciation & language menu
- 3723e67: Remove duplicate migration endpoints
- bc12755: Move migration endpoints inside try block
- f6a8a6c: Add migration endpoints
- a02b253: Query users table for twilio_phone_number
- afea451: Complete PostgreSQL migration
- ade959d: Add missing twilio import

**Next Session Goals:**
1. Implement WebSocket handler (3-4 hours)
2. Test bilingual conversations
3. Remove temporary migration endpoints
4. Consider Email Campaigns (Part 3) or Admin Interface

---

## STATUS: READY FOR NEXT SESSION 🚀

The Voice AI foundation is solid. WebSocket implementation is the final piece for real-time conversations.
