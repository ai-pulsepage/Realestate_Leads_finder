const { pool } = require('../config/database');

class VoiceService {
    /**
     * Get subscriber details and settings by Twilio phone number
     * @param {string} twilioNumber 
     */
    async getSubscriberByPhone(twilioNumber) {
        const query = `
      SELECT u.user_id, u.email, u.token_balance, u.voice_ai_enabled,
             vs.greeting_en, vs.greeting_es, vs.system_prompt, vs.receptionist_config
      FROM users u
      LEFT JOIN voice_settings vs ON u.user_id = vs.user_id
      WHERE u.twilio_phone_number = $1
    `;
        const result = await pool.query(query, [twilioNumber]);
        return result.rows[0];
    }

    /**
     * Log an incoming call
     */
    async logIncomingCall(userId, callSid, fromNumber, toNumber) {
        const query = `
      INSERT INTO call_logs (
        user_id, twilio_call_sid, direction, from_number, to_number, status, transcript
      ) VALUES ($1, $2, 'inbound', $3, $4, 'ringing', $5)
      ON CONFLICT (twilio_call_sid) DO NOTHING
    `;
        const transcript = `Call started. From: ${fromNumber}`;
        await pool.query(query, [userId, callSid, fromNumber, toNumber, transcript]);
    }

    /**
     * Update call log transcript
     */
    async updateTranscript(callSid, text) {
        const query = `
      UPDATE call_logs
      SET transcript = transcript || '\n' || $1
      WHERE twilio_call_sid = $2
    `;
        await pool.query(query, [text, callSid]);
    }
}

module.exports = new VoiceService();
