/**
 * GEMINI AI SERVICE
 * Handles intelligent conversation processing using Google Gemini
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini Lazily
const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY is not set. AI features will be disabled.');
    return null;
  }
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

/**
 * Generate intelligent voice response based on conversation context
 * @param {Object} params - Parameters for response generation
 * @param {string} params.userQuery - What the caller said
 * @param {string} params.conversationHistory - Previous conversation
 * @param {Object} params.knowledgeBase - Subscriber's company info
 * @param {string} params.intent - Detected intent (optional)
 * @returns {Promise<string>} - AI-generated response
 */
async function generateVoiceResponse({
  userQuery,
  conversationHistory = '',
  knowledgeBase = {},
  intent = 'general_inquiry'
}) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    // Build context-aware prompt
    const systemPrompt = buildSystemPrompt(knowledgeBase, intent);
    const fullPrompt = `
${systemPrompt}

CONVERSATION HISTORY:
${conversationHistory || 'No previous conversation'}

CALLER'S CURRENT QUESTION:
${userQuery}

INSTRUCTIONS:
- Provide a helpful, professional response as if you're speaking on the phone
- Keep response under 100 words
- Use conversational tone, not formal writing
- If caller asks about properties, pricing, or services, use the knowledge base
- If you need more info, ask a clarifying question
- If caller wants to speak to someone, acknowledge and say you'll connect them

RESPONSE:`;

    const result = await model.generateContent(fullPrompt);
    const response = result.response.text();

    console.log('🤖 Gemini response generated:', {
      userQuery: userQuery.substring(0, 50),
      responseLength: response.length
    });

    return response.trim();

  } catch (error) {
    console.error('❌ Gemini API error:', error);

    // Fallback response
    return "I apologize, but I'm having trouble processing that right now. Would you like me to connect you with someone who can help?";
  }
}

/**
 * Extract structured data from conversation transcript
 * @param {string} transcript - Full conversation text
 * @returns {Promise<Object>} - Extracted data (name, phone, email, intent)
 */
async function extractContactData(transcript) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const prompt = `
Analyze this phone conversation transcript and extract contact information and intent.

TRANSCRIPT:
${transcript}

Extract and return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "contact_name": "Full name or null",
  "contact_phone": "Phone number or null",
  "contact_email": "Email or null",
  "property_interest": "Property address if mentioned or null",
  "intent": "One of: investment, flip, wholesale, rental, homebuyer, seller, general_inquiry",
  "urgency": "One of: urgent, normal, low",
  "notes": "Brief summary of conversation"
}

Rules:
- If name not mentioned, use null
- Format phone as E.164 if possible (+1234567890)
- Only include email if explicitly stated
- Urgency: 'urgent' if they say soon/ASAP, 'low' if browsing, else 'normal'
- Notes should be 1-2 sentences max

JSON:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Clean response (remove markdown code blocks if present)
    let jsonText = responseText;
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const extracted = JSON.parse(jsonText);

    console.log('📊 Extracted contact data:', extracted);

    return extracted;

  } catch (error) {
    console.error('❌ Error extracting contact data:', error);

    return {
      contact_name: null,
      contact_phone: null,
      contact_email: null,
      property_interest: null,
      intent: 'general_inquiry',
      urgency: 'normal',
      notes: 'Error extracting data from transcript'
    };
  }
}

/**
 * Detect if caller wants to speak to a human
 * @param {string} speechText - What caller said
 * @returns {boolean}
 */
function detectTransferRequest(speechText) {
  const transferKeywords = [
    'speak to someone',
    'talk to a person',
    'human',
    'real person',
    'agent',
    'representative',
    'someone who can help',
    'transfer me',
    'connect me'
  ];

  const lowerText = speechText.toLowerCase();
  return transferKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Detect appointment-related intent
 * @param {string} speechText - What caller said
 * @returns {Object} - { wantsAppointment: boolean, appointmentType: string }
 */
function detectAppointmentIntent(speechText) {
  const lowerText = speechText.toLowerCase();

  const appointmentKeywords = {
    viewing: ['see the property', 'view', 'showing', 'tour', 'walk through'],
    consultation: ['consult', 'discuss', 'talk about', 'go over'],
    meeting: ['meet', 'meeting', 'sit down'],
    callback: ['call me back', 'call back', 'return call'],
    general: ['appointment', 'schedule', 'book', 'set up']
  };

  for (const [type, keywords] of Object.entries(appointmentKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return {
        wantsAppointment: true,
        appointmentType: type === 'general' ? 'consultation' : type
      };
    }
  }

  return {
    wantsAppointment: false,
    appointmentType: null
  };
}

/**
 * Build system prompt based on knowledge base
 * @param {Object} knowledgeBase - Subscriber's company info
 * @param {string} intent - Call intent
 * @returns {string}
 */
function buildSystemPrompt(knowledgeBase, intent) {
  const {
    company_name = 'our company',
    services = [],
    business_hours = 'regular business hours',
    specialties = [],
    about = ''
  } = knowledgeBase;

  return `
You are an AI receptionist for ${company_name}.

COMPANY INFORMATION:
${about || 'A real estate services company'}

SERVICES WE OFFER:
${services.length > 0 ? services.join(', ') : 'Real estate investment services'}

SPECIALTIES:
${specialties.length > 0 ? specialties.join(', ') : 'Distressed properties, wholesaling, fix-and-flip'}

BUSINESS HOURS:
${business_hours}

YOUR ROLE:
- Answer questions about our services
- Schedule appointments
- Collect contact information
- Qualify leads (investment intent, budget, timeline)
- Be helpful, professional, and warm
- If caller needs specific info you don't have, offer to connect them with someone

CURRENT CALL INTENT: ${intent}
`;
}

module.exports = {
  generateVoiceResponse,
  extractContactData,
  detectTransferRequest,
  detectAppointmentIntent
};