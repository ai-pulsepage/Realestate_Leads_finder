# Voice AI Fix: Root Cause Analysis & Implementation Plan

**Date:** November 27, 2025
**Priority:** Critical
**Status:** Ready for Development

## 1. Executive Summary
The Voice AI feature connects successfully.
-   **Input Issue:** Sending 8kHz audio causes Gemini's VAD to ignore speech. (Fix: Upsample to 16kHz)
-   **Output Issue:** Gemini *is* responding (verified in logs), but the code ignores the audio because it arrives in a different format (`modelTurn`) than expected (`message.data`). (Fix: Handle `modelTurn` audio)

**Required Fixes:**
1.  Implement client-side upsampling (8kHz → 16kHz).
2.  Update response handler to extract audio from `serverContent`.

---

## 2. Technical Root Cause Analysis

### Diagnosis 1: Input (VAD Failure)
-   **Issue:** Sending 8kHz audio makes Gemini think you are silent.
-   **Fix:** Upsample to 16kHz.

### Diagnosis 2: Output (Silence)
-   **Log Evidence:**
    ```json
    "modelTurn": {
      "parts": [{
        "inlineData": {
          "mimeType": "audio/pcm;rate=24000",
          "data": "..."
        }
      }]
    }
    ```
-   **The Bug:** `server.js` only checks `if (message.data)`. It **ignores** audio inside `message.serverContent`.
-   **Result:** Gemini speaks, but the server never sends it to Twilio.

---

## 3. Implementation Plan

### Step 1: Fix Input (Upsampling)
**Location:** `server.js` inside `ws.on('message')`

```javascript
// ✅ NEW: Upsample to 16kHz
const pcm8k = g711.ulawToPCM(mulawBuffer); // Returns Int16Array

// 1. Create target buffer (double size for 2x upsampling)
const pcm16k = new Int16Array(pcm8k.length * 2);

// 2. Linear Interpolation / Duplication
for (let i = 0; i < pcm8k.length; i++) {
  const sample = pcm8k[i];
  pcm16k[i * 2] = sample;     // Slot 1
  pcm16k[i * 2 + 1] = sample; // Slot 2 (Duplicate)
}

// 3. CRITICAL: Create Buffer correctly
const pcm16kBuffer = Buffer.from(pcm16k.buffer); 

// 4. Send as 16kHz
session.sendRealtimeInput({
  audio: {
    data: pcm16kBuffer.toString('base64'),
    mimeType: 'audio/pcm;rate=16000'
  }
});
```

### Step 2: Fix Output (Response Handling)
**Location:** `server.js` inside `client.live.connect` -> `onmessage`

**Replace the existing `if (message.data)` block with this:**

```javascript
// ✅ NEW: Handle both binary and inline audio
let audioData = null;

if (message.data) {
  audioData = Buffer.from(message.data); 
} else if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
  const inline = message.serverContent.modelTurn.parts[0].inlineData;
  if (inline.mimeType.startsWith('audio/')) {
    audioData = Buffer.from(inline.data, 'base64');
  }
}

if (audioData) {
  console.log('🔊 Gemini audio response received, size:', audioData.length);

  // Convert 16-bit PCM (24kHz) to 8kHz PCM, then to MULAW for Twilio
  // audioData is raw binary PCM data from Gemini (24kHz, 16-bit)
  const pcm24kBuffer = audioData;

  // Simple downsampling: 24kHz -> 8kHz (take every 3rd sample)
  const pcm8kBuffer = Buffer.alloc(Math.floor(pcm24kBuffer.length / 6) * 2); // 16-bit samples
  for (let i = 0, j = 0; i < pcm24kBuffer.length - 2; i += 6, j += 2) {
    // Take every 3rd 16-bit sample (24kHz / 3 = 8kHz)
    pcm8kBuffer[j] = pcm24kBuffer[i];
    pcm8kBuffer[j + 1] = pcm24kBuffer[i + 1];
  }

  const mulawAudioData = g711.ulawFromPCM(pcm8kBuffer);

  // Send audio back to Twilio
  ws.send(JSON.stringify({
    event: 'media',
    media: {
      payload: mulawAudioData.toString('base64')
    }
  }));
  console.log('🔊 MULAW audio sent to Twilio successfully');
}
```

---

## 4. Verification
1.  **Deploy** changes.
2.  **Call** the number.
3.  **Speak**.
4.  **Verify Logs:** You should see `🔊 Gemini audio response received` and `🔊 MULAW audio sent to Twilio`.
