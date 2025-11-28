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
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'Real Estate Leads API', version: '1.0.0' });
  });

  app.get('/health', async (req, res) => {
    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      database: pool ? 'configured' : 'not configured',
      environment: process.env.NODE_ENV || 'development'
    };
    if (pool) {
      try {
        await pool.query('SELECT 1');
        health.database = 'connected';
      } catch (err) {
        health.database = 'error';
        // Don't change status to unhealthy - app can still serve requests without DB
      }
    }
    res.json(health);
  });

  console.log('Loading routes...');

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
  app.use('/api/properties', checkDatabase, propertiesRoutes);
  app.use('/api/users', checkDatabase, usersRoutes);
  app.use('/api/stripe', checkDatabase, stripeRoutes);
  app.use('/api/profiles', checkDatabase, profilesRoutes);
  app.use('/api/ai', checkDatabase, aiRoutes);
  app.use('/api/admin', checkDatabase, adminRoutes);
  app.use('/api/saved-leads', checkDatabase, savedLeadsRoutes);
  app.use('/api/voice-ai', checkDatabase, voiceAiRoutes);
  app.use('/api/appointments', checkDatabase, appointmentsRoutes);
  app.use('/api/email-templates', checkDatabase, emailTemplatesRoutes);
  app.use('/api/email-campaigns', checkDatabase, emailCampaignsRoutes);
  app.use('/api/admin-ai', checkDatabase, adminAiRoutes); // [AI PERSONA GENERATOR]
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

            if (isSpeaking) {
              // console.log('🙊 Ignoring input (AI is speaking)');
              return;
            }

            if (transcript.trim()) {
              // console.log(`🎤 Partial: "${transcript}"`);
              transcriptBuffer += " " + transcript;

              if (silenceTimer) clearTimeout(silenceTimer);
              silenceTimer = setTimeout(async () => {
                const finalInput = transcriptBuffer.trim();
                if (finalInput) {
                  console.log(`🗣️ User Input: "${finalInput}"`);
                  transcriptBuffer = "";
                  await processUserMessage(finalInput);
                }
              }, 800);
            }
          }
        });
    }

    // Helper: Process User Message
    async function processUserMessage(text) {
      if (!chat) {
        console.warn('⚠️ Chat not initialized yet');
        return;
      }

      // Log User Input
      pool.query(`
            UPDATE ai_voice_call_logs
            SET call_transcript = COALESCE(call_transcript, '') || '\nCaller: ' || $1
            WHERE user_id = $2 AND call_transcript LIKE '%' || $3 || '%'
        `, [text, userId, callSid]).catch(e => console.error('DB Log Error:', e));

      try {
        const result = await chat.sendMessage(text);
        const responseText = result.response.text();
        await speakResponse(responseText);
      } catch (error) {
        console.error('❌ LLM Error:', error);
        await speakResponse("I'm sorry, I'm having trouble connecting. Could you repeat that?");
      }
    }

    // Helper: TTS
    async function speakResponse(text) {
      if (!text) return;
      console.log(`🤖 AI Speaking: "${text}"`);
      isSpeaking = true;

      // Log AI Response
      pool.query(`
            UPDATE ai_voice_call_logs
            SET call_transcript = COALESCE(call_transcript, '') || '\nAI: ' || $1
            WHERE user_id = $2 AND call_transcript LIKE '%' || $3 || '%'
        `, [text, userId, callSid]).catch(e => console.error('DB Log Error:', e));

      try {
        const requestBody = {
          input: { text: text },
          voice: {
            languageCode: 'en-US',
            name: 'Kore', // 'en-US-Studio-O' is also good
            model_name: 'gemini-2.5-flash-tts' // Keeping this as it seemed to work in logs
          },
          audioConfig: {
            audioEncoding: 'MULAW',
            sampleRateHertz: 8000
          },
        };

        const response = await ttsRestClient.text.synthesize({ requestBody });
        const audioContent = response.data.audioContent;

        if (streamSid && audioContent) {
          ws.send(JSON.stringify({
            event: 'media',
            streamSid: streamSid,
            media: { payload: audioContent }
          }));
        }
      } catch (error) {
        console.error('❌ TTS Error:', error);
      } finally {
        // Reset isSpeaking after a delay (approximate duration)
        // For now, we just reset it immediately after sending, 
        // but ideally we wait for the 'mark' event from Twilio.
        // A simple timeout helps prevent self-interruption.
        setTimeout(() => { isSpeaking = false; }, 2000);
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

            const customParams = msg.start.customParameters || {};
            userId = customParams.userId;
            const language = customParams.language || 'en';

            console.log(`👤 UserID: ${userId}, Language: ${language}`);

            // Initialize Gemini
            try {
              const knowledgeQuery = await pool.query(
                `SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1`,
                [userId]
              );

              let systemInstruction = "You are a helpful real estate assistant.";
              let greeting = "Hello! How can I help you with your real estate needs today?"; // Default

              if (knowledgeQuery.rows.length > 0) {
                const kb = knowledgeQuery.rows[0].knowledge_data || {};

                // 1. Load Persona
                if (kb.voice_settings?.system_prompt) {
                  systemInstruction = kb.voice_settings.system_prompt;
                  console.log('🎭 Custom Persona Loaded');
                }

                // 2. Load Greeting based on Language
                if (kb.languages && kb.languages[language] && kb.languages[language].greeting) {
                  greeting = kb.languages[language].greeting;
                  console.log(`🗣️ Custom Greeting Loaded (${language}): "${greeting}"`);
                } else {
                  // Fallback greetings if custom is missing
                  greeting = language === 'es'
                    ? "Hola, ¿cómo puedo ayudarle con sus necesidades inmobiliarias hoy?"
                    : "Hello! How can I help you with your real estate needs today?";
                }
              }

              const dynamicModel = genAI.getGenerativeModel({
                model: "gemini-2.0-flash-001",
                systemInstruction: systemInstruction
              });
              chat = dynamicModel.startChat({});
              console.log('✅ Gemini Chat Ready');

              // Start STT
              startRecognitionStream(language === 'es' ? 'es-US' : 'en-US');

              // Speak the Greeting
              await speakResponse(greeting);

            } catch (err) {
              console.error('❌ Init Error:', err);
            }
            break;

          case 'media':
            if (recognizeStream && msg.media.payload) {
              recognizeStream.write(msg.media.payload);
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
      if (recognizeStream) recognizeStream.end();
    });
  }

  // Handle WebSocket upgrades
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('✓✓✓ SERVER STARTED ✓✓✓');
  });

  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

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

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received');
    if (pool) await pool.end();
    process.exit(0);
  });

} catch (err) {
  console.error('FATAL STARTUP ERROR:', err);
  process.exit(1);
}
