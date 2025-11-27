# AI Persona Generator & Admin Integration Design

**Version:** 1.0
**Date:** 2025-11-27
**Objective:** Enable subscribers to easily create and manage their Voice AI's "Foundational Personality" via an Admin Interface, assisted by an AI Generator.

---

## 1. The Core Concept

We are moving from a **Hardcoded Real Estate Persona** to a **Dynamic Subscriber-Defined Persona**.

**The Challenge:** Users (subscribers) are not Prompt Engineers. If they write "Be a solar salesman", the AI might be mediocre.
**The Solution:** An **"AI Persona Generator"**. The user describes their business/goal in plain English, and our "Meta-AI" generates a highly optimized, structured System Prompt that the Voice AI uses.

---

## 2. Data Flow Architecture

### A. The Database (`subscriber_knowledge_base`)
We will extend the `knowledge_data` JSONB column to include a dedicated `voice_settings` object.

```json
{
  "company_name": "Sunny Solar",
  "voice_settings": {
    "system_prompt": "You are Alex, a knowledgeable solar energy consultant...", // THE GENERATED PROMPT
    "user_goal_input": "I want a friendly but persistent solar sales rep who focuses on tax savings.", // ORIGINAL USER INPUT
    "voice_id": "Kore", // or "Puck", etc.
    "language": "en-US",
    "safety_settings": "medium"
  }
}
```

### B. The "AI Generator" Workflow (Backend)

1.  **User Input (Admin UI):**
    *   "I run a pool cleaning business. I want the AI to be polite, book appointments, and ask about pool size."
2.  **API Call:** `POST /api/admin/generate-persona`
3.  **The "Meta-Prompt" (Hidden from User):**
    *   We send the user's input to Gemini Flash with a special instruction:
    *   *"You are an expert Prompt Engineer for Voice AI. Convert the following user description into a concise, high-performance System Prompt optimized for speech (short sentences, no markdown, conversational). Structure it with: Role, Objective, Tone, and Guardrails."*
4.  **Output:**
    *   Gemini returns the optimized System Prompt.
5.  **Review:**
    *   The Admin UI shows this generated prompt to the user. They can edit it or click "Save".

---

## 3. Admin UI Wireframe (Conceptual)

**Page:** `Settings > Voice AI Persona`

**Section 1: The "Magic" Generator**
*   [ Text Area ] "Describe your perfect AI employee..."
    *   *Placeholder: "e.g., A friendly receptionist for a dental office who prioritizes emergencies..."*
*   [ Button ] "✨ Generate Persona"

**Section 2: Advanced Editor (The Result)**
*   [ Text Area ] **System Prompt** (Auto-filled by Generator, but editable)
    *   *Content: "You are Sarah, the front desk coordinator for [Company]. Your goal is to..."*
*   [ Dropdown ] **Voice Selection** (Kore, Puck, etc.)
*   [ Button ] "Save Changes"

---

## 4. Implementation Steps

### Phase 1: Backend API (The "Brain")
1.  **Route:** `POST /api/admin/generate-persona`
    *   Input: `description` (string)
    *   Action: Calls Gemini with the "Meta-Prompt".
    *   Output: `generated_prompt` (string)
2.  **Route:** `GET /api/admin/voice-settings`
    *   Action: Fetch `voice_settings` from DB.
3.  **Route:** `PUT /api/admin/voice-settings`
    *   Action: Save the final `system_prompt` to DB.

### Phase 2: Wiring `server.js` (The "Voice")
1.  **Load:** In `handleVoiceAIWebSocket`, fetch `knowledge_data.voice_settings.system_prompt`.
2.  **Fallback:** If null, use the default Real Estate prompt.
3.  **Inject:** Pass this dynamic prompt to `model.startChat({ systemInstruction: ... })`.

---

## 5. Security & Safety
*   **Guardrails:** The "Meta-Prompt" will include instructions to reject harmful or illegal persona requests.
*   **User Override:** The user always has final edit rights before saving, ensuring they are responsible for the final output.
