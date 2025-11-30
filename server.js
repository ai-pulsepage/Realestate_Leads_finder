require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

console.log('=== SERVER STARTUP ===');
console.log('Node:', process.version);
console.log('PORT:', process.env.PORT);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('DATABASE_URL set:', process.env.DATABASE_URL ? 'Yes' : 'No');

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});

try {
  console.log('Loading express...');
  const express = require('express');
  console.log('✓ Express loaded');

  console.log('Loading WebSocket...');
  const WebSocket = require('ws');
  const url = require('url');
  console.log('✓ WebSocket loaded');

  console.log('Loading database config...');
  const { pool, checkDatabase } = require('./config/database');
  console.log('✓ Database config loaded');

  const app = express();

  // Enable CORS
  const cors = require('cors');
  app.use(cors());
  console.log('✓ CORS enabled');

  // Capture raw body for Stripe webhooks
  app.use(express.json({
    verify: (req, res, buf) => {
      if (req.originalUrl.startsWith('/api/stripe/webhook')) {
        req.rawBody = buf.toString();
      }
    }
  }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Real Estate Leads API', version: '1.0.0' });
  });

  // ... (Health check remains same)

  console.log('Loading routes...');

  // Auth Routes (Public)
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', checkDatabase, authRoutes);
  console.log('  ✓ Auth');

  // Middleware
  const { authenticateToken } = require('./middleware/auth');

  // Token Pricing Routes (New)
  const tokenPricingRoutes = require('./routes/token-pricing');
  app.use('/api/token-pricing', checkDatabase, authenticateToken, tokenPricingRoutes);
  console.log('  ✓ Token Pricing');

  console.log('  Loading properties...');
  const propertiesRoutes = require('./routes/properties');
  console.log('  ✓ Properties');

  console.log('  Loading users...');
  const usersRoutes = require('./routes/users');
  console.log('  ✓ Users');

  console.log('  Loading stripe...');
  const stripeRoutes = require('./routes/stripe');
  console.log('  ✓ Stripe');

  console.log('  Loading profiles...');
  const profilesRoutes = require('./routes/profiles');
  console.log('  ✓ Profiles');

  console.log('  Loading ai...');
  const aiRoutes = require('./routes/ai');
  console.log('  ✓ AI');

  console.log('  Loading admin...');
  const adminRoutes = require('./routes/admin');
  const savedLeadsRoutes = require('./routes/saved-leads');
  console.log('  ✓ Admin');

  console.log('  Loading voice-ai...');
  const voiceAiRoutes = require('./routes/voice-ai');
  console.log('  ✓ Voice AI');

  console.log('  Loading appointments...');
  const appointmentsRoutes = require('./routes/appointments');
  console.log('  ✓ Appointments');

  console.log('  Loading email-templates...');
  const emailTemplatesRoutes = require('./routes/email-templates');
  console.log('  ✓ Email Templates');

  console.log('  Loading email-campaigns...');
  const emailCampaignsRoutes = require('./routes/email-campaigns');
  console.log('  ✓ Email Campaigns');

  console.log('  Loading admin-ai...');
  const adminAiRoutes = require('./routes/admin-ai'); // [AI PERSONA GENERATOR]
  console.log('  ✓ Admin AI');

  console.log('Mounting routes...');
  // Public Routes
  app.use('/api/voice-ai', checkDatabase, voiceAiRoutes); // Voice AI must be public for Twilio

  // Protected Routes (Require Auth)
  app.use('/api/properties', checkDatabase, authenticateToken, propertiesRoutes);
  app.use('/api/users', checkDatabase, authenticateToken, usersRoutes);
  app.use('/api/stripe', checkDatabase, authenticateToken, stripeRoutes);
  app.use('/api/profiles', checkDatabase, authenticateToken, profilesRoutes);
  app.use('/api/ai', checkDatabase, authenticateToken, aiRoutes);
  app.use('/api/admin', checkDatabase, authenticateToken, adminRoutes);
  app.use('/api/saved-leads', checkDatabase, authenticateToken, savedLeadsRoutes);
  app.use('/api/appointments', checkDatabase, authenticateToken, appointmentsRoutes);
  app.use('/api/email-templates', checkDatabase, authenticateToken, emailTemplatesRoutes);
  app.use('/api/email-campaigns', checkDatabase, authenticateToken, emailCampaignsRoutes);
  app.use('/api/admin-ai', checkDatabase, authenticateToken, adminAiRoutes);
  app.use('/api/token-pricing', checkDatabase, authenticateToken, tokenPricingRoutes); // [NEW]
  console.log('✓ Routes mounted');

  app.use((err, req, res, next) => {
    console.error('ERROR:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const PORT = process.env.PORT || 8080;
  console.log('Starting server on port', PORT);

  // TEMPORARY: Migration endpoints (remove after use)
  app.post('/admin/run-migration-006', async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, 'migrations', '006_extend_knowledge_data.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);

      for (const stmt of statements) {
        if (stmt.trim()) {
          await pool.query(stmt);
        }
      }

      res.json({ success: true, message: 'Migration 006 completed' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/admin/run-migration-007', async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, 'migrations', '007_add_language_to_call_logs.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      await pool.query(migrationSQL);

      res.json({ success: true, message: 'Migration 007 completed' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/admin/run-migration-008', async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, 'migrations', '008_fix_ai_voice_call_logs_schema.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      await pool.query(migrationSQL);

      res.json({ success: true, message: 'Migration 008 completed' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ===============================================
  // WEBSOCKET SERVER SETUP
  // ===============================================

  const wss = new WebSocket.Server({ noServer: true });

  // Initialize Clients (Global Scope to fail fast)
  const speech = require('@google-cloud/speech');
  // const tts = require('@google-cloud/text-to-speech').v1beta1; // gRPC client (Removed)
  const { google } = require('googleapis'); // REST client
  const { GoogleGenerativeAI } = require('@google/generative-ai');

  let speechClient, ttsRestClient, genAI, model, authClient;
  try {
    speechClient = new speech.SpeechClient();
    console.log('✅ Google Speech Client initialized');

    // Initialize REST TTS Client
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    authClient = auth;
    ttsRestClient = google.texttospeech({ version: 'v1beta1', auth: authClient });
    console.log('✅ Google TTS REST Client (v1beta1) initialized');

    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log('✅ Gemini LLM Client initialized');
  } catch (err) {
    console.error('❌ FATAL: Failed to initialize Google Clients:', err);
  }

  // Helper: Clean Text for TTS
  function cleanText(text) {
    return text ? text.replace(/[*#]/g, '').trim() : '';
  }

  async function handleVoiceAIWebSocket(ws, request, pool) {
    let recognizeStream = null;
    let isSpeaking = false;
    let streamSid = null;
    let callSid = null;
    let userId = null;
    let chat = null;
    let transcriptBuffer = '';
    let silenceTimer = null;

    // Helper: Start STT Stream
    function startRecognitionStream(languageCode = 'en-US') {
      if (recognizeStream) return;

      console.log(`👂 Starting STT Stream (${languageCode})`);
      recognizeStream = speechClient
        .streamingRecognize({
          config: {
            encoding: 'MULAW',
            sampleRateHertz: 8000,
            languageCode: languageCode,
            model: 'phone_call',
            useEnhanced: true,
          },
          interimResults: true,
        })
        .on('error', console.error)
        .on('data', async (data) => {
          if (data.results[0] && data.results[0].alternatives[0]) {
            const transcript = data.results[0].alternatives[0].transcript;

            console.log(`🗣️ User: ${transcript}`);

            // Debounce
            transcriptBuffer += ' ' + transcript;

            if (silenceTimer) clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
              const finalMessage = transcriptBuffer.trim();
              transcriptBuffer = '';
              if (finalMessage) {
                processUserMessage(finalMessage);
              }
            }, 800);
          }
        });
    }

    // Helper: Speak Response
    async function speakResponse(text) {
      if (!text) return;
      const cleanedText = cleanText(text);
      console.log(`🤖 AI: ${cleanedText}`);

      // Log AI Response
      pool.query(`
            UPDATE ai_voice_call_logs
            SET call_transcript = COALESCE(call_transcript, '') || '\nAI: ' || $1
            WHERE user_id = $2 AND call_transcript LIKE '%' || $3 || '%'
        `, [text, userId, callSid]).catch(e => console.error('DB Log Error:', e));

      try {
        isSpeaking = true;

        // FIX: Use correct googleapis method structure
        const request = {
          input: { text: cleanedText },
          voice: { languageCode: 'en-US', name: 'en-US-Journey-F' },
          audioConfig: { audioEncoding: 'MULAW', sampleRateHertz: 8000 }
        };

        const response = await ttsRestClient.text.synthesize({ requestBody: request });
        const audioPayload = response.data.audioContent;

        const mediaMessage = {
          event: 'media',
          streamSid: streamSid,
          media: { payload: audioPayload },
        };
        ws.send(JSON.stringify(mediaMessage));

        const markMessage = {
          event: 'mark',
          streamSid: streamSid,
          mark: { name: 'response_end' }
        };
        ws.send(JSON.stringify(markMessage));

      } catch (error) {
        console.error('❌ TTS Error:', error);
        isSpeaking = false;
      }
    }

    async function processUserMessage(userMessage) {
      if (!chat) return;
      try {
        const result = await chat.sendMessage(userMessage);
        const response = result.response;
        const text = response.text();
        await speakResponse(text);
      } catch (error) {
        console.error('❌ LLM Error:', error);
        await speakResponse("I'm sorry, I'm having trouble connecting. Could you repeat that?");
      }
    }

    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message);

        switch (msg.event) {
          case 'start':
            console.log('🏁 Stream Started');
            streamSid = msg.start.streamSid;
            callSid = msg.start.callSid;

            const customParams = msg.start.customParameters;
            userId = customParams.userId;
            const rawLanguage = customParams.language || 'en';
            const language = rawLanguage.split('-')[0];

            // Use passed parameters (Efficiency & Consistency)
            const passedSystemPrompt = customParams.systemPrompt;
            const passedGreeting = customParams.initialGreeting;
            let receptionistConfig = {};
            try {
              receptionistConfig = JSON.parse(customParams.receptionistConfig || '{}');
            } catch (e) {
              console.error('Error parsing receptionistConfig:', e);
            }

            console.log(`📞 Call Started. StreamSid: ${streamSid}, UserID: ${userId}, Language: ${language}`);

            try {
              let systemInstruction = passedSystemPrompt || "You are a helpful real estate assistant.";

              // Append Receptionist Rules to System Prompt
              let rules = "\n\n[RECEPTIONIST RULES]";
              if (receptionistConfig.ask_email) {
                rules += "\n- You MUST politely ask for the caller's email address if they show interest.";
              }
              if (receptionistConfig.calendar_link) {
                rules += `\n- If the user wants to book an appointment, offer to send them this link: ${receptionistConfig.calendar_link}`;
              }
              if (receptionistConfig.sms_followup) {
                rules += "\n- Inform the user you will send them a text summary after the call.";
              }

              systemInstruction += rules;
              systemInstruction += "\n\nIMPORTANT: If the user speaks Spanish, you MUST reply in Spanish. Otherwise, reply in English.";

              let greeting = passedGreeting;
              if (!greeting) {
                greeting = language === 'es'
                  ? "Hola, ¿cómo puedo ayudarle con sus necesidades inmobiliarias hoy?"
                  : "Hello! How can I help you with your real estate needs today?";
              }

              const dynamicModel = genAI.getGenerativeModel({
                model: "gemini-2.0-flash-001",
                systemInstruction: systemInstruction
              });

              // Fix: Seed History to prevent Double Greeting
              // Gemini requires history to start with 'user' role
              chat = dynamicModel.startChat({
                history: [
                  {
                    role: "user",
                    parts: [{ text: "Start call" }]
                  },
                  {
                    role: "model",
                    parts: [{ text: greeting }]
                  }
                ]
              });
              console.log('✅ Gemini Chat Ready');

              startRecognitionStream(language === 'es' ? 'es-US' : 'en-US');

              // RESTORED: AI Speaks the Greeting
              await speakResponse(greeting);

            } catch (err) {
              console.error('❌ Init Error:', err);
            }
            break;

          case 'media':
            if (recognizeStream && !recognizeStream.destroyed && msg.media.payload) {
              recognizeStream.write(msg.media.payload);
            }
            break;

          case 'mark':
            if (msg.mark.name === 'response_end') {
              isSpeaking = false;
            }
            break;

          case 'stop':
            console.log('🛑 Stream Stopped');
            if (recognizeStream) recognizeStream.end();
            break;
        }
      } catch (error) {
        console.error('❌ WS Message Error:', error);
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket Closed');
      if (recognizeStream) {
        recognizeStream.end();
        recognizeStream = null;
      }
    });
  }

  // Handle WebSocket upgrades
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('✓✓✓ SERVER STARTED ✓✓✓');
  });

  server.on('upgrade', (request, socket, head) => {
    console.log('🔌 UPGRADE REQUEST RECEIVED:', request.url);
    const pathname = url.parse(request.url).pathname;
    console.log('🔌 Parsed Pathname:', pathname);

    if (pathname === '/api/voice-ai/media-stream') {
      console.log('🔌 WebSocket upgrade requested for Voice AI');
      console.log('🔌 Request URL:', request.url);
      console.log('🔌 Request headers:', JSON.stringify(request.headers, null, 2));
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log('🔌 WebSocket connection established successfully');
        handleVoiceAIWebSocket(ws, request, pool);
      });
    } else {
      console.log(`❌ WebSocket upgrade rejected for path: ${pathname}`);
      socket.destroy();
    }
  });

  // Start Call Worker
  const { startWorker } = require('./workers/callWorker');
  startWorker();

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received');
    if (pool) await pool.end();
    process.exit(0);
  });

} catch (err) {
  console.error('FATAL STARTUP ERROR:', err);
  process.exit(1);
}
