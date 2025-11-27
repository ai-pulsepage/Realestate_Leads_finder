# ZENCODER IMPLEMENTATION GUIDE - PART 2
## Voice AI Advanced Features & Gemini Integration

**Project:** Miami-Dade Real Estate Leads SaaS Platform  
**Developer:** Zencoder  
**Document Version:** 1.0  
**Date:** November 24, 2025

---

## 📋 PART 2 OVERVIEW

This document covers:
1. **Gemini API Integration** - Intelligent conversation handling
2. **Appointment Management APIs** - Full CRUD for appointments
3. **Advanced Call Flows** - Transfer to human, voicemail handling
4. **Token Usage Enforcement** - Real-time balance checking
5. **Testing & Verification** - Complete testing procedures

**Estimated Time:** 4-5 hours  
**Prerequisites:** 
- Part 1 completed successfully
- Gemini API key obtained from Google AI Studio
- Twilio account configured with webhook URLs

---

## 🤖 SECTION 1: GEMINI API INTEGRATION

### Step 1.1: Get Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API key"
3. Copy the key (starts with `AIza...`)
4. Add to environment variables

### Step 1.2: Install Gemini SDK

Add to `package.json`:

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.21.0"
  }
}
```

Or install:

```bash
npm install @google/generative-ai --save
```

### Step 1.3: Create Gemini Service

Create file: `services/gemini.js`

```javascript
/**
 * GEMINI AI SERVICE
 * Handles intelligent conversation processing using Google Gemini
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate intelligent voice response based on conversation context
 * @param {Object} params - Parameters for response generation
 * @param {string} params.userQuery - What the caller said
 * @param {string} params.conversationHistory - Previous conversation
 * @param {Object} params.knowledgeBase - Subscriber's company info
 * @param {string} params.intent - Detected intent (optional)
 * @returns {Promise<string>} - AI-generated response
 */
async function generateVoiceResponse({ 
  userQuery, 
  conversationHistory = '', 
  knowledgeBase = {},
  intent = 'general_inquiry'
}) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build context-aware prompt
    const systemPrompt = buildSystemPrompt(knowledgeBase, intent);
    const fullPrompt = `
${systemPrompt}

CONVERSATION HISTORY:
${conversationHistory || 'No previous conversation'}

CALLER'S CURRENT QUESTION:
${userQuery}

INSTRUCTIONS:
- Provide a helpful, professional response as if you're speaking on the phone
- Keep response under 100 words
- Use conversational tone, not formal writing
- If caller asks about properties, pricing, or services, use the knowledge base
- If you need more info, ask a clarifying question
- If caller wants to speak to someone, acknowledge and say you'll connect them

RESPONSE:`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();

    console.log('🤖 Gemini response generated:', {
      userQuery: userQuery.substring(0, 50),
      responseLength: response.length
    });

    return response.trim();

  } catch (error) {
    console.error('❌ Gemini API error:', error);
    
    // Fallback response
    return "I apologize, but I'm having trouble processing that right now. Would you like me to connect you with someone who can help?";
  }
}

/**
 * Extract structured data from conversation transcript
 * @param {string} transcript - Full conversation text
 * @returns {Promise<Object>} - Extracted data (name, phone, email, intent)
 */
async function extractContactData(transcript) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
Analyze this phone conversation transcript and extract contact information and intent.

TRANSCRIPT:
${transcript}

Extract and return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "contact_name": "Full name or null",
  "contact_phone": "Phone number or null",
  "contact_email": "Email or null",
  "property_interest": "Property address if mentioned or null",
  "intent": "One of: investment, flip, wholesale, rental, homebuyer, seller, general_inquiry",
  "urgency": "One of: urgent, normal, low",
  "notes": "Brief summary of conversation"
}

Rules:
- If name not mentioned, use null
- Format phone as E.164 if possible (+1234567890)
- Only include email if explicitly stated
- Urgency: 'urgent' if they say soon/ASAP, 'low' if browsing, else 'normal'
- Notes should be 1-2 sentences max

