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

const voiceService = require('../services/voiceService');

// ============================================================
// ROUTE 1: Handle Incoming Calls
// Twilio webhook: POST /api/voice-ai/incoming
// ============================================================

router.post('/incoming', checkTokenBalance, async (req, res) => {
  try {
    console.log('📞 Incoming call webhook received:', {
      CallSid: req.body.CallSid,
      From: req.body.From,
      To: req.body.To
    });

    const twiml = new twilio.twiml.VoiceResponse();
    const callSid = req.body.CallSid;
    const callerNumber = req.body.From;
    const twilioNumber = req.body.To;

    // 1. Get Subscriber via Service Layer
    const subscriber = await voiceService.getSubscriberByPhone(twilioNumber);

    if (!subscriber || !subscriber.voice_ai_enabled) {
      twiml.say({ voice: 'Polly.Joanna', language: 'en-US' }, 'This number is not currently configured.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // 2. Check Balance
    if (subscriber.token_balance < 500) {
      twiml.say({ voice: 'Polly.Joanna', language: 'en-US' }, 'Insufficient tokens. Please recharge.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // 3. Log Call via Service Layer
    await voiceService.logIncomingCall(subscriber.user_id, callSid, callerNumber, twilioNumber);

    // 4. Redirect to Menu
    twiml.redirect('/api/voice-ai/language-menu');
    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('❌ Error handling incoming call:', error);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// ============================================================
// ROUTE 2: Language Menu System
// Twilio webhook: POST /api/voice-ai/language-menu
// ============================================================

router.post('/language-menu', async (req, res) => {
  // ... (Keep existing language menu logic, it's generic enough)
  // But let's just quickly rewrite it to be safe and clean
  const twiml = new twilio.twiml.VoiceResponse();
  const gather = twiml.gather({
    numDigits: 1,
    action: '/api/voice-ai/language-selected',
    method: 'POST',
    timeout: 5
  });

  gather.say({ voice: 'Polly.Joanna', language: 'en-US' }, 'For English, press 1.');
  gather.say({ voice: 'Polly.Lupe', language: 'es-US' }, 'Para español, presione 2.');

  twiml.redirect('/api/voice-ai/language-menu');
  res.type('text/xml');
  res.send(twiml.toString());
});

// ============================================================
// ROUTE 3: Language Selection Handler
// Twilio webhook: POST /api/voice-ai/language-selected
// ============================================================

router.post('/language-selected', async (req, res) => {
  console.log('📞 Language selected');
  try {
    const { Digits, To, CallSid } = req.body;
    const language = Digits === '1' ? 'en' : Digits === '2' ? 'es' : 'en';
    const subscriberNumber = To;

    // Look up subscriber and settings
    const subscriberQuery = await req.pool.query(`
      SELECT u.user_id, vs.greeting_en, vs.greeting_es, vs.system_prompt
      FROM users u
      LEFT JOIN voice_settings vs ON u.user_id = vs.user_id
      WHERE u.twilio_phone_number = $1
    `, [subscriberNumber]);

    if (subscriberQuery.rows.length === 0) {
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Configuration error.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const { user_id, greeting_en, greeting_es, system_prompt } = subscriberQuery.rows[0];

    // Update call log
    await req.pool.query(`
       UPDATE call_logs
       SET transcript = transcript || '\nLanguage selected: ' || $1 || ', Status: in-progress'
       WHERE twilio_call_sid = $2
    `, [language, CallSid]);

    // Determine greeting
    let greeting = language === 'en' ? greeting_en : greeting_es;
    if (!greeting) {
      greeting = language === 'en'
        ? 'Welcome. How can I help you today?'
        : 'Bienvenido. ¿Cómo puedo ayudarle hoy?';
    }

    // Connect to WebSocket
    const twiml = new twilio.twiml.VoiceResponse();
    const host = req.get('host');
    const protocol = host.includes('localhost') ? 'ws' : 'wss';

    const connect = twiml.connect();
    const stream = connect.stream({
      url: `${protocol}://${host}/api/voice-ai/media-stream`
    });

    // Pass metadata to WebSocket
    stream.parameter({ name: 'userId', value: user_id });
    stream.parameter({ name: 'language', value: language });
    stream.parameter({ name: 'callSid', value: CallSid });
    stream.parameter({ name: 'systemPrompt', value: system_prompt || '' }); // Pass prompt to stream
    stream.parameter({ name: 'initialGreeting', value: greeting }); // Pass greeting to stream
    
    // Pass receptionist config (serialize to JSON)
    const receptionistConfig = subscriberQuery.rows[0].receptionist_config || {};
    stream.parameter({ name: 'receptionistConfig', value: JSON.stringify(receptionistConfig) });

    console.log(`✅ Connected to WebSocket for user ${user_id}`);
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

/**
 * Simple acknowledgment endpoint for WebSocket media-stream
 * Actual WebSocket handling is now in server.js
 */
router.all('/media-stream', (req, res) => {
  console.log('🎙️ Media stream endpoint accessed - WebSocket upgrade handled by server.js');
  console.log('Request URL:', req.url);
  console.log('Request headers:', JSON.stringify(req.headers, null, 2));

  // Simple acknowledgment - WebSocket upgrade is handled at server level
  res.status(200).send('WebSocket endpoint ready - upgrade handled by server.js');
});

module.exports = router;// Force rebuild Wed Nov 26 02:37:53 AM UTC 2025
