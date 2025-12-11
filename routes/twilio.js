/**
 * Twilio Phone Number Management API
 * Handles searching for available numbers and purchasing them
 * Uses master Twilio account - costs billed to platform owner
 */

const express = require('express');
const router = express.Router();
const twilio = require('twilio');

// Initialize Twilio client with master account credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
let twilioClient = null;

try {
    if (accountSid && authToken) {
        twilioClient = twilio(accountSid, authToken);
    }
} catch (err) {
    console.error('Twilio client initialization failed:', err.message);
}

/**
 * GET /api/twilio/available-numbers
 * Search for available phone numbers in a given area code
 */
router.get('/available-numbers', async (req, res) => {
    try {
        const { areaCode, country = 'US', limit = 10 } = req.query;

        if (!twilioClient) {
            return res.status(503).json({
                error: 'Twilio not configured',
                message: 'Twilio credentials not set up. Contact admin.'
            });
        }

        if (!areaCode) {
            return res.status(400).json({ error: 'Area code is required' });
        }

        // Search for available local numbers
        const numbers = await twilioClient.availablePhoneNumbers(country)
            .local
            .list({
                areaCode: areaCode,
                smsEnabled: true,
                voiceEnabled: true,
                limit: parseInt(limit)
            });

        const formattedNumbers = numbers.map(num => ({
            phoneNumber: num.phoneNumber,
            friendlyName: num.friendlyName,
            locality: num.locality,
            region: num.region,
            capabilities: {
                voice: num.capabilities.voice,
                sms: num.capabilities.SMS,
                mms: num.capabilities.MMS
            },
            // Twilio charges ~$1.15/month for local numbers
            monthlyPrice: 1.15
        }));

        res.json({
            success: true,
            count: formattedNumbers.length,
            numbers: formattedNumbers
        });

    } catch (error) {
        console.error('Error searching numbers:', error);
        res.status(500).json({
            error: 'Failed to search numbers',
            message: error.message
        });
    }
});

/**
 * POST /api/twilio/purchase-number
 * Purchase a phone number and assign it to the user
 */
