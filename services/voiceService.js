const { pool } = require('../config/database');

class VoiceService {
  /**
   * Get subscriber details and settings by Twilio phone number
   * @param {string} twilioNumber 
   */
  async getSubscriberByPhone(twilioNumber) {
    const query = `
      SELECT u.user_id, u.email, u.token_balance, u.voice_ai_enabled, u.twilio_phone_number,
             vs.greeting_en, vs.greeting_es, vs.system_prompt, vs.receptionist_config
      FROM users u
      LEFT JOIN voice_settings vs ON u.user_id = vs.user_id
      WHERE u.twilio_phone_number = $1
    `;
    const result = await pool.query(query, [twilioNumber]);
    return result.rows[0];
  }

  /**
   * Log an incoming call (wrapper for logCall)
   * @param {string} user_id 
   * @param {string} call_sid 
   * @param {string} from_number 
   * @param {string} to_number 
   */
  async logIncomingCall(user_id, call_sid, from_number, to_number) {
    return this.logCall({
      user_id,
      call_sid,
      direction: 'inbound',
      from_number,
      to_number,
      status: 'in-progress'
    });
  }

  /**
   * Log a call (Inbound or Outbound)
   * @param {object} callData 
   */
  async logCall(callData) {
    const {
      user_id,
      call_sid,
      direction,
      from_number,
      to_number,
      duration,
      status,
      recording_url,
      transcript,
      summary,
      structured_data
    } = callData;

    const query = `
      INSERT INTO call_logs (
        user_id, twilio_call_sid, direction, from_number, to_number, 
        duration, status, recording_url, transcript, summary, structured_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (twilio_call_sid) 
      DO UPDATE SET
        duration = EXCLUDED.duration,
        status = EXCLUDED.status,
        recording_url = EXCLUDED.recording_url,
        transcript = EXCLUDED.transcript,
        summary = EXCLUDED.summary,
        structured_data = EXCLUDED.structured_data,
        updated_at = NOW()
      RETURNING *
    `;

    const values = [
      user_id, call_sid, direction, from_number, to_number,
      duration || 0, status, recording_url, transcript, summary, structured_data
    ];

    try {
      const result = await pool.query(query, values);
      const log = result.rows[0];

      // Sync to Twenty CRM (Fire & Forget)
      if (log && (status === 'completed' || status === 'no-answer')) {
        this.syncToTwenty(log).catch(err => console.error('Twenty Sync Failed:', err.message));
      }

      return log;
    } catch (err) {
      console.error('Error logging call:', err);
      return null;
    }
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

  /**
   * Sync call data to Twenty CRM
   * @param {object} log 
   */
  async syncToTwenty(log) {
    const twentyService = require('./twentyService');

    // 1. Identify the Lead (Person)
    // For inbound: 'from_number' is the lead. For outbound: 'to_number' is the lead.
    const leadPhone = log.direction === 'inbound' ? log.from_number : log.to_number;

    // We don't have the name here easily unless we look it up, 
    // but twentyService can search by phone.
    // If we have structured_data.name (from AI), use it.
    const leadName = log.structured_data?.name || 'Unknown Lead';
    const leadEmail = log.structured_data?.email;

    const personId = await twentyService.syncPerson({
      phone: leadPhone,
      name: leadName,
      email: leadEmail,
      userId: log.user_id
    });

    if (personId) {
      await twentyService.createCallActivity({
        callSid: log.twilio_call_sid,
        from: log.from_number,
        to: log.to_number,
        duration: log.duration,
        status: log.status,
        recordingUrl: log.recording_url,
        summary: log.summary,
        personId: personId
      });
    }
  }
}

module.exports = new VoiceService();