JSON:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Clean response (remove markdown code blocks if present)
    let jsonText = responseText;
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const extracted = JSON.parse(jsonText);

    console.log('📊 Extracted contact data:', extracted);

    return extracted;

  } catch (error) {
    console.error('❌ Error extracting contact data:', error);
    
    return {
      contact_name: null,
      contact_phone: null,
      contact_email: null,
      property_interest: null,
      intent: 'general_inquiry',
      urgency: 'normal',
      notes: 'Error extracting data from transcript'
    };
  }
}

/**
 * Detect if caller wants to speak to a human
 * @param {string} speechText - What caller said
 * @returns {boolean}
 */
function detectTransferRequest(speechText) {
  const transferKeywords = [
    'speak to someone',
    'talk to a person',
    'human',
    'real person',
    'agent',
    'representative',
    'someone who can help',
    'transfer me',
    'connect me'
  ];

  const lowerText = speechText.toLowerCase();
  return transferKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Detect appointment-related intent
 * @param {string} speechText - What caller said
 * @returns {Object} - { wantsAppointment: boolean, appointmentType: string }
 */
function detectAppointmentIntent(speechText) {
  const lowerText = speechText.toLowerCase();

  const appointmentKeywords = {
    viewing: ['see the property', 'view', 'showing', 'tour', 'walk through'],
    consultation: ['consult', 'discuss', 'talk about', 'go over'],
    meeting: ['meet', 'meeting', 'sit down'],
    callback: ['call me back', 'call back', 'return call'],
    general: ['appointment', 'schedule', 'book', 'set up']
  };

  for (const [type, keywords] of Object.entries(appointmentKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return {
        wantsAppointment: true,
        appointmentType: type === 'general' ? 'consultation' : type
      };
    }
  }

  return {
    wantsAppointment: false,
    appointmentType: null
  };
}

/**
 * Build system prompt based on knowledge base
 * @param {Object} knowledgeBase - Subscriber's company info
 * @param {string} intent - Call intent
 * @returns {string}
 */
function buildSystemPrompt(knowledgeBase, intent) {
  const {
    company_name = 'our company',
    services = [],
    business_hours = 'regular business hours',
    specialties = [],
    about = ''
  } = knowledgeBase;

  return `
You are an AI receptionist for ${company_name}.

COMPANY INFORMATION:
${about || 'A real estate services company'}

SERVICES WE OFFER:
${services.length > 0 ? services.join(', ') : 'Real estate investment services'}

SPECIALTIES:
${specialties.length > 0 ? specialties.join(', ') : 'Distressed properties, wholesaling, fix-and-flip'}

BUSINESS HOURS:
${business_hours}

YOUR ROLE:
- Answer questions about our services
- Schedule appointments
- Collect contact information
- Qualify leads (investment intent, budget, timeline)
- Be helpful, professional, and warm
- If caller needs specific info you don't have, offer to connect them with someone

CURRENT CALL INTENT: ${intent}
`;
}

module.exports = {
  generateVoiceResponse,
  extractContactData,
  detectTransferRequest,
  detectAppointmentIntent
};
```

### Step 1.4: Add Gemini Response Route

Add to `routes/voice-ai.js` (insert after the `final-response` route):

```javascript
// ============================================================
// ROUTE 7: Gemini-Powered Response
// Twilio webhook: POST /api/voice-ai/gemini-response
// ============================================================

const geminiService = require('../services/gemini');

router.post('/gemini-response', async (req, res) => {
  try {
    console.log('🤖 Processing with Gemini AI');

    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const twilioNumber = req.body.To;

    // Get subscriber and conversation history
    const subscriberQuery = await req.db.query(`
      SELECT u.user_id, skb.knowledge_data
      FROM users u
      LEFT JOIN subscriber_knowledge_base skb ON u.user_id = skb.user_id
      WHERE u.twilio_phone_number = $1
    `, [twilioNumber]);

    if (subscriberQuery.rows.length === 0) {
      twiml.say('Error processing request. Goodbye.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const userId = subscriberQuery.rows[0].user_id;
    const knowledgeBase = subscriberQuery.rows[0].knowledge_data || {};

    // Get conversation history
    const historyQuery = await req.db.query(
      'SELECT conversation_transcript FROM ai_voice_call_logs WHERE call_sid = $1',
      [callSid]
    );

    const conversationHistory = historyQuery.rows.length > 0 
      ? historyQuery.rows[0].conversation_transcript 
      : '';

    // Get last user query from transcript
    const lines = conversationHistory.split('\n').filter(l => l.trim());
    const lastLine = lines[lines.length - 1] || '';
    const userQuery = lastLine.replace('Caller:', '').trim();

    // Generate AI response
    const aiResponse = await geminiService.generateVoiceResponse({
      userQuery,
      conversationHistory,
      knowledgeBase,
      intent: 'general_inquiry'
    });

    // Update transcript with AI response
    await req.db.query(`
      UPDATE ai_voice_call_logs 
      SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
      WHERE call_sid = $2
    `, [`AI: ${aiResponse}`, callSid]);

    // Speak the AI response
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, aiResponse);

    // Check if response indicates need for human transfer
    if (geminiService.detectTransferRequest(aiResponse)) {
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Let me connect you with someone who can help.');

      // In production, this would dial the subscriber's phone
      // For now, just acknowledge
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'I\'m transferring you now.');

      // Placeholder for actual transfer
      twiml.hangup();
    } else {
      // Continue conversation
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Is there anything else I can help you with?');

      const gather = twiml.gather({
        input: 'speech',
        action: '/api/voice-ai/process-response',
        method: 'POST',
        timeout: 5,
        speechTimeout: 'auto',
        language: 'en-US'
      });

      gather.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Please let me know if you need anything else.');

      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Thank you for calling. Goodbye!');

      twiml.hangup();
    }

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error in Gemini response:', error);
    
    const twiml = new VoiceResponse();
    twiml.say('I apologize for the technical difficulty. Please try calling back.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});
```

### Step 1.5: Add Environment Variable

Update Cloud Run deployment to include Gemini API key:

```bash
gcloud run services update real-estate-leads-api \
  --region us-east1 \
  --update-env-vars GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
```

---

## 📅 SECTION 2: APPOINTMENT MANAGEMENT APIs

### Step 2.1: Create Appointments Routes

Create file: `routes/appointments.js`

```javascript
/**
 * APPOINTMENTS ROUTES
 * Full CRUD operations for appointment management
 */

const express = require('express');
const router = express.Router();

// ============================================================
// GET /api/appointments/:user_id
// Get all appointments for a subscriber
// ============================================================

router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { status, upcoming_only } = req.query;

    let query = `
      SELECT 
        a.*,
        sl.lead_status as lead_status,
        sl.property_address as saved_lead_property
      FROM appointments a
      LEFT JOIN saved_leads sl ON a.saved_lead_id = sl.saved_lead_id
      WHERE a.user_id = $1
    `;

    const queryParams = [user_id];

    // Filter by status
    if (status) {
      query += ` AND a.appointment_status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    // Filter upcoming only
    if (upcoming_only === 'true') {
      query += ` AND a.appointment_datetime >= NOW()`;
    }

    query += ` ORDER BY a.appointment_datetime DESC`;

    const result = await req.db.query(query, queryParams);

    res.json({
      success: true,
      count: result.rows.length,
      appointments: result.rows
    });

  } catch (error) {
    console.error('❌ Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointments',
      error: error.message
    });
  }
});

// ============================================================
// GET /api/appointments/single/:appointment_id
// Get single appointment details
// ============================================================

router.get('/single/:appointment_id', async (req, res) => {
  try {
    const { appointment_id } = req.params;

    const result = await req.db.query(`
      SELECT 
        a.*,
        u.email as subscriber_email,
        sl.lead_status,
        sl.property_address as saved_lead_property,
        acl.conversation_transcript,
        acl.call_recording_url
      FROM appointments a
      LEFT JOIN users u ON a.user_id = u.user_id
      LEFT JOIN saved_leads sl ON a.saved_lead_id = sl.saved_lead_id
      LEFT JOIN ai_voice_call_logs acl ON a.call_sid = acl.call_sid
      WHERE a.appointment_id = $1
    `, [appointment_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.json({
      success: true,
      appointment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching appointment',
      error: error.message
    });
  }
});

// ============================================================
// POST /api/appointments
// Create new appointment manually
// ============================================================

router.post('/', async (req, res) => {
  try {
    const {
      user_id,
      contact_name,
      contact_phone,
      contact_email,
      appointment_datetime,
      appointment_type,
      notes,
      property_address,
      saved_lead_id,
      urgency_level
    } = req.body;

    // Validation
    if (!user_id || !appointment_datetime) {
      return res.status(400).json({
        success: false,
        message: 'user_id and appointment_datetime are required'
      });
    }

    const result = await req.db.query(`
      INSERT INTO appointments (
        user_id, contact_name, contact_phone, contact_email,
        appointment_datetime, appointment_type, appointment_status,
        notes, property_address, saved_lead_id, urgency_level,
        lead_source
      ) VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, $8, $9, $10, 'manual')
      RETURNING *
    `, [
      user_id,
      contact_name,
      contact_phone,
      contact_email,
      appointment_datetime,
      appointment_type || 'consultation',
      notes,
      property_address,
      saved_lead_id,
      urgency_level || 'normal'
    ]);

    console.log('✅ Appointment created:', result.rows[0].appointment_id);

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      appointment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating appointment',
      error: error.message
    });
  }
});

// ============================================================
// PUT /api/appointments/:appointment_id
// Update appointment
// ============================================================

router.put('/:appointment_id', async (req, res) => {
  try {
    const { appointment_id } = req.params;
    const {
      contact_name,
      contact_phone,
      contact_email,
      appointment_datetime,
      appointment_type,
      appointment_status,
      notes,
      property_address,
      urgency_level
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (contact_name !== undefined) {
      updates.push(`contact_name = $${paramCount++}`);
      values.push(contact_name);
    }
    if (contact_phone !== undefined) {
      updates.push(`contact_phone = $${paramCount++}`);
      values.push(contact_phone);
    }
    if (contact_email !== undefined) {
      updates.push(`contact_email = $${paramCount++}`);
      values.push(contact_email);
    }
    if (appointment_datetime !== undefined) {
      updates.push(`appointment_datetime = $${paramCount++}`);
      values.push(appointment_datetime);
    }
    if (appointment_type !== undefined) {
      updates.push(`appointment_type = $${paramCount++}`);
      values.push(appointment_type);
    }
    if (appointment_status !== undefined) {
      updates.push(`appointment_status = $${paramCount++}`);
      values.push(appointment_status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    if (property_address !== undefined) {
      updates.push(`property_address = $${paramCount++}`);
      values.push(property_address);
    }
    if (urgency_level !== undefined) {
      updates.push(`urgency_level = $${paramCount++}`);
      values.push(urgency_level);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(appointment_id);

    const query = `
      UPDATE appointments
      SET ${updates.join(', ')}
      WHERE appointment_id = $${paramCount}
      RETURNING *
    `;

    const result = await req.db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    console.log('✅ Appointment updated:', appointment_id);

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      appointment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating appointment',
      error: error.message
    });
  }
});

// ============================================================
// DELETE /api/appointments/:appointment_id
// Delete (cancel) appointment
// ============================================================

router.delete('/:appointment_id', async (req, res) => {
  try {
    const { appointment_id } = req.params;

    // Soft delete by updating status
    const result = await req.db.query(`
      UPDATE appointments
      SET appointment_status = 'cancelled'
      WHERE appointment_id = $1
      RETURNING *
    `, [appointment_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    console.log('✅ Appointment cancelled:', appointment_id);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling appointment',
      error: error.message
    });
  }
});

// ============================================================
// GET /api/appointments/stats/:user_id
// Get appointment statistics
// ============================================================

router.get('/stats/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await req.db.query(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(*) FILTER (WHERE appointment_status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE appointment_status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE appointment_status = 'completed') as completed,
        COUNT(*) FILTER (WHERE appointment_status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE appointment_status = 'no_show') as no_shows,
        COUNT(*) FILTER (WHERE appointment_datetime >= NOW()) as upcoming,
        COUNT(*) FILTER (WHERE urgency_level = 'urgent') as urgent_count,
        COUNT(*) FILTER (WHERE lead_source = 'voice_ai') as from_voice_ai
      FROM appointments
      WHERE user_id = $1
    `, [user_id]);

    res.json({
      success: true,
      stats: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error fetching appointment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stats',
      error: error.message
    });
  }
});

module.exports = router;
```

### Step 2.2: Mount Appointments Routes

Edit `server.js`:

```javascript
// Add require
const appointmentsRoutes = require('./routes/appointments');

// Add route mount
app.use('/api/appointments', checkDatabase, appointmentsRoutes);
```

### Step 2.3: Test Appointments API

**Create appointment:**

```bash
curl -X POST https://real-estate-leads-api-556658726901.us-east1.run.app/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "6f92d630-38f4-4f61-ae24-2a8568b080bc",
    "contact_name": "John Investor",
    "contact_phone": "+15551234567",
    "contact_email": "john@example.com",
    "appointment_datetime": "2025-11-25T14:00:00Z",
    "appointment_type": "property_viewing",
    "notes": "Interested in distressed properties",
    "urgency_level": "urgent"
  }'
