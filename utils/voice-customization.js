/**
 * Voice AI Customization Utilities
 * Handles dynamic content generation for multi-tenant Voice AI
 */

/**
 * Get localized greeting with variable interpolation
 * @param {Object} knowledgeData - Subscriber's knowledge_data from database
 * @param {string} language - Language code ('en' or 'es')
 * @returns {string} Personalized greeting
 */
function getGreeting(knowledgeData, language = 'en') {
  const greetingTemplate = knowledgeData.greetings?.[language]
    || knowledgeData.greetings?.en
    || `Hello! You've reached {company_name}. How can we help you today?`;

  return interpolateVariables(greetingTemplate, knowledgeData);
}

/**
 * Get custom greeting after language selection
 * @param {Object} knowledgeData - Subscriber's knowledge_data from database
 * @param {string} language - Language code ('en' or 'es')
 * @returns {string} Custom greeting
 */
function getCustomGreeting(knowledgeData, language = 'en') {
  const customTemplate = knowledgeData.custom_greetings?.[language]
    || knowledgeData.custom_greetings?.en
    || `Thank you for calling {company_name}. How can we assist you today?`;

  return interpolateVariables(customTemplate, knowledgeData);
}

/**
 * Get qualifying questions for language
 * @param {Object} knowledgeData - Subscriber's knowledge_data from database
 * @param {string} language - Language code ('en' or 'es')
 * @returns {Array<string>} List of qualifying questions
 */
function getQualifyingQuestions(knowledgeData, language = 'en') {
  return knowledgeData.qualifying_questions?.[language]
    || knowledgeData.qualifying_questions?.en
    || [
        "What type of business do you operate?",
        "What services are you interested in?",
        "When would you like to get started?"
      ];
}

/**
 * Get brand voice system instruction
 * @param {Object} knowledgeData - Subscriber's knowledge_data from database
 * @param {string} language - Language code ('en' or 'es')
 * @returns {string} System instruction for Gemini
 */
function getBrandVoicePrompt(knowledgeData, language = 'en') {
  const brandVoice = knowledgeData.brand_voice || 'professional';
  const voicePrompt = knowledgeData.brand_voice_prompts?.[brandVoice]
    || `You are a professional AI assistant for {company_name}.`;

  let basePrompt = interpolateVariables(voicePrompt, knowledgeData);

  // Add qualifying questions to system instruction
  const questions = getQualifyingQuestions(knowledgeData, language);
  basePrompt += `\n\nDuring the conversation, naturally ask these qualifying questions:\n`;
  questions.forEach((q, i) => {
    basePrompt += `${i + 1}. ${q}\n`;
  });

  // Add language-specific instructions
  if (language === 'es') {
    basePrompt += `\n\nIMPORTANT: Conduct the entire conversation in Spanish.`;
  }

  return basePrompt;
}

/**
 * Get language menu prompt
 * @param {Object} knowledgeData - Subscriber's knowledge_data from database
 * @returns {string} Language menu prompt
 */
function getLanguageMenuPrompt(knowledgeData) {
  const menuEn = knowledgeData.language_preferences?.menu_prompt?.en
    || "Press 1 for English or 2 for Spanish.";
  const menuEs = knowledgeData.language_preferences?.menu_prompt?.es
    || "Presiona 1 para inglés o 2 para español.";

  return `${menuEn} ${menuEs}`;
}

/**
 * Interpolate variables in template string
 * @param {string} template - Template with {variable} placeholders
 * @param {Object} data - Data object with variable values
 * @returns {string} Interpolated string
 */
function interpolateVariables(template, data) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key === 'target_industries' && Array.isArray(data.target_industries)) {
      return data.target_industries.join(', ');
    }
    return data[key] || match;
  });
}

module.exports = {
  getGreeting,
  getCustomGreeting,
  getQualifyingQuestions,
  getBrandVoicePrompt,
  getLanguageMenuPrompt,
  interpolateVariables
};