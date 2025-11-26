require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

console.log('=== SERVER STARTUP ===');
console.log('Node:', process.version);
console.log('PORT:', process.env.PORT);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('DATABASE_URL set:', process.env.DATABASE_URL ? 'Yes' : 'No');

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

  // ===============================================
  // WEBSOCKET SERVER SETUP
  // ===============================================

  const wss = new WebSocket.Server({ noServer: true });

  // Full WebSocket handler for Voice AI conversation processing
  async function handleVoiceAIWebSocket(ws, request, pool) {
    try {
      // Load required modules
      const speech = require('@google-cloud/speech');
      const textToSpeech = require('@google-cloud/text-to-speech');
      const { generateChatResponse } = require('./api/togetherAi');

      // Initialize Google Cloud clients
      const speechClient = new speech.SpeechClient();
      const ttsClient = new textToSpeech.TextToSpeechClient();

      // Extract query parameters from WebSocket URL
      const parsedUrl = url.parse(request.url, true);
      const { language = 'en', userId, callSid } = parsedUrl.query;

      console.log('🎙️ VOICE AI WEBSOCKET - Connection Established:');
      console.log('===========================================');
      console.log(`Language: ${language}`);
      console.log(`User ID: ${userId}`);
      console.log(`Call SID: ${callSid}`);
      console.log('===========================================');

      // Load subscriber knowledge base
      let knowledgeBase = '';
      try {
        const kbQuery = await pool.query(
          'SELECT knowledge_data FROM subscriber_knowledge_base WHERE user_id = $1',
          [userId]
        );
        if (kbQuery.rows.length > 0) {
          const kbData = kbQuery.rows[0].knowledge_data || {};
          knowledgeBase = kbData.languages?.[language]?.content ||
                          kbData.content ||
                          'You are a helpful real estate assistant.';
        }
      } catch (error) {
        console.error('❌ Error loading knowledge base:', error);
        knowledgeBase = 'You are a helpful real estate assistant.';
      }

      // Conversation state
      let conversationHistory = [];
      let isListening = false;
      let audioBuffer = Buffer.alloc(0);

      // Configure speech recognition
      const speechConfig = {
        encoding: 'MULAW',
        sampleRateHertz: 8000,
        languageCode: language === 'es' ? 'es-US' : 'en-US',
        enableAutomaticPunctuation: true,
        model: 'phone_call'
      };

      const requestConfig = {
        config: speechConfig,
        interimResults: false
      };

      let recognizeStream = null;

      // Send acknowledgment
      ws.send(JSON.stringify({
        event: 'connected',
        message: 'Voice AI WebSocket connected and ready for conversation'
      }));

      // Handle messages from Twilio
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.event === 'start') {
            console.log('🎙️ Audio stream started');
            ws.send(JSON.stringify({
              event: 'started',
              message: 'Audio stream started successfully'
            }));

            // Start speech recognition
            recognizeStream = speechClient.streamingRecognize(requestConfig)
              .on('error', (error) => {
                console.error('❌ Speech recognition error:', error);
              })
              .on('data', async (data) => {
                if (data.results[0] && data.results[0].alternatives[0]) {
                  const transcript = data.results[0].alternatives[0].transcript;
                  console.log(`🎤 Speech recognized: "${transcript}"`);

                  if (transcript.trim()) {
                    // Log the user input
                    await pool.query(`
                      UPDATE ai_voice_call_logs
                      SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
                      WHERE call_sid = $2
                    `, [`Caller: ${transcript}`, callSid]);

                    // Add to conversation history
                    conversationHistory.push({ role: 'user', content: transcript });

                    // Generate AI response
                    try {
                      const prompt = `You are a helpful real estate assistant. Use this knowledge base context: ${knowledgeBase}

Previous conversation:
${conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current user question: ${transcript}

Provide a helpful, concise response as a real estate assistant. Keep responses under 100 words.`;

                      const aiResponse = await generateChatResponse(prompt, knowledgeBase);
                      console.log(`🤖 AI Response: "${aiResponse}"`);

                      // Add AI response to conversation history
                      conversationHistory.push({ role: 'assistant', content: aiResponse });

                      // Log the AI response
                      await pool.query(`
                        UPDATE ai_voice_call_logs
                        SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
                        WHERE call_sid = $2
                      `, [`AI: ${aiResponse}`, callSid]);

                      // Convert response to speech
                      const ttsRequest = {
                        input: { text: aiResponse },
                        voice: {
                          languageCode: language === 'es' ? 'es-US' : 'en-US',
                          name: language === 'es' ? 'es-US-Neural2-C' : 'en-US-Neural2-D'
                        },
                        audioConfig: {
                          audioEncoding: 'MULAW',
                          sampleRateHertz: 8000
                        }
                      };

                      const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);

                      // Send audio back to Twilio
                      if (ttsResponse.audioContent) {
                        ws.send(JSON.stringify({
                          event: 'media',
                          media: {
                            payload: ttsResponse.audioContent.toString('base64')
                          }
                        }));
                      }

                    } catch (aiError) {
                      console.error('❌ AI processing error:', aiError);
                      // Send fallback response
                      const fallbackText = language === 'es'
                        ? 'Lo siento, hubo un error procesando tu solicitud.'
                        : 'Sorry, there was an error processing your request.';

                      const fallbackRequest = {
                        input: { text: fallbackText },
                        voice: {
                          languageCode: language === 'es' ? 'es-US' : 'en-US',
                          name: language === 'es' ? 'es-US-Neural2-C' : 'en-US-Neural2-D'
                        },
                        audioConfig: {
                          audioEncoding: 'MULAW',
                          sampleRateHertz: 8000
                        }
                      };

                      const [fallbackResponse] = await ttsClient.synthesizeSpeech(fallbackRequest);
                      if (fallbackResponse.audioContent) {
                        ws.send(JSON.stringify({
                          event: 'media',
                          media: {
                            payload: fallbackResponse.audioContent.toString('base64')
                          }
                        }));
                      }
                    }
                  }
                }
              });

          } else if (data.event === 'media') {
            // Receive audio data from Twilio
            if (data.media && data.media.payload && recognizeStream) {
              const audioChunk = Buffer.from(data.media.payload, 'base64');
              recognizeStream.write(audioChunk);
            }

          } else if (data.event === 'stop') {
            console.log('🎙️ Audio stream stopped');
            if (recognizeStream) {
              recognizeStream.end();
            }
          }

        } catch (error) {
          console.error('❌ WebSocket message processing error:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket closed');
        if (recognizeStream) {
          recognizeStream.end();
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        if (recognizeStream) {
          recognizeStream.end();
        }
      });

    } catch (error) {
      console.error('❌ Error in Voice AI WebSocket handler:', error);
      ws.close();
    }
  }

  // Handle WebSocket upgrades
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('✓✓✓ SERVER STARTED ✓✓✓');
  });

  server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/api/voice-ai/media-stream') {
      console.log('🔌 WebSocket upgrade requested for Voice AI');
      wss.handleUpgrade(request, socket, head, (ws) => {
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
