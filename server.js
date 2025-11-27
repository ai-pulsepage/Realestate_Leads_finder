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

  // Gemini Live API WebSocket handler for Voice AI conversation processing
  async function handleVoiceAIWebSocket(ws, request, pool) {
    let session = null; // Declare session in outer scope for cleanup handlers

    try {
      // Load Gemini Live API and audio conversion
      const { GoogleGenAI, Modality } = require('@google/genai');
      const g711 = require('g711');
      const client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { apiVersion: 'v1alpha' }
      });

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

      const model = "gemini-2.0-flash-live-001";
      const config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Kore"
            }
          }
        },
        systemInstruction: systemInstruction
      };

      console.log('🎙️ Connecting to Gemini Live session...');
      try {
        session = await client.live.connect({
          model: model,
          config: config,
          callbacks: {
            onopen: () => {
              console.log('✅ Gemini Live session connected successfully');
            },
            onmessage: (message) => {
        try {
          console.log('🎤 Gemini response received, type:', message.type || 'unknown');

          // Log message structure for debugging
          if (message.serverContent) {
            console.log('📝 Server content received:', JSON.stringify(message.serverContent, null, 2));
          }
          if (message.clientContent) {
            console.log('📝 Client content received:', JSON.stringify(message.clientContent, null, 2));
          }

          // Handle audio response from Gemini
          if (message.data) {
            console.log('🔊 Gemini audio response received, size:', message.data.length);

            // Convert 16-bit PCM (24kHz) to 8kHz PCM, then to MULAW for Twilio
            // message.data is raw binary PCM data from Gemini (24kHz, 16-bit)
            const pcm24kBuffer = Buffer.from(message.data);

            // Simple downsampling: 24kHz -> 8kHz (take every 3rd sample)
            const pcm8kBuffer = Buffer.alloc(Math.floor(pcm24kBuffer.length / 6) * 2); // 16-bit samples
            for (let i = 0, j = 0; i < pcm24kBuffer.length - 2; i += 6, j += 2) {
              // Take every 3rd 16-bit sample (24kHz / 3 = 8kHz)
              pcm8kBuffer[j] = pcm24kBuffer[i];
              pcm8kBuffer[j + 1] = pcm24kBuffer[i + 1];
            }

            const mulawAudioData = g711.ulawFromPCM(pcm8kBuffer);
            console.log('🔊 Resampled to 8kHz PCM size:', pcm8kBuffer.length, 'MULAW size:', mulawAudioData.length);

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
                SET call_transcript = COALESCE(call_transcript, '') || '\nAI: ' || $1
                WHERE user_id = $2 AND call_transcript LIKE '%' || $3 || '%'
              `, [transcript, userId, callSid]).catch(err =>
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
                SET call_transcript = COALESCE(call_transcript, '') || '\nCaller: ' || $1
                WHERE user_id = $2 AND call_transcript LIKE '%' || $3 || '%'
              `, [userTranscript, userId, callSid]).catch(err =>
                console.error('❌ Error logging user input:', err)
              );
            }
          }

        } catch (error) {
          console.error('❌ Error processing Gemini response:', error);
        }
      },
            onerror: (error) => {
              console.error('❌ Gemini session error:', error);
            },
            onclose: () => {
              console.log('✅ Gemini session closed');
            }
          }
        });

        console.log('📝 Sending initial context message to Gemini...');
        // Send initial context message to establish conversation
        session.sendClientContent({
          turns: [{
            role: 'user',
            parts: [{ text: 'Hello, I am calling about real estate services. Please respond naturally and help me with my real estate needs.' }]
          }],
          turnComplete: true
        });
        console.log('📝 Initial context message sent to Gemini');

        // Send acknowledgment
        ws.send(JSON.stringify({
          event: 'connected',
          message: 'Voice AI WebSocket connected and ready for conversation'
        }));

      } catch (sessionError) {
        console.error('❌ Failed to connect to Gemini Live session:', sessionError);
        ws.send(JSON.stringify({
          event: 'error',
          message: 'Failed to connect to voice AI service'
        }));
        ws.close();
        return;
      }

      // Handle messages from Twilio
      ws.on('message', async (message) => {
        try {
          console.log('🔍 RAW MESSAGE TYPE:', typeof message);
          console.log('🔍 RAW MESSAGE:', message);

          const data = JSON.parse(message);  // Try without .toString() first
          console.log('✅ PARSED:', data.event);

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

                // Convert MULAW to PCM using g711 (returns Int16Array)
                const pcm8k = g711.ulawToPCM(mulawBuffer); // Returns Int16Array
                console.log('🎵 Converted MULAW to PCM (8kHz), size:', pcm8k.length, 'type:', pcm8k.constructor.name);

                // Send 8kHz PCM directly to Gemini (officially supported)
                const pcm8kBuffer = Buffer.from(pcm8k.buffer);
                console.log('🎵 Sending PCM (8kHz) directly, size:', pcm8kBuffer.length);

                // Encode to base64
                const base64Pcm = pcm8kBuffer.toString('base64');

                // Send to Gemini at 8kHz (Gemini will resample internally)
                if (session) {
                  console.log('🔍 About to call sendRealtimeInput, session exists:', !!session);
                  session.sendRealtimeInput({
                    audio: {
                      data: base64Pcm,
                      mimeType: 'audio/pcm;rate=8000'  // 8kHz sample rate
                    }
                  });
                  console.log('✅ sendRealtimeInput called successfully');
                  console.log('🎵 Audio sent to Gemini Live API (8kHz PCM)');
                } else {
                  console.error('❌ session is null - cannot send audio!');
                }

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
          console.error('❌ PARSE ERROR:', error.message);
          console.error('❌ RAW:', message);
          console.error('❌ TYPE:', typeof message);

          // Try alternate parsing
          try {
            const data = JSON.parse(message.toString());
            console.log('✅ PARSED WITH toString():', data.event);
          } catch (e2) {
            console.error('❌ STILL FAILED:', e2.message);
          }
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
