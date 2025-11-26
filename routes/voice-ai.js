/**
 * VOICE AI ROUTES
 * Handles Twilio webhook callbacks for inbound/outbound calls
 */

const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const geminiService = require('../services/gemini');

/**
 * Middleware: Check token balance before processing call
 */
async function checkTokenBalance(req, res, next) {
  try {
    const twilioNumber = req.body.To;

    if (!twilioNumber) {
      return next();
    }
    const balanceQuery = await req.pool.query(`
      SELECT u.token_balance, u.user_id
      FROM users u
      WHERE u.twilio_phone_number = $1
    `, [twilioNumber]);

    if (balanceQuery.rows.length === 0) {
      return next();
    }

    const { token_balance, user_id } = balanceQuery.rows[0];

    // Require minimum 500 tokens (1 minute of call)
    if (token_balance < 500) {
      const twiml = new twilio.twiml.VoiceResponse();
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

// ============================================================
// ROUTE 1: Handle Incoming Calls
// Twilio webhook: POST /api/voice-ai/incoming
// ============================================================

router.post('/incoming', checkTokenBalance, async (req, res) => {
  try {
    console.log('📞 Incoming call webhook received:', {
      CallSid: req.body.CallSid,
      From: req.body.From,
      To: req.body.To,
      CallStatus: req.body.CallStatus
    });

    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const callerNumber = req.body.From;
    const twilioNumber = req.body.To;

    // Find which subscriber owns this Twilio number
    const subscriberQuery = await req.pool.query(
      'SELECT user_id, email FROM users WHERE twilio_phone_number = $1 AND voice_ai_enabled = true',
      [twilioNumber]
    );

    if (subscriberQuery.rows.length === 0) {
      // No subscriber found - return generic message
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'This number is not currently configured. Please contact support.');

      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const subscriber = subscriberQuery.rows[0];
    const userId = subscriber.user_id;

    // Check token balance
    const balanceQuery = await req.pool.query(
      'SELECT token_balance FROM users WHERE user_id = $1',
      [userId]
    );

    if (balanceQuery.rows.length === 0 || balanceQuery.rows[0].token_balance < 500) {
      // Insufficient tokens
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Your account has insufficient tokens to handle this call. Please add more tokens and try again.');

      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Log the incoming call
    await req.pool.query(`
      INSERT INTO ai_voice_call_logs (
        user_id, call_sid, call_type, direction,
        caller_number, twilio_number, call_status
      ) VALUES ($1, $2, 'inbound', 'incoming', $3, $4, 'ringing')
    `, [userId, callSid, callerNumber, twilioNumber]);

    // Load subscriber's knowledge base
    const knowledgeQuery = await req.pool.query(
      'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1',
      [userId]
    );

    // Redirect to language menu
    twiml.redirect('/api/voice-ai/language-menu');

    console.log('✅ Redirecting to language menu');
    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error handling incoming call:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'An error occurred. Please try again later.');

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 2: Language Menu System
// Twilio webhook: POST /api/voice-ai/language-menu
// ============================================================

/**
 * POST /api/voice-ai/language-menu
 * Plays streamlined bilingual language selection menu
 */
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

// ============================================================
// ROUTE 3: Language Selection Handler
// Twilio webhook: POST /api/voice-ai/language-selected
// ============================================================

/**
 * POST /api/voice-ai/language-selected
 * Processes language selection and connects to WebSocket for real-time conversation
 */
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

// ============================================================
// ROUTE 4: Process Caller Response
// Twilio webhook: POST /api/voice-ai/process-response
// ============================================================

router.post('/process-response', async (req, res) => {
  try {
    console.log('🎤 Processing caller speech:', {
      CallSid: req.body.CallSid,
      SpeechResult: req.body.SpeechResult,
      Confidence: req.body.Confidence
    });

    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const speechResult = req.body.SpeechResult || '';
    const twilioNumber = req.body.To;

    // Get subscriber info
    const subscriberQuery = await req.pool.query(
      'SELECT user_id FROM users WHERE twilio_phone_number = $1',
      [twilioNumber]
    );

    if (subscriberQuery.rows.length === 0) {
      twiml.say('Error finding account. Goodbye.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const userId = subscriberQuery.rows[0].user_id;

    // Update call log with speech transcript
    await req.pool.query(`
      UPDATE ai_voice_call_logs
      SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
      WHERE call_sid = $2
    `, [`Caller: ${speechResult}`, callSid]);

    // Check for appointment-related keywords
    const appointmentKeywords = ['appointment', 'schedule', 'meeting', 'viewing', 'see the property', 'visit'];
    const wantsAppointment = appointmentKeywords.some(keyword =>
      speechResult.toLowerCase().includes(keyword)
    );

    if (wantsAppointment) {
      // Route to appointment scheduling flow
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Great! I can help you schedule an appointment. What day and time works best for you?');

      const gather = twiml.gather({
        input: 'speech',
        action: '/api/voice-ai/schedule-appointment',
        method: 'POST',
        timeout: 5,
        speechTimeout: 'auto',
        language: 'en-US'
      });

      gather.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Please tell me your preferred date and time.');

    } else {
      // General inquiry - send to Gemini for intelligent response
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Let me help you with that. Please hold for just a moment while I look up that information.');

      // Redirect to Gemini processing
      twiml.redirect({
        method: 'POST'
      }, '/api/voice-ai/gemini-response');
    }

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error processing response:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred processing your request. Please try again.');

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 3: Schedule Appointment
// Twilio webhook: POST /api/voice-ai/schedule-appointment
// ============================================================

router.post('/schedule-appointment', async (req, res) => {
  try {
    console.log('📅 Scheduling appointment:', {
      CallSid: req.body.CallSid,
      SpeechResult: req.body.SpeechResult
    });

    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const speechResult = req.body.SpeechResult || '';
    const callerNumber = req.body.From;
    const twilioNumber = req.body.To;

    // Get subscriber
    const subscriberQuery = await req.pool.query(
      'SELECT user_id FROM users WHERE twilio_phone_number = $1',
      [twilioNumber]
    );

    const userId = subscriberQuery.rows[0].user_id;

    // Update transcript
    await req.pool.query(`
      UPDATE ai_voice_call_logs
      SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
      WHERE call_sid = $2
    `, [`Caller: ${speechResult}`, callSid]);

    // Parse datetime from speech (simplified - in production use Gemini for better parsing)
    // For now, create appointment 24 hours from now as placeholder
    const appointmentTime = new Date();
    appointmentTime.setHours(appointmentTime.getHours() + 24);

    // Ask for caller's name
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Perfect! Can I get your full name please?');

    const gather = twiml.gather({
      input: 'speech',
      action: '/api/voice-ai/collect-contact-info',
      method: 'POST',
      timeout: 5,
      speechTimeout: 'auto',
      language: 'en-US'
    });

    gather.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Please state your first and last name.');

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error scheduling appointment:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, I had trouble scheduling that appointment. Please try again.');

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 4: Collect Contact Information
// Twilio webhook: POST /api/voice-ai/collect-contact-info
// ============================================================

router.post('/collect-contact-info', async (req, res) => {
  try {
    console.log('📝 Collecting contact info:', {
      CallSid: req.body.CallSid,
      SpeechResult: req.body.SpeechResult
    });

    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const callerName = req.body.SpeechResult || 'Unknown';
    const callerNumber = req.body.From;
    const twilioNumber = req.body.To;

    // Get subscriber
    const subscriberQuery = await req.pool.query(
      'SELECT user_id FROM users WHERE twilio_phone_number = $1',
      [twilioNumber]
    );

    const userId = subscriberQuery.rows[0].user_id;

    // Update transcript
    await req.pool.query(`
      UPDATE ai_voice_call_logs
      SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
      WHERE call_sid = $2
    `, [`Caller name: ${callerName}`, callSid]);

    // Create appointment (24 hours from now as placeholder)
    const appointmentTime = new Date();
    appointmentTime.setHours(appointmentTime.getHours() + 24);

    const appointmentResult = await req.pool.query(`
      INSERT INTO appointments (
        user_id, contact_name, contact_phone,
        appointment_datetime, appointment_type,
        appointment_status, call_sid, notes,
        lead_source
      ) VALUES ($1, $2, $3, $4, 'phone_call', 'scheduled', $5, $6, 'voice_ai')
      RETURNING appointment_id
    `, [
      userId,
      callerName,
      callerNumber,
      appointmentTime,
      callSid,
      'Appointment scheduled via AI voice call'
    ]);

    // Update call log with outcome
    await req.pool.query(`
      UPDATE ai_voice_call_logs
      SET
        call_outcome = 'appointment_scheduled',
        appointment_id = $1,
        extracted_data = jsonb_build_object(
          'caller_name', $2,
          'caller_phone', $3
        )
      WHERE call_sid = $4
    `, [appointmentResult.rows[0].appointment_id, callerName, callerNumber, callSid]);

    // Confirm with caller
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, `Thank you ${callerName}! I've scheduled an appointment for you. You'll receive a confirmation shortly at this number. Is there anything else I can help you with?`);

    const gather = twiml.gather({
      input: 'speech',
      action: '/api/voice-ai/final-response',
      method: 'POST',
      timeout: 3,
      speechTimeout: 'auto',
      language: 'en-US',
      numDigits: 1
    });

    gather.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Say yes if you need anything else, or no to end the call.');

    // Default ending
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'Thank you for calling. Have a great day!');

    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error collecting contact info:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, I had trouble saving your information. Please try again.');

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 5: Final Response Handler
// Twilio webhook: POST /api/voice-ai/final-response
// ============================================================

router.post('/final-response', async (req, res) => {
  try {
    const twiml = new twilio.twiml.VoiceResponse();
    const speechResult = (req.body.SpeechResult || '').toLowerCase();
    const callSid = req.body.CallSid;

    if (speechResult.includes('yes') || speechResult.includes('yeah') || speechResult.includes('sure')) {
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'What else can I help you with?');

      twiml.redirect({
        method: 'POST'
      }, '/api/voice-ai/process-response');
    } else {
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'Thank you for calling. Have a great day!');

      twiml.hangup();
    }

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error in final response:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Thank you for calling. Goodbye!');
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 6: Call Status Callback
// Twilio webhook: POST /api/voice-ai/status-callback
// ============================================================

router.post('/status-callback', async (req, res) => {
  try {
    console.log('📊 Call status update:', {
      CallSid: req.body.CallSid,
      CallStatus: req.body.CallStatus,
      CallDuration: req.body.CallDuration
    });

    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;
    const callDuration = parseInt(req.body.CallDuration || '0');

    // Update call log
    await req.pool.query(`
      UPDATE ai_voice_call_logs
      SET
        call_status = $1,
        duration_seconds = $2,
        ended_at = NOW()
      WHERE call_sid = $3
    `, [callStatus, callDuration, callSid]);

    // Calculate and deduct tokens (500 tokens per minute)
    if (callStatus === 'completed' && callDuration > 0) {
      const minutes = Math.ceil(callDuration / 60);
      const tokensUsed = minutes * 500;

      // Get user_id from call log
      const callLogQuery = await req.pool.query(
        'SELECT user_id FROM ai_voice_call_logs WHERE call_sid = $1',
        [callSid]
      );

      if (callLogQuery.rows.length > 0) {
        const userId = callLogQuery.rows[0].user_id;

        // Deduct tokens
        await req.pool.query(`
          UPDATE subscriber_profiles
          SET token_balance = token_balance - $1
          WHERE user_id = $2
        `, [tokensUsed, userId]);

        // Log token usage
        await req.pool.query(`
          INSERT INTO token_usage_log (
            user_id, action_type, tokens_used,
            reference_id, reference_type
          ) VALUES ($1, 'voice_call', $2, $3, 'call')
        `, [userId, tokensUsed, callSid]);

        // Update call log with token cost
        await req.pool.query(`
          UPDATE ai_voice_call_logs
          SET tokens_used = $1
          WHERE call_sid = $2
        `, [tokensUsed, callSid]);

        console.log(`💰 Deducted ${tokensUsed} tokens for ${minutes} minute call`);
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Error in status callback:', error);
    res.status(200).send('OK'); // Always return 200 to Twilio
  }
});

// ============================================================
// ROUTE 7: Gemini-Powered Response
// Twilio webhook: POST /api/voice-ai/gemini-response
// ============================================================

router.post('/gemini-response', async (req, res) => {
  try {
    console.log('🤖 Processing with Gemini AI');

    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const twilioNumber = req.body.To;

    // Get subscriber and conversation history
    const subscriberQuery = await req.pool.query(`
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
    const historyQuery = await req.pool.query(
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
    await req.pool.query(`
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
      }, 'Please tell me what you need help with.');
    }

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error in Gemini response:', error);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, I had trouble processing that. Please try again.');

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 8: Transfer to Human
// Twilio webhook: POST /api/voice-ai/transfer-to-human
// ============================================================

router.post('/transfer-to-human', async (req, res) => {
  try {
    console.log('📲 Transferring call to human');

    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const twilioNumber = req.body.To;

    // Get subscriber's phone number
    const subscriberQuery = await req.pool.query(`
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
    await req.pool.query(`
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

    const twiml = new twilio.twiml.VoiceResponse();
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

    const twiml = new twilio.twiml.VoiceResponse();
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

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Thank you for calling. Goodbye!');
    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 10: Voicemail Recording
// Twilio webhook: POST /api/voice-ai/voicemail
// ============================================================

router.post('/voicemail', async (req, res) => {
  try {
    console.log('📧 Starting voicemail recording');

    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;

    // Update call log
    await req.pool.query(`
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

    const twiml = new twilio.twiml.VoiceResponse();
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
    await req.pool.query(`
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
    await req.pool.query(`
      UPDATE ai_voice_call_logs
      SET conversation_transcript = COALESCE(conversation_transcript, '') || $1
      WHERE call_sid = $2
    `, [`\n\nVoicemail: ${transcriptionText}`, callSid]);

    // Extract contact data from voicemail
    const geminiService = require('../services/gemini');
    const extractedData = await geminiService.extractContactData(transcriptionText);

    // Update call log with extracted data
    await req.pool.query(`
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

// ============================================================
// AUDIO HANDLING FUNCTIONS
// ============================================================

const { decode: decodeMulaw, encode: encodeMulaw } = require('g711');

/**
 * Handle incoming audio from Twilio, process with Gemini, send response back
 * @param {Object} mediaData - Twilio media data with base64 payload
 * @param {Object} liveSession - Gemini live session
 * @param {WebSocket} ws - WebSocket connection to Twilio
 * @param {string} streamSid - Twilio stream SID
 */
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

/**
 * Finalize call logging and cleanup
 * @param {Object} pool - Database connection pool
 * @param {string} userId - User ID
 * @param {string} callSid - Twilio call SID
 * @param {string} language - Language code
 */
async function finalizeCall(pool, userId, callSid, language) {
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

/**
 * Generate error audio message for caller
 * @param {string} message - Error message text
 * @returns {string} Base64 encoded μ-law audio
 */
function generateErrorAudio(message) {
  try {
    // Create a simple TwiML response for error message
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, message);

    // For now, return empty audio - in production you'd synthesize this
    // This is a placeholder that should be replaced with actual TTS
    return Buffer.from('').toString('base64');
  } catch (error) {
    console.error('❌ Error generating error audio:', error);
    return Buffer.from('').toString('base64');
  }
}

// ============================================================
// ROUTE 13: Media Stream Handler (WebSocket)
// Twilio webhook: POST /api/voice-ai/media-stream
// ============================================================

router.all('/media-stream', (req, res) => {
  console.log('🎙️ Media stream connection requested');

  // Extract query parameters from URL
  const url = require('url');
  const queryParams = url.parse(req.url, true).query;
  const language = queryParams.language || 'en';
  const userId = queryParams.userId;
  const callSid = queryParams.callSid;

  console.log(`Language: ${language}, User ID: ${userId}, Call SID: ${callSid}`);

  // WebSocket upgrade handler
  res.on('upgrade', async (request, socket, head) => {
    try {
      // Load knowledge data for this user
      // PostgreSQL: Direct pool query
      let knowledgeData;

      try {
        const knowledgeResult = await req.pool.query(
          'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1',
          [userId]
        );

        if (knowledgeResult.rows.length === 0) {
          throw new Error('No knowledge data found for user');
        }

        knowledgeData = knowledgeResult.rows[0].knowledge_data;
      } finally {
        
      }

      // Import utility functions
      const { getBrandVoicePrompt } = require('../utils/voice-customization');

      // Get brand voice system instruction for selected language
      const systemInstruction = getBrandVoicePrompt(knowledgeData, language);

      // ===============================================
      // BRAND VOICE CONFIGURATION LOGGING
      // ===============================================
      console.log('===========================================');
      console.log('BRAND VOICE CONFIGURATION');
      console.log('===========================================');
      console.log(`Company: ${knowledgeData.company_name}`);
      console.log(`Brand Voice: ${knowledgeData.brand_voice}`);
      console.log(`Language: ${language}`);
      console.log(`System Instruction Preview:`);
      console.log(systemInstruction.substring(0, 200) + '...');
      console.log('===========================================');

      // Initialize Gemini model
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash-latest', // FIXED: was 'gemini-1.5-flash'
        systemInstruction: systemInstruction
      });

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

      console.log('✅ Gemini live session started');
      console.log(`✅ Using voice: ${selectedVoice.displayName} (${selectedVoice.voiceName})`);

      // ===============================================
      // WEB SOCKET HANDLING - FULL IMPLEMENTATION
      // ===============================================

      const WebSocket = require('ws');

      // Create WebSocket server
      const wss = new WebSocket.Server({ noServer: true });

      // Handle upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log('✅ WebSocket connection established');

        let streamSid = null;
        let callSid = request.url.split('callSid=')[1]?.split('&')[0] || 'unknown';

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
                await req.pool.query(`
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
                await finalizeCall(req.pool, userId, callSid, language);
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

          await req.pool.query(`
            UPDATE ai_voice_call_logs
            SET call_status = 'disconnected'
            WHERE call_sid = $1 AND call_status = 'in-progress'
          `, [callSid]);
        });
      });

    } catch (error) {
      console.error('❌ Error setting up media stream:', error);
      socket.destroy();
    }
  });
});

module.exports = router;