const axios = require('axios');

class TwentyService {
    constructor() {
        this.apiUrl = process.env.TWENTY_API_URL || 'https://api.twenty.com'; // Default or Env
        this.apiKey = process.env.TWENTY_API_KEY;
    }

    get headers() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Sync a Lead (Person) to Twenty CRM
     * @param {object} lead { phone, name, email, userId }
     * @returns {string|null} Twenty Person ID
     */
    async syncPerson(lead) {
        if (!this.apiKey) return null;

        try {
            // 1. Search for existing person by phone
            // Note: Adjust endpoint based on actual Twenty API docs
            const searchRes = await axios.get(`${this.apiUrl}/people`, {
                params: { filter: { phone: { eq: lead.phone } } },
                headers: this.headers
            });

            let personId;
            if (searchRes.data.data && searchRes.data.data.length > 0) {
                personId = searchRes.data.data[0].id;
                // Optional: Update existing person
            } else {
                // 2. Create new person
                const createRes = await axios.post(`${this.apiUrl}/people`, {
                    name: {
                        firstName: lead.name ? lead.name.split(' ')[0] : 'Unknown',
                        lastName: lead.name ? lead.name.split(' ').slice(1).join(' ') : 'Lead'
                    },
                    phones: { primary: lead.phone },
                    emails: lead.email ? { primary: lead.email } : undefined,
                    // Custom field for our internal User ID to track ownership
                    // custom: { external_user_id: lead.userId } 
                }, { headers: this.headers });
                personId = createRes.data.data.id;
            }

            return personId;

        } catch (error) {
            console.error('❌ Twenty Sync Error (Person):', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Create a Call Activity in Twenty CRM
     * @param {object} callLog { callSid, from, to, duration, status, recordingUrl, summary, personId }
     */
    async createCallActivity(callLog) {
        if (!this.apiKey || !callLog.personId) return;

        try {
            await axios.post(`${this.apiUrl}/activities`, {
                type: 'CALL',
                subject: `Outbound Call to ${callLog.to}`,
                body: `Status: ${callLog.status}\nDuration: ${callLog.duration}s\nSummary: ${callLog.summary || 'No summary'}\nRecording: ${callLog.recordingUrl || 'N/A'}`,
                datetime: new Date().toISOString(),
                targetPersonId: callLog.personId,
                direction: 'OUTBOUND'
            }, { headers: this.headers });

            console.log(`✅ Synced Call Activity to Twenty (Person: ${callLog.personId})`);

        } catch (error) {
            console.error('❌ Twenty Sync Error (Activity):', error.response?.data || error.message);
        }
    }
}

module.exports = new TwentyService();
