# Admin UI Requirements Specification

**Purpose:** This document tracks the frontend requirements for the "User Admin Section" to ensure it correctly interfaces with the backend features we are building.

## 1. Voice AI Persona Editor
**Goal:** Allow subscribers to customize their AI's personality and knowledge.

### UI Components Needed:
*   **Persona Generator Input:**
    *   `TextArea`: "Describe your ideal AI assistant..." (e.g., "A friendly solar sales rep").
    *   `Button`: "Generate Persona" (Calls `POST /api/admin/generate-persona`).
*   **System Prompt Editor:**
    *   `TextArea`: Displays the generated prompt. Allows manual editing.
    *   *Label:* "System Instructions (The Brain)".
*   **Voice Selection:**
    *   `Dropdown`: Select Voice ID (e.g., "Kore", "Puck", "Fenrir").
    *   *Note:* Backend supports Google Cloud TTS voices.
*   **Save Button:**
    *   Calls `PUT /api/admin/voice-settings`.

### Data Binding:
*   **Load:** `GET /api/admin/voice-settings` -> Populates fields.
*   **Save:** `PUT /api/admin/voice-settings` -> Sends `{ system_prompt, voice_id }`.

## 2. Knowledge Base Manager
**Goal:** Manage the factual data the AI uses (Business hours, services, etc.).

### UI Components Needed:
*   **Company Info Form:**
    *   `Input`: Company Name.
    *   `Input`: Phone Number.
    *   `TextArea`: Business Description / About Us.
*   **Services List:**
    *   `Dynamic List`: Add/Remove services (e.g., "Roof Repair", "Gutter Cleaning").
*   **FAQ Section (Future):**
    *   `List`: Question/Answer pairs.

## 3. Email Campaign Manager (Phase 3)
**Goal:** Create and schedule email campaigns.

### UI Components Needed:
*   **Template Selector:** Choose from System or Custom templates.
*   **Campaign Editor:** Rich Text Editor for email body.
*   **Scheduler:** Date/Time picker for send time.
*   **Analytics Dashboard:** Charts for Opens, Clicks, Bounces.

## 4. General Settings
*   **API Keys:** (Hidden/Managed by System, but maybe visible for advanced users).
*   **Billing/Tokens:** Display current token balance.