router.post('/purchase-number', async (req, res) => {
    try {
        const { phoneNumber, userId } = req.body;

        if (!twilioClient) {
            return res.status(503).json({
                error: 'Twilio not configured',
                message: 'Twilio credentials not set up. Contact admin.'
            });
        }

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Get user ID from JWT if not provided
        const targetUserId = userId || req.user?.userId;
        if (!targetUserId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if user already has a number
        const existingCheck = await req.pool.query(
            'SELECT twilio_phone_number FROM users WHERE user_id = $1',
            [targetUserId]
        );

        if (existingCheck.rows[0]?.twilio_phone_number) {
            return res.status(400).json({
                error: 'User already has a number assigned',
                current_number: existingCheck.rows[0].twilio_phone_number
            });
        }

        // Purchase the number from Twilio
        const purchasedNumber = await twilioClient.incomingPhoneNumbers.create({
            phoneNumber: phoneNumber,
            voiceUrl: `${process.env.BASE_URL || 'https://app.bizleadfinders.com'}/api/voice-ai/incoming`,
            voiceMethod: 'POST',
            smsUrl: `${process.env.BASE_URL || 'https://app.bizleadfinders.com'}/api/voice-ai/sms`,
            smsMethod: 'POST',
            friendlyName: `User-${targetUserId.slice(0, 8)}`
        });

        // Update user's profile with the new number
        await req.pool.query(
            'UPDATE users SET twilio_phone_number = $1, voice_ai_enabled = true WHERE user_id = $2',
            [purchasedNumber.phoneNumber, targetUserId]
        );

        res.json({
            success: true,
            message: 'Number purchased and configured successfully',
            number: {
                phoneNumber: purchasedNumber.phoneNumber,
                sid: purchasedNumber.sid,
                friendlyName: purchasedNumber.friendlyName
            }
        });

    } catch (error) {
        console.error('Error purchasing number:', error);

        // Handle specific Twilio errors
        if (error.code === 21422) {
            return res.status(400).json({
                error: 'Number not available',
                message: 'This number is no longer available. Please search again.'
            });
        }

        res.status(500).json({
            error: 'Failed to purchase number',
            message: error.message
        });
    }
});

/**
 * POST /api/twilio/set-number-manual
 * Manually set a phone number (for admin/testing)
 * VERIFIES the number exists in your Twilio account before saving
 */
router.post('/set-number-manual', async (req, res) => {
    try {
        const { phoneNumber, userId, skipVerification } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        const targetUserId = userId || req.user?.userId;
        if (!targetUserId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Format phone number (ensure E.164 format)
        let formattedNumber = phoneNumber.replace(/[^0-9+]/g, '');
        if (!formattedNumber.startsWith('+')) {
            formattedNumber = '+1' + formattedNumber; // Assume US if no country code
        }

        // VERIFY the number exists in your Twilio account (unless skipVerification is true for admins)
        let verified = false;
        let numberSid = null;

        if (twilioClient && !skipVerification) {
            try {
                const existingNumbers = await twilioClient.incomingPhoneNumbers.list({
                    phoneNumber: formattedNumber
                });

                if (existingNumbers.length === 0) {
                    return res.status(400).json({
                        error: 'Number not found in Twilio',
                        message: 'This number does not exist in your Twilio account. Please use the Search feature to purchase a number, or verify you entered the correct number.'
                    });
                }

                verified = true;
                numberSid = existingNumbers[0].sid;

                // Configure webhooks for Voice AI
                await twilioClient.incomingPhoneNumbers(numberSid).update({
                    voiceUrl: `${process.env.BASE_URL || 'https://app.bizleadfinders.com'}/api/voice-ai/incoming`,
                    voiceMethod: 'POST',
                    smsUrl: `${process.env.BASE_URL || 'https://app.bizleadfinders.com'}/api/voice-ai/sms`,
                    smsMethod: 'POST'
                });

            } catch (twilioError) {
                console.error('Twilio verification error:', twilioError);
                return res.status(400).json({
                    error: 'Could not verify number',
                    message: 'Unable to verify this number with Twilio. Check your Twilio credentials and try again.'
                });
            }
        } else if (!twilioClient) {
            return res.status(503).json({
                error: 'Twilio not configured',
                message: 'Twilio credentials not set up. Contact admin.'
            });
        }

        // Update user's profile with the verified number
        await req.pool.query(
            'UPDATE users SET twilio_phone_number = $1, voice_ai_enabled = true WHERE user_id = $2',
            [formattedNumber, targetUserId]
        );

        res.json({
            success: true,
            verified: verified,
            message: verified
                ? 'Phone number verified and configured successfully!'
                : 'Phone number set (verification skipped)',
            phoneNumber: formattedNumber,
            webhooksConfigured: verified
        });

    } catch (error) {
        console.error('Error setting number:', error);
        res.status(500).json({
            error: 'Failed to set number',
            message: error.message
        });
    }
});

/**
 * GET /api/twilio/my-number
 * Get the current user's assigned phone number
 */
router.get('/my-number', async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const result = await req.pool.query(
            'SELECT twilio_phone_number, voice_ai_enabled FROM users WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            phoneNumber: result.rows[0].twilio_phone_number,
            voiceAiEnabled: result.rows[0].voice_ai_enabled
        });

    } catch (error) {
        console.error('Error getting number:', error);
        res.status(500).json({ error: 'Failed to get number' });
    }
});

/**
 * DELETE /api/twilio/release-number
 * Release/remove a user's phone number
 */
router.delete('/release-number', async (req, res) => {
    try {
        const { releaseFromTwilio } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Get current number
        const result = await req.pool.query(
            'SELECT twilio_phone_number FROM users WHERE user_id = $1',
            [userId]
        );

        const currentNumber = result.rows[0]?.twilio_phone_number;

        // Optionally release from Twilio (stops billing)
        if (releaseFromTwilio && currentNumber && twilioClient) {
            try {
                const numbers = await twilioClient.incomingPhoneNumbers.list({
                    phoneNumber: currentNumber
                });
                if (numbers.length > 0) {
                    await twilioClient.incomingPhoneNumbers(numbers[0].sid).remove();
                }
            } catch (releaseError) {
                console.warn('Could not release from Twilio:', releaseError.message);
            }
        }

        // Remove from user profile
        await req.pool.query(
            'UPDATE users SET twilio_phone_number = NULL, voice_ai_enabled = false WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            message: 'Phone number released'
        });

    } catch (error) {
        console.error('Error releasing number:', error);
        res.status(500).json({ error: 'Failed to release number' });
    }
});

module.exports = router;
