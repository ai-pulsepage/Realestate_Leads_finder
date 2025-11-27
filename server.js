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
    let conversationHistory = [];

    console.log('🎙️ Initializing Google-Native Voice AI Session...');

    // ... (Keep existing setup code) ...
    // Extract query parameters
    const url = require('url');
    const parsedUrl = url.parse(request.url, true);
    const { language = 'en', userId, callSid } = parsedUrl.query;

    let chat;
    try {
      // Fetch subscriber knowledge base AND voice settings
      const knowledgeQuery = await pool.query(
        `SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1`,
        [userId]
      );

      let knowledgeBase = {};
      let systemInstruction = "You are a helpful real estate assistant."; // Default fallback

      if (knowledgeQuery.rows.length > 0) {
        knowledgeBase = knowledgeQuery.rows[0].knowledge_data || {};

        // Check for custom voice settings
        if (knowledgeBase.voice_settings && knowledgeBase.voice_settings.system_prompt) {
          systemInstruction = knowledgeBase.voice_settings.system_prompt;
          console.log('🎭 Using Custom Persona:', systemInstruction.substring(0, 50) + '...');
        }
      }

      // Initialize Gemini Chat with Dynamic Instruction
      chat = model.startChat({
        systemInstruction: systemInstruction,
      });
      console.log('✅ Gemini Chat Session Started');

    } catch (error) {
      console.error('❌ Error initializing chat session:', error);
      ws.close();
      return;
    }

    // Helper: Start STT Stream
    let transcriptBuffer = '';
    let silenceTimer = null;

    function startRecognitionStream() {
      recognizeStream = speechClient
        .streamingRecognize({
          config: {
            encoding: 'MULAW',
            sampleRateHertz: 8000,
            languageCode: 'en-US',
            model: 'phone_call',
            useEnhanced: true,
          },
          interimResults: false, // We only want final results for now
        })
        .on('error', console.error)
        .on('data', async (data) => {
          if (data.results[0] && data.results[0].alternatives[0]) {
            const transcript = data.results[0].alternatives[0].transcript;

            // ECHO CANCELLATION: Ignore input if AI is speaking
            if (isSpeaking) {
              console.log('🙊 Ignoring input (AI is speaking)');
              return;
            }

            console.log(`👂 Partial Heard: "${transcript}"`);

            // DEBOUNCE / SILENCE DETECTION
            // Buffer the transcript and wait for silence before responding.
            transcriptBuffer += ' ' + transcript;

            if (silenceTimer) clearTimeout(silenceTimer);

            silenceTimer = setTimeout(async () => {
              const finalTranscript = transcriptBuffer.trim();
              if (!finalTranscript) return;

              console.log(`✅ Final User Input (after silence): "${finalTranscript}"`);
              transcriptBuffer = ''; // Clear buffer

              // Log User Input
              pool.query(`
                  UPDATE ai_voice_call_logs
                  SET call_transcript = COALESCE(call_transcript, '') || '\nCaller: ' || $1
                  WHERE user_id = $2 AND call_transcript LIKE '%' || $3 || '%'
                `, [finalTranscript, userId, callSid]).catch(e => console.error('DB Log Error:', e));

              // Generate AI Response
              try {
                const result = await chat.sendMessage(finalTranscript);
                const responseText = result.response.text();
                await speakResponse(responseText);
              } catch (aiError) {
                console.error('❌ LLM Error:', aiError);
              }
            }, 800); // Wait 800ms for silence
          }
        });
      console.log('👂 STT Stream Started');
    }

    // WebSocket Event Handlers
    let streamSid = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);

        if (data.event === 'start') {
          console.log('✅ Twilio Stream Started');
          streamSid = data.start.streamSid;
          console.log('StreamSid:', streamSid);

          startRecognitionStream();

          // Initial Greeting
          speakResponse("Hello! How can I help you with your real estate needs today?");

        } else if (data.event === 'media') {
          if (recognizeStream && data.media && data.media.payload) {
            // Write audio to STT stream
            recognizeStream.write(data.media.payload);
          }
        } else if (data.event === 'stop') {
          console.log('🛑 Twilio Stream Stopped');
          if (recognizeStream) recognizeStream.end();
        }
      } catch (error) {
        console.error('❌ WebSocket Message Error:', error);
      }
    });

    // Helper: Generate Audio from Text (TTS)
    // Moved inside to access streamSid
    async function speakResponse(text) {
      if (!text) return;
      console.log(`🗣️ Speaking: "${text}"`);
      isSpeaking = true;

      try {
        const requestBody = {
          input: { text: text },
          voice: {
            languageCode: 'en-US',
            name: 'Kore',
            // The API rejected 'model', so it must be 'model_name' (snake_case)
            // This matches the gRPC field 'modelName'.
            model_name: 'gemini-2.5-flash-tts'
          },
          audioConfig: {
            audioEncoding: 'MULAW',
            sampleRateHertz: 8000
          },
        };

        console.log('📝 TTS Request (REST):', JSON.stringify(requestBody, null, 2));

        // Use REST Client
        const response = await ttsRestClient.text.synthesize({
          requestBody: requestBody
        });

        const audioContent = response.data.audioContent;

        if (!audioContent) {
          throw new Error('No audio content returned from TTS');
        }

        console.log(`🎵 TTS Audio generated, size: ${audioContent.length}`);

        // Send to Twilio
        if (streamSid) {
          ws.send(JSON.stringify({
            event: 'media',
            streamSid: streamSid,
            media: {
              payload: audioContent
            }
          }));
        } else {
          console.error('❌ Cannot send audio: StreamSid not yet received');
        }

        // Log to DB
        pool.query(`
          UPDATE ai_voice_call_logs
          SET call_transcript = COALESCE(call_transcript, '') || '\nAI: ' || $1
          WHERE user_id = $2 AND call_transcript LIKE '%' || $3 || '%'
        `, [text, userId, callSid]).catch(e => console.error('DB Log Error:', e));

      } catch (error) {
        console.error('❌ TTS Error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } finally {
        isSpeaking = false;
      }
    }

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
