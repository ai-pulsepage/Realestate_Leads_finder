const queueService = require('../services/queueService');
const axios = require('axios');

const WORKER_INTERVAL_MS = 10000; // 10 seconds

async function startWorker() {
    console.log('👷 Call Worker started...');

    setInterval(async () => {
        try {
            // 1. Get Batch
            const batch = await queueService.getNextBatch(5); // Process 5 calls at a time

            if (batch.length === 0) return; // Idle

            console.log(`👷 Processing batch of ${batch.length} calls`);

            // 2. Process Batch
            for (const item of batch) {
                try {
                    // Trigger Call via API (Loopback)
                    // We use the local API to keep logic centralized in routes/voice-ai.js
                    // But we need the PORT. Assuming 8080.
                    const port = process.env.PORT || 8080;
                    const apiUrl = `http://localhost:${port}/api/voice-ai/outbound-call`;

                    const response = await axios.post(apiUrl, {
                        userId: item.user_id,
                        phoneNumber: item.lead_phone_number,
                        queueId: item.queue_id
                    });

                    // Update Status to 'initiated' (or 'completed' if we consider initiation as done for the queue)
                    // The status callback will handle the final outcome (completed, failed, etc.)
                    // But for the queue, we mark it as 'processing' -> 'initiated'
                    // Actually, let's mark it as 'completed' in terms of "initiation attempt"
                    // The real outcome comes from Twilio callbacks updating the queue item later.
                    // For now, let's just log it.
                    console.log(`✅ Initiated call to ${item.lead_phone_number} (QueueID: ${item.queue_id})`);

                } catch (err) {
                    console.error(`❌ Failed to initiate call for QueueID ${item.queue_id}:`, err.message);
                    await queueService.updateStatus(item.queue_id, 'failed', { outcome: 'initiation_failed' });
                }
            }
        } catch (error) {
            console.error('👷 Worker Error:', error);
        }
    }, WORKER_INTERVAL_MS);
}

module.exports = { startWorker };