```

**Get appointments:**

```bash
curl "https://real-estate-leads-api-556658726901.us-east1.run.app/api/appointments/6f92d630-38f4-4f61-ae24-2a8568b080bc?upcoming_only=true"
```

---

## 🔄 SECTION 3: ADVANCED CALL FLOWS

### Step 3.1: Add Transfer to Human Route

Add to `routes/voice-ai.js`:

```javascript
// ============================================================
// ROUTE 8: Transfer to Human
// Twilio webhook: POST /api/voice-ai/transfer-to-human
// ============================================================

router.post('/transfer-to-human', async (req, res) => {
  try {
    console.log('📲 Transferring call to human');

    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;
    const twilioNumber = req.body.To;

    // Get subscriber's phone number
    const subscriberQuery = await req.db.query(`
      SELECT u.user_id, u.email, skb.knowledge_data
      FROM users u
      LEFT JOIN subscriber_knowledge_base skb ON u.user_id = skb.user_id
      WHERE u.twilio_phone_number = $1
    `, [twilioNumber]);

    if (subscriberQuery.rows.length === 0) {
      twiml.say('Unable to transfer call. Please try again later.');
      twiml.hangup();
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const knowledgeBase = subscriberQuery.rows[0].knowledge_data || {};
    const forwardNumber = knowledgeBase.forward_phone_number || knowledgeBase.phone_number;

    if (!forwardNumber) {
      twiml.say('Sorry, no transfer number is configured. Please call back during business hours.');
      twiml.hangup();
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Update call log
    await req.db.query(`
      UPDATE ai_voice_call_logs
      SET call_outcome = 'transferred_to_human'
      WHERE call_sid = $1
    `, [callSid]);

    // Announce transfer
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Transferring you now. Please hold.');

    // Dial subscriber's number
    const dial = twiml.dial({
      callerId: req.body.From, // Show caller's number to subscriber
      timeout: 30,
      action: '/api/voice-ai/transfer-status',
      method: 'POST'
    });

    dial.number(forwardNumber);

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error transferring call:', error);
    
    const twiml = new VoiceResponse();
    twiml.say('Sorry, unable to transfer your call. Please try again.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 9: Transfer Status Callback
// Twilio webhook: POST /api/voice-ai/transfer-status
// ============================================================

router.post('/transfer-status', async (req, res) => {
  try {
    console.log('📊 Transfer status:', {
      CallSid: req.body.CallSid,
      DialCallStatus: req.body.DialCallStatus
    });

    const twiml = new VoiceResponse();
    const dialStatus = req.body.DialCallStatus;

    if (dialStatus === 'completed') {
      // Call was answered, then ended normally
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Thank you for calling. Goodbye!');
    } else if (dialStatus === 'no-answer' || dialStatus === 'busy') {
      // No answer or busy
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Sorry, no one is available right now. Would you like to leave a message?');

      const gather = twiml.gather({
        input: 'speech dtmf',
        action: '/api/voice-ai/voicemail',
        method: 'POST',
        timeout: 3,
        numDigits: 1
      });

      gather.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Press 1 or say yes to leave a message.');

      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'No message recorded. Goodbye!');
    } else {
      // Other failure
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Unable to complete the transfer. Please try calling back later.');
    }

    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error in transfer status:', error);
    
    const twiml = new VoiceResponse();
    twiml.say('Thank you for calling. Goodbye!');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});
```

### Step 3.2: Add Voicemail Handler

Add to `routes/voice-ai.js`:

```javascript
// ============================================================
// ROUTE 10: Voicemail Recording
// Twilio webhook: POST /api/voice-ai/voicemail
// ============================================================

router.post('/voicemail', async (req, res) => {
  try {
    console.log('📧 Starting voicemail recording');

    const twiml = new VoiceResponse();
    const callSid = req.body.CallSid;

    // Update call log
    await req.db.query(`
      UPDATE ai_voice_call_logs
      SET call_outcome = 'voicemail_left'
      WHERE call_sid = $1
    `, [callSid]);

    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Please leave your message after the beep. Press the pound key when finished.');

    // Record message
    twiml.record({
      maxLength: 120, // 2 minutes max
      finishOnKey: '#',
      recordingStatusCallback: '/api/voice-ai/voicemail-callback',
      recordingStatusCallbackMethod: 'POST',
      transcribe: true,
      transcribeCallback: '/api/voice-ai/voicemail-transcription'
    });

    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Thank you for your message. Goodbye!');

    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error starting voicemail:', error);
    
    const twiml = new VoiceResponse();
    twiml.say('Sorry, unable to record message. Please call back.');
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 11: Voicemail Recording Callback
// Twilio webhook: POST /api/voice-ai/voicemail-callback
// ============================================================

router.post('/voicemail-callback', async (req, res) => {
  try {
    console.log('📼 Voicemail recording completed:', {
      CallSid: req.body.CallSid,
      RecordingUrl: req.body.RecordingUrl,
      RecordingDuration: req.body.RecordingDuration
    });

    const callSid = req.body.CallSid;
    const recordingUrl = req.body.RecordingUrl;
    const duration = req.body.RecordingDuration;

    // Save recording URL to call log
    await req.db.query(`
      UPDATE ai_voice_call_logs
      SET 
        call_recording_url = $1,
        duration_seconds = $2
      WHERE call_sid = $3
    `, [recordingUrl, duration, callSid]);

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error saving voicemail:', error);
    res.status(200).send('OK');
  }
});

// ============================================================
// ROUTE 12: Voicemail Transcription Callback
// Twilio webhook: POST /api/voice-ai/voicemail-transcription
// ============================================================

router.post('/voicemail-transcription', async (req, res) => {
  try {
    console.log('📝 Voicemail transcription received:', {
      CallSid: req.body.CallSid,
      TranscriptionText: req.body.TranscriptionText
    });

    const callSid = req.body.CallSid;
    const transcriptionText = req.body.TranscriptionText;

    // Save transcription
    await req.db.query(`
      UPDATE ai_voice_call_logs
      SET conversation_transcript = COALESCE(conversation_transcript, '') || $1
      WHERE call_sid = $2
    `, [`\n\nVoicemail: ${transcriptionText}`, callSid]);

    // Extract contact data from voicemail
    const geminiService = require('../services/gemini');
    const extractedData = await geminiService.extractContactData(transcriptionText);

    // Update call log with extracted data
    await req.db.query(`
      UPDATE ai_voice_call_logs
      SET extracted_data = $1
      WHERE call_sid = $2
    `, [JSON.stringify(extractedData), callSid]);

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error processing transcription:', error);
    res.status(200).send('OK');
  }
});
```

---

## 💰 SECTION 4: TOKEN USAGE ENFORCEMENT

Token usage is already implemented in the status callback (see Part 1), but let's add real-time balance checking.

### Step 4.1: Add Token Check Middleware

Add to `routes/voice-ai.js` at the top:

```javascript
/**
 * Middleware: Check token balance before processing call
 */
async function checkTokenBalance(req, res, next) {
  try {
    const twilioNumber = req.body.To;
    
    if (!twilioNumber) {
      return next();
    }

    const balanceQuery = await req.db.query(`
      SELECT sp.token_balance, u.user_id
      FROM users u
      JOIN subscriber_profiles sp ON u.user_id = sp.user_id
      WHERE u.twilio_phone_number = $1
    `, [twilioNumber]);

    if (balanceQuery.rows.length === 0) {
      return next();
    }

    const { token_balance, user_id } = balanceQuery.rows[0];

    // Require minimum 500 tokens (1 minute of call)
    if (token_balance < 500) {
      const twiml = new VoiceResponse();
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Your account has insufficient tokens. Please add more tokens to continue using Voice AI.');
      twiml.hangup();

      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Attach user_id to request for later use
    req.voiceAI = {
      userId: user_id,
      tokenBalance: token_balance
    };

    next();

  } catch (error) {
    console.error('❌ Token check error:', error);
    next(); // Allow call to proceed on error
  }
}

// Apply middleware to routes that consume tokens
router.post('/incoming', checkTokenBalance, async (req, res) => {
  // ... existing incoming call handler
});
```

---

## ✅ SECTION 5: TESTING & VERIFICATION

### Test 1: Configure Twilio Webhooks

1. Log into Twilio Console
2. Go to Phone Numbers → Manage → Active Numbers
3. Click on your number: +17865446480
4. Configure Voice & Fax:
   - **A CALL COMES IN:** Webhook, `https://real-estate-leads-api-556658726901.us-east1.run.app/api/voice-ai/incoming`, HTTP POST
   - **STATUS CALLBACK URL:** `https://real-estate-leads-api-556658726901.us-east1.run.app/api/voice-ai/status-callback`, HTTP POST
5. Save

### Test 2: Assign Phone Number to Test User

```sql
UPDATE users
SET 
  twilio_phone_number = '+17865446480',
  voice_ai_enabled = true,
  from_email = 'thedevingrey@gmail.com'
WHERE email = 'test@realestateleads.com';

-- Verify
SELECT 
  email,
  twilio_phone_number,
  voice_ai_enabled
FROM users
WHERE email = 'test@realestateleads.com';
```

### Test 3: Add Knowledge Base

```sql
INSERT INTO subscriber_knowledge_base (user_id, knowledge_data)
VALUES (
  '6f92d630-38f4-4f61-ae24-2a8568b080bc',
  '{
    "company_name": "Miami Property Investors",
    "phone_number": "+15551234567",
    "forward_phone_number": "+15551234567",
    "business_hours": "Monday-Friday, 9 AM to 6 PM EST",
    "services": [
      "Distressed property acquisition",
      "Wholesale deals",
      "Fix and flip opportunities",
      "Investment property consulting"
    ],
    "specialties": [
      "Miami-Dade foreclosures",
      "Pre-foreclosure properties",
      "Short sales",
      "Estate sales"
    ],
    "about": "We specialize in finding and closing distressed property deals in Miami-Dade County. With over 10 years of experience, we help investors find profitable opportunities."
  }'::jsonb
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  knowledge_data = EXCLUDED.knowledge_data,
  updated_at = NOW();

-- Verify
SELECT knowledge_data FROM subscriber_knowledge_base 
WHERE user_id = '6f92d630-38f4-4f61-ae24-2a8568b080bc';
```

### Test 4: Make Test Call

**From your phone:**
1. Call: +1 (786) 544-6480
2. Listen for AI greeting
3. Say: "I'm interested in investment properties"
4. Continue conversation
5. Try saying: "I'd like to schedule an appointment"
6. Try saying: "Can I speak to someone?"

### Test 5: Verify Database Logs

```sql
-- Check call was logged
SELECT 
  call_sid,
  call_type,
  direction,
  call_status,
  call_outcome,
  duration_seconds,
  tokens_used,
  LEFT(conversation_transcript, 100) as transcript_preview
FROM ai_voice_call_logs
ORDER BY created_at DESC
LIMIT 5;

-- Check appointments created
SELECT 
  appointment_id,
  contact_name,
  contact_phone,
  appointment_datetime,
  appointment_type,
  appointment_status,
  lead_source
FROM appointments
ORDER BY created_at DESC
LIMIT 5;

-- Check token balance was deducted
SELECT 
  user_id,
  action_type,
  tokens_used,
  reference_type,
  created_at
FROM token_usage_log
ORDER BY created_at DESC
LIMIT 5;
```

### Test 6: Test Appointments API

```bash
# Get appointments
curl "https://real-estate-leads-api-556658726901.us-east1.run.app/api/appointments/6f92d630-38f4-4f61-ae24-2a8568b080bc"

# Get appointment stats
curl "https://real-estate-leads-api-556658726901.us-east1.run.app/api/appointments/stats/6f92d630-38f4-4f61-ae24-2a8568b080bc"

# Update appointment status
curl -X PUT "https://real-estate-leads-api-556658726901.us-east1.run.app/api/appointments/APPOINTMENT_ID_HERE" \
  -H "Content-Type: application/json" \
  -d '{"appointment_status": "confirmed"}'
```

---

## ✅ PART 2 COMPLETION CHECKLIST

- [ ] Gemini API key obtained and configured
- [ ] `services/gemini.js` created with all helper functions
- [ ] Gemini response route added to voice-ai.js
- [ ] `routes/appointments.js` created with full CRUD
- [ ] Appointments routes mounted in server.js
- [ ] Transfer to human routes added
- [ ] Voicemail recording routes added
- [ ] Token balance checking middleware added
- [ ] Code deployed to Cloud Run
- [ ] Twilio webhooks configured
- [ ] Test user has phone number assigned
- [ ] Knowledge base added for test user
- [ ] Live phone call test completed successfully
- [ ] Call logged in database with transcript
- [ ] Appointment created from voice call
- [ ] Tokens deducted correctly
- [ ] All appointment API endpoints tested

---

## 🎯 SUCCESS CRITERIA

Voice AI is working when:
1. ✅ Calling the Twilio number connects to AI
2. ✅ AI responds with company-specific information
3. ✅ Appointments can be scheduled via voice
4. ✅ Calls are logged with transcripts
5. ✅ Tokens are deducted based on call duration
6. ✅ Transfer to human works when requested
7. ✅ Voicemail recording works when no answer
8. ✅ All appointment CRUD operations work via API

---

**Next:** Part 3 covers Email Campaign system implementation

**Document prepared by:** AI Assistant  
**For developer:** Zencoder  
**Date:** November 24, 2025
