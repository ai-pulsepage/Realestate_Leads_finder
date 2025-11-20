# Voice Assistant Integration with Twilio

## Document Information
- **Version:** 1.0
- **Last Updated:** 2025-11-20
- **Status:** PRODUCTION READY
- **Dependencies:** 06_BULLMQ_WORKERS.md, 04_TOKEN_SYSTEM.md, 02_DATABASE_SCHEMA.md

---

## Table of Contents
1. [Twilio Integration Overview](#twilio-integration-overview)
2. [Phone Number Management](#phone-number-management)
3. [Inbound Call Routing](#inbound-call-routing)
4. [Outbound Call Workflows](#outbound-call-workflows)
5. [TwiML Flow Definitions](#twiml-flow-definitions)
6. [Gemini TTS Integration](#gemini-tts-integration)
7. [Call Recording and Transcription](#call-recording-and-transcription)
8. [Voicemail Detection](#voicemail-detection)
9. [Token Deduction Logic](#token-deduction-logic)
10. [Analytics and Reporting](#analytics-and-reporting)

---

## Twilio Integration Overview

### Why Twilio

**Decision Rationale:**
- **Programmable Voice:** Full API control over call flows
- **TwiML:** XML-based call scripting language
- **Global Reach:** Support for US/Canada phone numbers
- **Reliability:** 99.95% uptime SLA
- **WebRTC Support:** Browser-based calling option
- **SMS Integration:** Same platform for voice and SMS
- **Rich Features:** Call recording, transcription, conferencing, queuing

**Cost Structure:**
```
Phone Number: $1.15/month per number
Inbound Calls: $0.0085/minute
Outbound Calls: $0.013/minute
Recording: $0.0025/minute
Transcription: $0.05 per transcription
SMS: $0.0075 per message
```

**Estimated Monthly Cost per Subscriber:**
```
Phone Number: $1.15
Inbound Minutes (20 calls x 3 min): $0.51
Outbound Minutes (30 calls x 3 min): $3.51
Recording (50 calls x 3 min): $0.38
Transcription (50 calls): $2.50
Total: ~$8/month per active subscriber

Charged to Subscriber: 20 tokens/call = $0.02 per call
Platform Revenue: $1.00 per 50 calls - $8.00 cost = -$7.00 loss
```

**NOTE:** Voice assistant is a LOSS LEADER feature. Revenue comes from lead subscriptions, not voice calls. Voice adds stickiness and competitive differentiation.

---

### SDK Configuration

**Installation:**
```bash
npm install twilio
```

**Configuration:**
```javascript
// config/twilio.js
const twilio = require('twilio');

const twilio_client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_CONFIG = {
  account_sid: process.env.TWILIO_ACCOUNT_SID,
  auth_token: process.env.TWILIO_AUTH_TOKEN,
  api_key: process.env.TWILIO_API_KEY,
  api_secret: process.env.TWILIO_API_SECRET,
  twiml_app_sid: process.env.TWILIO_TWIML_APP_SID,
  webhook_base_url: process.env.API_URL
};

module.exports = {
  twilio_client,
  TWILIO_CONFIG
};
```

**Environment Variables:**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WEBHOOK_SECRET=your_webhook_verification_secret
```

---

## Phone Number Management

### Subscriber Phone Number Provisioning

**Strategy:** Each subscriber gets a dedicated phone number for their AI assistant.

**Number Pool Architecture:**
```
Miami-Dade Area Codes:
- 305 (primary)
- 786 (overlay)
- 645 (future overlay)

Purchase Strategy:
- Purchase 10 numbers upfront (buffer pool)
- Auto-purchase when pool drops below 5
- Assign to subscriber on subscription activation
- Release to pool on subscription cancellation (60-day grace period)
```

---

### Provisioning Workflow

**1. Purchase Phone Numbers (Admin Task):**
```javascript
// scripts/provision_phone_numbers.js
const { twilio_client } = require('../config/twilio');
const db = require('../config/database');

async function purchase_phone_numbers(count = 10, area_code = '305') {
  console.log(`Purchasing ${count} phone numbers with area code ${area_code}...`);
  
  const purchased_numbers = [];
  
  for (let i = 0; i < count; i++) {
    try {
      // Search for available number
      const available_numbers = await twilio_client.availablePhoneNumbers('US')
        .local
        .list({
          areaCode: area_code,
          smsEnabled: true,
          voiceEnabled: true,
          limit: 1
        });
      
      if (available_numbers.length === 0) {
        console.error(`No available numbers in area code ${area_code}`);
        break;
      }
      
      const number_to_purchase = available_numbers[0].phoneNumber;
      
      // Purchase the number
      const incoming_number = await twilio_client.incomingPhoneNumbers
        .create({
          phoneNumber: number_to_purchase,
          voiceUrl: `${process.env.API_URL}/twilio/voice/inbound`,
          voiceMethod: 'POST',
          statusCallback: `${process.env.API_URL}/twilio/voice/status`,
          statusCallbackMethod: 'POST',
          smsUrl: `${process.env.API_URL}/twilio/sms/inbound`,
          smsMethod: 'POST'
        });
      
      // Add to database pool
      await db.query(`
        INSERT INTO phone_number_pool (
          phone_number,
          twilio_sid,
          area_code,
          status,
          purchased_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
        incoming_number.phoneNumber,
        incoming_number.sid,
        area_code,
        'available'
      ]);
      
      purchased_numbers.push(incoming_number.phoneNumber);
      console.log(`Purchased: ${incoming_number.phoneNumber}`);
      
    } catch (error) {
      console.error(`Failed to purchase number: ${error.message}`);
    }
  }
  
  console.log(`Successfully purchased ${purchased_numbers.length} numbers`);
  return purchased_numbers;
}

module.exports = { purchase_phone_numbers };
```

---

**2. Assign Number to Subscriber:**
```javascript
// services/phone_number_service.js

async function assign_phone_number_to_subscriber(subscriber_id) {
  // Check if subscriber already has a number
  const existing = await db.query(
    'SELECT twilio_phone_number FROM users WHERE id = $1',
    [subscriber_id]
  );
  
  if (existing.rows[0].twilio_phone_number) {
    return existing.rows[0].twilio_phone_number;
  }
  
  // Get available number from pool
  const available_number = await db.query(`
    SELECT * FROM phone_number_pool
    WHERE status = 'available'
    ORDER BY purchased_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `);
  
  if (available_number.rows.length === 0) {
    throw new Error('No available phone numbers in pool. Purchase more numbers.');
  }
  
  const number = available_number.rows[0];
  
  // Assign to subscriber
  await db.query(`
    UPDATE phone_number_pool
    SET status = 'assigned',
        assigned_subscriber_id = $1,
        assigned_at = NOW()
    WHERE id = $2
  `, [subscriber_id, number.id]);
  
  await db.query(
    'UPDATE users SET twilio_phone_number = $1 WHERE id = $2',
    [number.phone_number, subscriber_id]
  );
  
  // Check pool level and auto-purchase if needed
  await check_and_replenish_pool();
  
  return number.phone_number;
}

async function check_and_replenish_pool() {
  const pool_count = await db.query(`
    SELECT COUNT(*) FROM phone_number_pool WHERE status = 'available'
  `);
  
  const available_count = parseInt(pool_count.rows[0].count);
  
  if (available_count < 5) {
    console.log(`Pool low (${available_count} numbers). Purchasing 10 more...`);
    await purchase_phone_numbers(10);
  }
}

module.exports = {
  assign_phone_number_to_subscriber,
  check_and_replenish_pool
};
```

---

**3. Release Number on Cancellation:**
```javascript
async function release_phone_number(subscriber_id) {
  const subscriber = await db.query(
    'SELECT twilio_phone_number FROM users WHERE id = $1',
    [subscriber_id]
  );
  
  const phone_number = subscriber.rows[0].twilio_phone_number;
  
  if (!phone_number) return;
  
  // Return to pool with 60-day grace period
  await db.query(`
    UPDATE phone_number_pool
    SET status = 'grace_period',
        assigned_subscriber_id = NULL,
        released_at = NOW(),
        available_after = NOW() + INTERVAL '60 days'
    WHERE phone_number = $1
  `, [phone_number]);
  
  await db.query(
    'UPDATE users SET twilio_phone_number = NULL WHERE id = $1',
    [subscriber_id]
  );
  
  console.log(`Phone number ${phone_number} released with 60-day grace period`);
}

// Cron job: Daily cleanup of grace period numbers
async function cleanup_grace_period_numbers() {
  const expired = await db.query(`
    UPDATE phone_number_pool
    SET status = 'available',
        released_at = NULL,
        available_after = NULL
    WHERE status = 'grace_period'
      AND available_after <= NOW()
    RETURNING phone_number
  `);
  
  console.log(`Returned ${expired.rows.length} numbers to available pool`);
}
```

---

## Inbound Call Routing

### Inbound Call Flow

```
1. Lead calls subscriber's dedicated number (305-XXX-XXXX)
2. Twilio webhook hits: POST /twilio/voice/inbound
3. Backend identifies subscriber by phone number
4. Fetches subscriber's AI script and knowledge base
5. Generates TwiML response with Gemini TTS
6. AI assistant converses with lead
7. Call recorded and transcribed
8. Lead data captured and stored in CRM
9. Subscriber notified of call summary
```

---

### Inbound Webhook Handler

**Endpoint:** `POST /twilio/voice/inbound`

**Implementation:**
```javascript
// routes/twilio_voice.js
const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const db = require('../config/database');
const { generate_ai_response } = require('../services/vertex_ai_service');

router.post('/twilio/voice/inbound', async (req, res) => {
  const { From, To, CallSid, CallStatus } = req.body;
  
  // Verify webhook authenticity
  const is_valid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    req.headers['x-twilio-signature'],
    `${process.env.API_URL}/twilio/voice/inbound`,
    req.body
  );
  
  if (!is_valid && process.env.NODE_ENV === 'production') {
    return res.status(403).send('Forbidden');
  }
  
  try {
    // Find subscriber by phone number
    const subscriber = await db.query(
      'SELECT * FROM users WHERE twilio_phone_number = $1',
      [To]
    );
    
    if (subscriber.rows.length === 0) {
      return res.send(generate_error_twiml('This number is not configured.'));
    }
    
    const user = subscriber.rows[0];
    
    // Check token balance
    const call_token_cost = 20;
    if (user.token_balance < call_token_cost) {
      return res.send(generate_error_twiml('Insufficient tokens. Please recharge your account.'));
    }
    
    // Deduct tokens upfront
    await db.query(
      'UPDATE users SET token_balance = token_balance - $1 WHERE id = $2',
      [call_token_cost, user.id]
    );
    
    // Log call
    await db.query(`
      INSERT INTO voice_call_logs (
        subscriber_id,
        twilio_call_sid,
        direction,
        from_number,
        to_number,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      user.id,
      CallSid,
      'inbound',
      From,
      To,
      CallStatus
    ]);
    
    // Log token usage
    await db.query(`
      INSERT INTO token_usage_logs (
        user_id,
        action_type,
        tokens_used,
        entity_id,
        entity_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      user.id,
      'voice_call_inbound',
      call_token_cost,
      CallSid,
      'twilio_call'
    ]);
    
    // Fetch AI script
    const script = await db.query(
      'SELECT * FROM ai_scripts WHERE subscriber_id = $1 AND is_active = true LIMIT 1',
      [user.id]
    );
    
    const ai_script = script.rows[0] || get_default_script(user);
    
    // Generate TwiML response
    const twiml = generate_inbound_twiml(user, ai_script, From, CallSid);
    
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error) {
    console.error('Inbound call error:', error);
    res.send(generate_error_twiml('An error occurred. Please try again.'));
  }
});

function generate_inbound_twiml(user, script, caller_number, call_sid) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  
  // Greeting
  const gather = twiml.gather({
    input: 'speech',
    action: `${process.env.API_URL}/twilio/voice/process?subscriber_id=${user.id}&call_sid=${call_sid}`,
    method: 'POST',
    speechTimeout: 'auto',
    speechModel: 'phone_call',
    enhanced: true,
    language: 'en-US'
  });
  
  gather.say(
    {
      voice: 'Polly.Joanna',
      language: 'en-US'
    },
    script.greeting_message || `Hello! Thank you for calling ${user.business_name}. How can I help you today?`
  );
  
  // If no input, repeat
  twiml.say('I did not hear anything. Please call back when you are ready to speak.');
  twiml.hangup();
  
  return twiml;
}

function generate_error_twiml(message) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  twiml.say({ voice: 'Polly.Joanna' }, message);
  twiml.hangup();
  return twiml.toString();
}

module.exports = router;
```

---

### Conversation Processing Endpoint

**Endpoint:** `POST /twilio/voice/process`

**Purpose:** Process speech input and generate AI responses in real-time

**Implementation:**
```javascript
router.post('/twilio/voice/process', async (req, res) => {
  const { SpeechResult, subscriber_id, call_sid, Confidence } = req.body;
  
  try {
    // Fetch subscriber
    const subscriber = await db.query('SELECT * FROM users WHERE id = $1', [subscriber_id]);
    const user = subscriber.rows[0];
    
    // Fetch conversation history for this call
    const history = await db.query(`
      SELECT role, content FROM voice_conversation_logs
      WHERE call_sid = $1
      ORDER BY created_at ASC
    `, [call_sid]);
    
    const conversation_history = history.rows;
    
    // Add user's speech to history
    conversation_history.push({
      role: 'user',
      content: SpeechResult
    });
    
    await db.query(`
      INSERT INTO voice_conversation_logs (
        call_sid,
        subscriber_id,
        role,
        content,
        confidence,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [call_sid, subscriber_id, 'user', SpeechResult, Confidence]);
    
    // Generate AI response using Vertex AI
    const ai_response = await generate_ai_response({
      subscriber_id,
      conversation_history,
      user_input: SpeechResult,
      context: {
        business_name: user.business_name,
        business_type: user.subscription_type,
        caller_number: req.body.From
      }
    });
    
    // Log AI response
    await db.query(`
      INSERT INTO voice_conversation_logs (
        call_sid,
        subscriber_id,
        role,
        content,
        created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [call_sid, subscriber_id, 'assistant', ai_response.text]);
    
    // Generate TwiML with AI response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Check if conversation should end
    if (ai_response.end_call) {
      twiml.say({ voice: 'Polly.Joanna' }, ai_response.text);
      twiml.say({ voice: 'Polly.Joanna' }, 'Thank you for calling. Goodbye!');
      twiml.hangup();
    } else {
      // Continue conversation
      const gather = twiml.gather({
        input: 'speech',
        action: `${process.env.API_URL}/twilio/voice/process?subscriber_id=${subscriber_id}&call_sid=${call_sid}`,
        method: 'POST',
        speechTimeout: 'auto',
        enhanced: true
      });
      
      gather.say({ voice: 'Polly.Joanna' }, ai_response.text);
      
      // If no response, prompt again
      twiml.say('Are you still there?');
      twiml.redirect(`${process.env.API_URL}/twilio/voice/process?subscriber_id=${subscriber_id}&call_sid=${call_sid}`);
    }
    
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error) {
    console.error('Conversation processing error:', error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, 'I apologize, but I encountered an error. Please call back later.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});
```

---

## Outbound Call Workflows

### Outbound Call Initiation

**Trigger:** Subscriber initiates call to lead via dashboard or scheduled campaign

**Flow:**
```
1. Subscriber clicks "Call Lead" in dashboard
2. Frontend sends POST /api/voice/initiate-call
3. Backend validates tokens and lead phone number
4. Job queued in BullMQ (voice-assistant queue)
5. Worker initiates Twilio call
6. AI assistant speaks first (introduces subscriber's business)
7. Conversation handled by Vertex AI
8. Call recorded and summarized
9. Summary sent to subscriber via email/SMS
```

---

### Outbound Call API Endpoint

**Endpoint:** `POST /api/voice/initiate-call`

**Request:**
```json
{
  "lead_id": 12345,
  "script_id": 67,
  "scheduled_at": "2025-11-20T14:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "voice-call-abc123",
  "estimated_start": "2025-11-20T14:30:00Z",
  "tokens_reserved": 20
}
```

**Implementation:**
```javascript
router.post('/api/voice/initiate-call', authenticate_user, async (req, res) => {
  const { lead_id, script_id, scheduled_at } = req.body;
  const subscriber_id = req.user.id;
  
  try {
    // Validate token balance
    const call_token_cost = 20;
    if (req.user.token_balance < call_token_cost) {
      return res.status(402).json({
        error: 'Insufficient tokens',
        required: call_token_cost,
        available: req.user.token_balance
      });
    }
    
    // Fetch lead
    const lead = await db.query(`
      SELECT l.*, p.owner_name, p.address
      FROM leads l
      JOIN properties p ON l.property_id = p.id
      WHERE l.id = $1
    `, [lead_id]);
    
    if (lead.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    const lead_data = lead.rows[0];
    
    if (!lead_data.phone_number) {
      return res.status(400).json({ error: 'Lead has no phone number' });
    }
    
    // Fetch script
    const script = await db.query(
      'SELECT * FROM ai_scripts WHERE id = $1 AND subscriber_id = $2',
      [script_id, subscriber_id]
    );
    
    if (script.rows.length === 0) {
      return res.status(404).json({ error: 'Script not found' });
    }
    
    // Calculate delay for scheduled calls
    const delay = scheduled_at 
      ? new Date(scheduled_at).getTime() - Date.now()
      : 0;
    
    if (delay < 0) {
      return res.status(400).json({ error: 'Scheduled time must be in the future' });
    }
    
    // Queue call job
    const { voice_queue } = require('../queues');
    const job = await voice_queue.add(
      'outbound_call',
      {
        subscriber_id,
        lead_id,
        script_id,
        scheduled_at
      },
      {
        priority: 2,
        delay,
        attempts: 3,
        backoff: { type: 'fixed', delay: 30000 }
      }
    );
    
    res.json({
      success: true,
      job_id: job.id,
      estimated_start: scheduled_at || new Date().toISOString(),
      tokens_reserved: call_token_cost
    });
    
  } catch (error) {
    console.error('Outbound call initiation error:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});
```

---

### Outbound Call Worker (from 06_BULLMQ_WORKERS.md)

**Implementation details in 06_BULLMQ_WORKERS.md, key points:**

1. Deduct tokens upfront (20 tokens)
2. Initiate Twilio call with `twilio_client.calls.create()`
3. Set `url` parameter to outbound TwiML endpoint
4. Enable `machineDetection: 'DetectMessageEnd'` (voicemail detection)
5. Enable `record: true` for call recording
6. Log call in `voice_call_logs` table
7. Refund tokens if call fails before connection

---

### Outbound TwiML Endpoint

**Endpoint:** `GET/POST /twilio/voice/outbound`

**Purpose:** Generate initial TwiML for outbound calls

**Implementation:**
```javascript
router.all('/twilio/voice/outbound', async (req, res) => {
  const { subscriber_id, lead_id, script_id, AnsweredBy } = req.query;
  
  try {
    // Check if voicemail detected
    if (AnsweredBy === 'machine_end_beep' || AnsweredBy === 'machine_end_silence') {
      return res.send(generate_voicemail_twiml(subscriber_id, lead_id));
    }
    
    // Fetch subscriber and script
    const subscriber = await db.query('SELECT * FROM users WHERE id = $1', [subscriber_id]);
    const script = await db.query('SELECT * FROM ai_scripts WHERE id = $1', [script_id]);
    
    const user = subscriber.rows[0];
    const ai_script = script.rows[0];
    
    // Generate outbound greeting TwiML
    const twiml = new twilio.twiml.VoiceResponse();
    
    const gather = twiml.gather({
      input: 'speech',
      action: `${process.env.API_URL}/twilio/voice/process?subscriber_id=${subscriber_id}&call_sid=${req.body.CallSid}&lead_id=${lead_id}`,
      method: 'POST',
      speechTimeout: 'auto',
      enhanced: true
    });
    
    const greeting = ai_script.outbound_greeting || 
      `Hello! This is ${user.business_name} calling about your property at ${req.query.property_address}. Do you have a moment to talk?`;
    
    gather.say({ voice: 'Polly.Joanna' }, greeting);
    
    twiml.say('I did not hear a response. I will call back another time. Goodbye.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error) {
    console.error('Outbound TwiML error:', error);
    res.send(generate_error_twiml('An error occurred.'));
  }
});

function generate_voicemail_twiml(subscriber_id, lead_id) {
  const twiml = new twilio.twiml.VoiceResponse();
  
  twiml.say(
    { voice: 'Polly.Joanna' },
    'Hello! This is a message from Miami-Dade Property Leads. We noticed your property may be of interest. Please call us back at your convenience. Thank you!'
  );
  
  twiml.hangup();
  
  // Log voicemail in database
  db.query(`
    UPDATE voice_call_logs
    SET status = 'voicemail',
        ended_at = NOW()
    WHERE subscriber_id = $1
      AND lead_id = $2
      AND status = 'initiated'
  `, [subscriber_id, lead_id]);
  
  return twiml.toString();
}
```

---

## TwiML Flow Definitions

### Basic TwiML Structure

**TwiML (Twilio Markup Language):** XML-based instructions for call handling

**Core Verbs:**
- `<Say>` - Text-to-speech
- `<Gather>` - Collect speech/DTMF input
- `<Dial>` - Connect to another number
- `<Record>` - Record audio
- `<Redirect>` - Redirect to another TwiML URL
- `<Hangup>` - End call
- `<Pause>` - Wait before next action

---

### Example: Simple Greeting Flow

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="/twilio/voice/process" method="POST" speechTimeout="auto">
    <Say voice="Polly.Joanna">
      Hello! Thank you for calling. How can I help you today?
    </Say>
  </Gather>
  <Say>I did not hear anything. Goodbye.</Say>
  <Hangup/>
</Response>
```

---

### Example: Multi-Step Conversation Flow

```javascript
// Step 1: Initial greeting
function generate_greeting_twiml() {
  const twiml = new twilio.twiml.VoiceResponse();
  
  const gather = twiml.gather({
    input: 'speech',
    action: '/twilio/voice/step2',
    speechTimeout: 'auto',
    hints: 'buy, sell, rent, property, information'
  });
  
  gather.say(
    { voice: 'Polly.Joanna' },
    'Hello! I am your property assistant. Are you interested in buying, selling, or getting information about a property?'
  );
  
  return twiml;
}

// Step 2: Route based on intent
function generate_intent_routing_twiml(user_intent) {
  const twiml = new twilio.twiml.VoiceResponse();
  
  switch (user_intent) {
    case 'buying':
      const gather_buying = twiml.gather({
        input: 'speech',
        action: '/twilio/voice/capture-buying-criteria'
      });
      gather_buying.say('Great! What type of property are you looking for?');
      break;
      
    case 'selling':
      const gather_selling = twiml.gather({
        input: 'speech',
        action: '/twilio/voice/capture-property-address'
      });
      gather_selling.say('I can help with that. What is the address of the property you want to sell?');
      break;
      
    case 'information':
      const gather_info = twiml.gather({
        input: 'speech',
        action: '/twilio/voice/capture-property-query'
      });
      gather_info.say('Sure! What would you like to know?');
      break;
      
    default:
      twiml.say('I did not understand. Let me transfer you to a representative.');
      twiml.dial('+1-305-555-1234');  // Transfer to subscriber's direct line
  }
  
  return twiml;
}
```

---

### Example: Call Transfer Flow

```javascript
function generate_transfer_twiml(subscriber_phone) {
  const twiml = new twilio.twiml.VoiceResponse();
  
  twiml.say(
    { voice: 'Polly.Joanna' },
    'Let me connect you with a specialist. Please hold.'
  );
  
  twiml.dial({
    timeout: 30,
    action: '/twilio/voice/transfer-status',
    method: 'POST'
  }, subscriber_phone);
  
  // If transfer fails
  twiml.say('Sorry, no one is available. Please leave a message after the beep.');
  twiml.record({
    maxLength: 120,
    action: '/twilio/voice/voicemail',
    transcribe: true,
    transcribeCallback: '/twilio/voice/transcription'
  });
  
  twiml.hangup();
  
  return twiml;
}
```

---

## Gemini TTS Integration

### Why Gemini TTS Instead of Twilio Voices

**Cost Comparison:**
```
Twilio Polly Voices: $0.016 per 1000 characters (~$0.048 per 3-min call)
Gemini 2.5 Flash TTS: $0.0018 per 3-min call
Savings: 96% cheaper
```

**Quality:** Gemini TTS has more natural prosody and emotion

**Implementation Strategy:**
- Generate audio with Gemini TTS
- Upload to Cloud Storage
- Use `<Play>` verb in TwiML to stream audio

---

### Gemini TTS Audio Generation

**Service:** `services/vertex_ai_service.js`

```javascript
const { VertexAI } = require('@google-cloud/vertexai');

const vertex_ai = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: process.env.GCP_REGION
});

async function generate_tts_audio(text, output_path) {
  const model = vertex_ai.getGenerativeModel({
    model: 'gemini-2.5-flash-tts'
  });
  
  const request = {
    contents: [{
      role: 'user',
      parts: [{
        text: text
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      voice: 'en-US-Wavenet-F',  // Female voice
      speakingRate: 1.0,
      pitch: 0.0
    }
  };
  
  const response = await model.generateContent(request);
  const audio_data = response.response.candidates[0].content.parts[0].audio;
  
  // Save to file
  const fs = require('fs');
  fs.writeFileSync(output_path, Buffer.from(audio_data, 'base64'));
  
  return output_path;
}

async function generate_and_upload_tts(text, call_sid) {
  const local_path = `/tmp/tts_${call_sid}_${Date.now()}.mp3`;
  
  // Generate audio
  await generate_tts_audio(text, local_path);
  
  // Upload to Cloud Storage
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
  
  const gcs_path = `voice_tts/${call_sid}/${Date.now()}.mp3`;
  await bucket.upload(local_path, {
    destination: gcs_path,
    metadata: {
      cacheControl: 'public, max-age=3600'
    }
  });
  
  // Make publicly accessible (temporary)
  const file = bucket.file(gcs_path);
  await file.makePublic();
  
  const public_url = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${gcs_path}`;
  
  // Cleanup local file
  fs.unlinkSync(local_path);
  
  return public_url;
}

module.exports = {
  generate_tts_audio,
  generate_and_upload_tts
};
```

---

### Using Gemini TTS in TwiML

```javascript
router.post('/twilio/voice/process-with-tts', async (req, res) => {
  const { SpeechResult, call_sid, subscriber_id } = req.body;
  
  // Generate AI response
  const ai_response = await generate_ai_response({
    subscriber_id,
    user_input: SpeechResult
  });
  
  // Generate TTS audio
  const audio_url = await generate_and_upload_tts(ai_response.text, call_sid);
  
  // Create TwiML with audio playback
  const twiml = new twilio.twiml.VoiceResponse();
  
  const gather = twiml.gather({
    input: 'speech',
    action: '/twilio/voice/process-with-tts',
    method: 'POST'
  });
  
  gather.play(audio_url);  // Play Gemini TTS audio
  
  twiml.say('I did not hear a response.');
  twiml.hangup();
  
  res.type('text/xml');
  res.send(twiml.toString());
});
```

**NOTE:** Gemini TTS adds latency (2-3 seconds). For real-time conversations, use Twilio Polly voices as fallback.

---

## Call Recording and Transcription

### Enable Recording on All Calls

**Configuration in phone number purchase:**
```javascript
const incoming_number = await twilio_client.incomingPhoneNumbers.create({
  phoneNumber: number_to_purchase,
  voiceUrl: `${process.env.API_URL}/twilio/voice/inbound`,
  voiceMethod: 'POST',
  statusCallback: `${process.env.API_URL}/twilio/voice/status`,
  recordingStatusCallback: `${process.env.API_URL}/twilio/voice/recording`,
  recordingStatusCallbackMethod: 'POST'
});
```

**Enable recording in TwiML:**
```javascript
const call = await twilio_client.calls.create({
  from: user.twilio_phone_number,
  to: lead_phone_number,
  url: `${process.env.API_URL}/twilio/voice/outbound`,
  record: true,
  recordingStatusCallback: `${process.env.API_URL}/twilio/voice/recording`
});
```

---

### Recording Webhook Handler

**Endpoint:** `POST /twilio/voice/recording`

**Purpose:** Process recording URLs and trigger transcription

**Implementation:**
```javascript
router.post('/twilio/voice/recording', async (req, res) => {
  const {
    CallSid,
    RecordingSid,
    RecordingUrl,
    RecordingDuration,
    RecordingChannels
  } = req.body;
  
  try {
    // Store recording metadata
    await db.query(`
      UPDATE voice_call_logs
      SET recording_sid = $1,
          recording_url = $2,
          recording_duration = $3,
          recorded_at = NOW()
      WHERE twilio_call_sid = $4
    `, [
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
      CallSid
    ]);
    
    // Trigger transcription job
    const { transcription_queue } = require('../queues');
    await transcription_queue.add(
      'transcribe_call',
      {
        call_sid: CallSid,
        recording_sid: RecordingSid,
        recording_url: RecordingUrl
      },
      { priority: 3 }
    );
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('Recording webhook error:', error);
    res.status(500).send('Error');
  }
});
```

---

### Call Transcription Worker

**Implementation:**
```javascript
const { Worker } = require('bullmq');
const { twilio_client } = require('../config/twilio');
const db = require('../config/database');

const transcription_worker = new Worker(
  'transcription-queue',
  async (job) => {
    const { call_sid, recording_sid, recording_url } = job.data;
    
    // Request transcription from Twilio
    const transcription = await twilio_client
      .transcriptions
      .create({
        recordingSid: recording_sid
      });
    
    job.log(`Transcription initiated: ${transcription.sid}`);
    
    // Poll for completion (Twilio transcription takes 2-5 minutes)
    let transcription_text = null;
    let attempts = 0;
    
    while (attempts < 30 && !transcription_text) {
      await new Promise(resolve => setTimeout(resolve, 10000));  // Wait 10 seconds
      
      const status = await twilio_client
        .transcriptions(transcription.sid)
        .fetch();
      
      if (status.status === 'completed') {
        transcription_text = status.transcriptionText;
        break;
      } else if (status.status === 'failed') {
        throw new Error('Transcription failed');
      }
      
      attempts++;
    }
    
    if (!transcription_text) {
      throw new Error('Transcription timeout');
    }
    
    // Store transcription
    await db.query(`
      UPDATE voice_call_logs
      SET transcription = $1,
          transcribed_at = NOW()
      WHERE twilio_call_sid = $2
    `, [transcription_text, call_sid]);
    
    // Generate call summary using AI
    const summary = await generate_call_summary(call_sid, transcription_text);
    
    await db.query(`
      UPDATE voice_call_logs
      SET call_summary = $1
      WHERE twilio_call_sid = $2
    `, [summary, call_sid]);
    
    // Notify subscriber
    await notify_subscriber_of_call_completion(call_sid);
    
    return {
      success: true,
      transcription_length: transcription_text.length
    };
  },
  {
    connection: require('../config/redis'),
    concurrency: 5
  }
);

async function generate_call_summary(call_sid, transcription) {
  const { generate_ai_response } = require('./vertex_ai_service');
  
  const prompt = `
    Summarize this phone call transcription in 3-4 sentences.
    Include: caller intent, key information discussed, next steps, and lead quality (hot/warm/cold).
    
    Transcription:
    ${transcription}
  `;
  
  const response = await generate_ai_response({
    user_input: prompt,
    context: { task: 'summarization' }
  });
  
  return response.text;
}

module.exports = transcription_worker;
```

---

## Voicemail Detection

### Twilio Answering Machine Detection (AMD)

**Feature:** `machineDetection: 'DetectMessageEnd'`

**How it works:**
1. Twilio analyzes first 5 seconds of call
2. Detects if answered by human or machine
3. For machines, waits for beep before triggering TwiML
4. Passes `AnsweredBy` parameter to webhook

**Possible Values:**
- `human` - Answered by person
- `machine_start` - Voicemail greeting started
- `machine_end_beep` - Voicemail beep detected
- `machine_end_silence` - Voicemail greeting ended (no beep)
- `fax` - Fax machine detected
- `unknown` - Could not determine

---

### Handling Voicemail Detection

```javascript
router.all('/twilio/voice/outbound', async (req, res) => {
  const { AnsweredBy, CallSid, subscriber_id, lead_id } = req.query;
  
  // Check answering machine detection result
  if (AnsweredBy && AnsweredBy.startsWith('machine')) {
    // Leave voicemail message
    const twiml = new twilio.twiml.VoiceResponse();
    
    const subscriber = await db.query('SELECT * FROM users WHERE id = $1', [subscriber_id]);
    const user = subscriber.rows[0];
    
    const voicemail_message = `
      Hello! This is ${user.business_name}. 
      We are reaching out regarding your property. 
      Please give us a call back at ${format_phone_number(user.twilio_phone_number)}. 
      Thank you and have a great day!
    `;
    
    twiml.say({ voice: 'Polly.Joanna' }, voicemail_message);
    twiml.hangup();
    
    // Log as voicemail
    await db.query(`
      UPDATE voice_call_logs
      SET status = 'voicemail',
          voicemail_left = true,
          ended_at = NOW()
      WHERE twilio_call_sid = $1
    `, [CallSid]);
    
    res.type('text/xml');
    res.send(twiml.toString());
    
  } else if (AnsweredBy === 'human') {
    // Proceed with normal conversation flow
    const twiml = generate_outbound_conversation_twiml(subscriber_id, lead_id);
    res.type('text/xml');
    res.send(twiml.toString());
    
  } else {
    // Unknown - proceed cautiously
    const twiml = generate_outbound_conversation_twiml(subscriber_id, lead_id);
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

function format_phone_number(phone) {
  // +13055551234 -> (305) 555-1234
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^1?(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}
```

---

## Token Deduction Logic

### Token Cost Breakdown

**Voice Call Costs:**
- Base cost: 20 tokens per call (regardless of duration)
- Covers: 3-minute call + recording + transcription
- No additional charges for calls under 3 minutes
- Calls over 3 minutes: +5 tokens per additional minute

**Token Reserve:**
- Tokens deducted at call initiation (upfront)
- Refunded if call fails before connection
- Additional tokens charged for long calls (post-call adjustment)

---

### Token Deduction Flow

**1. Upfront Deduction (Call Initiation):**
```javascript
// Deduct 20 tokens when call starts
await db.query(
  'UPDATE users SET token_balance = token_balance - 20 WHERE id = $1',
  [subscriber_id]
);

// Log deduction
await db.query(`
  INSERT INTO token_usage_logs (
    user_id,
    action_type,
    tokens_used,
    entity_id,
    entity_type,
    created_at
  ) VALUES ($1, $2, $3, $4, $5, NOW())
`, [
  subscriber_id,
  'voice_call_outbound',
  20,
  call_sid,
  'twilio_call'
]);
```

---

**2. Post-Call Adjustment (Long Calls):**
```javascript
// Webhook: POST /twilio/voice/status
router.post('/twilio/voice/status', async (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;
  
  if (CallStatus === 'completed') {
    const duration_minutes = Math.ceil(CallDuration / 60);
    
    if (duration_minutes > 3) {
      const extra_minutes = duration_minutes - 3;
      const extra_tokens = extra_minutes * 5;
      
      // Find subscriber
      const call_log = await db.query(
        'SELECT subscriber_id FROM voice_call_logs WHERE twilio_call_sid = $1',
        [CallSid]
      );
      
      const subscriber_id = call_log.rows[0].subscriber_id;
      
      // Deduct extra tokens
      await db.query(
        'UPDATE users SET token_balance = token_balance - $1 WHERE id = $2',
        [extra_tokens, subscriber_id]
      );
      
      // Log extra charge
      await db.query(`
        INSERT INTO token_usage_logs (
          user_id,
          action_type,
          tokens_used,
          entity_id,
          entity_type,
          metadata,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
        subscriber_id,
        'voice_call_overage',
        extra_tokens,
        CallSid,
        'twilio_call',
        JSON.stringify({ duration_minutes, extra_minutes })
      ]);
    }
    
    // Update call log
    await db.query(`
      UPDATE voice_call_logs
      SET status = $1,
          duration_seconds = $2,
          ended_at = NOW()
      WHERE twilio_call_sid = $3
    `, [CallStatus, CallDuration, CallSid]);
  }
  
  res.status(200).send('OK');
});
```

---

**3. Refund on Failed Calls:**
```javascript
// If call never connected
if (CallStatus === 'failed' || CallStatus === 'busy' || CallStatus === 'no-answer') {
  const call_log = await db.query(
    'SELECT subscriber_id FROM voice_call_logs WHERE twilio_call_sid = $1',
    [CallSid]
  );
  
  const subscriber_id = call_log.rows[0].subscriber_id;
  
  // Refund 20 tokens
  await db.query(
    'UPDATE users SET token_balance = token_balance + 20 WHERE id = $1',
    [subscriber_id]
  );
  
  // Log refund
  await db.query(`
    INSERT INTO token_usage_logs (
      user_id,
      action_type,
      tokens_used,
      entity_id,
      entity_type,
      metadata,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, [
    subscriber_id,
    'voice_call_refund',
    -20,  // Negative value = refund
    CallSid,
    'twilio_call',
    JSON.stringify({ reason: CallStatus })
  ]);
  
  // Update call log
  await db.query(`
    UPDATE voice_call_logs
    SET status = $1,
        ended_at = NOW()
    WHERE twilio_call_sid = $2
  `, [CallStatus, CallSid]);
}
```

---

## Analytics and Reporting

### Call Metrics Dashboard

**Key Metrics:**
- Total calls (inbound/outbound)
- Average call duration
- Voicemail rate
- Connection rate (answered / attempted)
- Transcription completion rate
- Token consumption per subscriber

**Database View:**
```sql
CREATE VIEW voice_call_analytics AS
SELECT 
  subscriber_id,
  DATE(created_at) AS call_date,
  direction,
  COUNT(*) AS total_calls,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed_calls,
  COUNT(*) FILTER (WHERE status = 'voicemail') AS voicemail_calls,
  COUNT(*) FILTER (WHERE status IN ('failed', 'busy', 'no-answer')) AS failed_calls,
  AVG(duration_seconds) FILTER (WHERE status = 'completed') AS avg_duration_seconds,
  SUM(duration_seconds) FILTER (WHERE status = 'completed') AS total_duration_seconds,
  COUNT(*) FILTER (WHERE transcription IS NOT NULL) AS transcribed_calls
FROM voice_call_logs
GROUP BY subscriber_id, DATE(created_at), direction;
```

---

### API Endpoint for Analytics

```javascript
router.get('/api/voice/analytics', authenticate_user, async (req, res) => {
  const { start_date, end_date } = req.query;
  const subscriber_id = req.user.id;
  
  const analytics = await db.query(`
    SELECT * FROM voice_call_analytics
    WHERE subscriber_id = $1
      AND call_date BETWEEN $2 AND $3
    ORDER BY call_date DESC
  `, [subscriber_id, start_date, end_date]);
  
  // Calculate totals
  const totals = analytics.rows.reduce((acc, row) => {
    acc.total_calls += row.total_calls;
    acc.completed_calls += row.completed_calls;
    acc.voicemail_calls += row.voicemail_calls;
    acc.failed_calls += row.failed_calls;
    acc.total_duration_seconds += row.total_duration_seconds || 0;
    return acc;
  }, {
    total_calls: 0,
    completed_calls: 0,
    voicemail_calls: 0,
    failed_calls: 0,
    total_duration_seconds: 0
  });
  
  totals.connection_rate = (totals.completed_calls / totals.total_calls * 100).toFixed(2);
  totals.voicemail_rate = (totals.voicemail_calls / totals.total_calls * 100).toFixed(2);
  totals.avg_duration_minutes = (totals.total_duration_seconds / totals.completed_calls / 60).toFixed(2);
  
  res.json({
    daily_breakdown: analytics.rows,
    summary: totals
  });
});
```

---

## Related Documents
- **06_BULLMQ_WORKERS.md** - Voice assistant worker implementation
- **04_TOKEN_SYSTEM.md** - Token pricing and deduction logic
- **02_DATABASE_SCHEMA.md** - voice_call_logs and phone_number_pool tables
- **05_API_ENDPOINTS.md** - Voice API endpoints

---

## Changelog

**Version 1.0 (2025-11-20)**
- Initial documentation
- Phone number management (pool, provisioning, release)
- Inbound call routing with webhook handlers
- Outbound call workflows and API endpoints
- TwiML flow definitions with examples
- Gemini TTS integration strategy
- Call recording and transcription workflows
- Voicemail detection and handling
- Token deduction logic (upfront, adjustment, refund)
- Analytics and reporting views

---

**Document Status:** PRODUCTION READY  
**Next Review:** After Phase 1 Twilio setup  
**Owner:** Gabe Sebastian (thedevingrey@gmail.com)
