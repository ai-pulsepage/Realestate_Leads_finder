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

  // Gemini Live API WebSocket handler for Voice AI conversation processing
  async function handleVoiceAIWebSocket(ws, request, pool) {
    try {
      // Load Gemini Live API and audio conversion
      const { GoogleGenAI } = require('@google/genai');
      const g711 = require('g711');
      const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      console.log('🎙️ Initializing Gemini Live API for voice conversation...');

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

      // Initialize Gemini Live API session
      const systemInstruction = `You are a helpful real estate assistant specializing in converting leads for adjacent businesses. Use this knowledge base context: ${knowledgeBase}

Guidelines:
- Be conversational and friendly
- Keep responses under 100 words
- Focus on qualifying leads and recommending relevant services/products
- Ask targeted questions to understand buyer needs and timeline
- Provide specific, actionable advice for home-related services
- Emphasize urgency and next steps for conversions`;

      const model = "gemini-2.5-flash-native-audio-preview-09-2025";
      const generationConfig = {
        response_modalities: ["AUDIO"],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: "Kore"
            }
          }
        },
        system_instruction: {
          parts: [{
            text: systemInstruction
          }]
        }
      };

      console.log('🎙️ Connecting to Gemini Live session...');
      const session = await client.live.connect({
        model: model,
        generationConfig: generationConfig
      });

      console.log('✅ Gemini Live session connected successfully');

      // Set up Gemini response handlers
      session.onmessage = (message) => {
        try {
          console.log('🎤 Gemini response received');

          // Handle audio response from Gemini
          if (message.data) {
            console.log('🔊 Gemini audio response received, size:', message.data.length);

            // Convert 16-bit PCM back to 8-bit PCM, then to MULAW for Twilio
            const pcm16Buffer = Buffer.from(message.data, 'base64');
            const pcm8Buffer = Buffer.alloc(pcm16Buffer.length / 2);

            for (let i = 0; i < pcm8Buffer.length; i++) {
              const sample = pcm16Buffer.readInt16LE(i * 2) / 256; // Scale down from 16-bit
              pcm8Buffer[i] = Math.max(0, Math.min(255, sample + 128)); // Convert to unsigned 8-bit
            }

            // Convert PCM to MULAW for Twilio
            const mulawAudioData = g711.encode(pcm8Buffer);
            console.log('🔊 Converted to MULAW buffer size:', mulawAudioData.length);

            // Send audio back to Twilio
            ws.send(JSON.stringify({
              event: 'media',
              media: {
                payload: mulawAudioData.toString('base64')
              }
            }));
            console.log('🔊 MULAW audio sent to Twilio successfully');
          }

          // Handle text transcripts (both user input and AI responses)
          if (message.serverContent && message.serverContent.modelTurn) {
            const turn = message.serverContent.modelTurn;
            if (turn.parts && turn.parts[0] && turn.parts[0].text) {
              const transcript = turn.parts[0].text;
              console.log(`🎤 Gemini transcript: "${transcript}"`);

              // Log AI response to database
              pool.query(`
                UPDATE ai_voice_call_logs
                SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
                WHERE call_sid = $2
              `, [`AI: ${transcript}`, callSid]).catch(err =>
                console.error('❌ Error logging AI response:', err)
              );
            }
          }

          // Handle user input transcripts
          if (message.serverContent && message.serverContent.userTurn) {
            const turn = message.serverContent.userTurn;
            if (turn.parts && turn.parts[0] && turn.parts[0].text) {
              const userTranscript = turn.parts[0].text;
              console.log(`🎤 User said: "${userTranscript}"`);

              // Log user input to database
              pool.query(`
                UPDATE ai_voice_call_logs
                SET conversation_transcript = COALESCE(conversation_transcript, '') || $1 || '\n'
                WHERE call_sid = $2
              `, [`Caller: ${userTranscript}`, callSid]).catch(err =>
                console.error('❌ Error logging user input:', err)
              );
            }
          }

        } catch (error) {
          console.error('❌ Error processing Gemini response:', error);
        }
      };

      session.onerror = (error) => {
        console.error('❌ Gemini session error:', error);
      };

      session.onclose = () => {
        console.log('✅ Gemini session closed');
      };

      // Send acknowledgment
      ws.send(JSON.stringify({
        event: 'connected',
        message: 'Voice AI WebSocket connected and ready for conversation'
      }));

      // Handle messages from Twilio
      ws.on('message', async (message) => {
        try {
          console.log('📨 WebSocket message received:', message.toString().substring(0, 200) + '...');
          const data = JSON.parse(message.toString());
          console.log('📨 Parsed WebSocket message:', JSON.stringify(data, null, 2));

          if (data.event === 'start') {
            console.log('🎙️ Audio stream started - Gemini Live API ready');
            ws.send(JSON.stringify({
              event: 'started',
              message: 'Audio stream started successfully'
            }));

          } else if (data.event === 'media') {
            // Receive audio data from Twilio and send to Gemini
            console.log('🎵 Media event received, payload length:', data.media?.payload?.length || 0);
            if (data.media && data.media.payload) {
              try {
                // Convert base64 MULAW audio to buffer
                const mulawBuffer = Buffer.from(data.media.payload, 'base64');
                console.log('🎵 Received MULAW buffer, size:', mulawBuffer.length);

                // Convert MULAW to 16-bit PCM for Gemini (16kHz expected)
                const pcmBuffer = g711.decode(mulawBuffer);
                // Convert 8-bit PCM to 16-bit PCM (Twilio sends 8-bit, Gemini expects 16-bit)
                const pcm16Buffer = Buffer.alloc(pcmBuffer.length * 2);
                for (let i = 0; i < pcmBuffer.length; i++) {
                  const sample = pcmBuffer[i] - 128; // Convert unsigned 8-bit to signed
                  pcm16Buffer.writeInt16LE(sample * 256, i * 2); // Scale to 16-bit
                }
                console.log('🎵 Converted to 16-bit PCM buffer, size:', pcm16Buffer.length);

                // Send audio to Gemini Live API
                session.sendRealtimeInput({
                  audio: {
                    data: pcm16Buffer.toString('base64'),
                    mimeType: "audio/pcm;rate=16000"
                  }
                });
                console.log('🎵 Audio sent to Gemini Live API');

              } catch (geminiError) {
                console.error('❌ Gemini processing error:', geminiError);
              }
            } else {
              console.log('🎵 Media event ignored - missing payload');
            }

          } else if (data.event === 'stop') {
            console.log('🎙️ Audio stream stopped');
            // Close Gemini session
            try {
              session.close();
              console.log('✅ Gemini session closed');
            } catch (error) {
              console.error('❌ Error closing Gemini session:', error);
            }
          }

        } catch (error) {
          console.error('❌ WebSocket message processing error:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 WebSocket closed');
        // Clean up Gemini session
        try {
          if (session) {
            session.close();
          }
        } catch (error) {
          console.error('❌ Error closing Gemini session:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        // Clean up Gemini session
        try {
          if (session) {
            session.close();
          }
        } catch (cleanupError) {
          console.error('❌ Error closing Gemini session on WebSocket error:', cleanupError);
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
