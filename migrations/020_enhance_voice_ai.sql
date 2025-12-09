-- Migration: Add inbound/outbound configurations and Google Calendar integration to voice_settings
-- Add JSONB columns for separate inbound and outbound settings
ALTER TABLE voice_settings
  ADD COLUMN inbound_config JSONB DEFAULT '{}',
  ADD COLUMN outbound_config JSONB DEFAULT '{}';

-- Add columns to store Google OAuth tokens for calendar access
ALTER TABLE voice_settings
  ADD COLUMN google_refresh_token VARCHAR(255),
  ADD COLUMN calendar_connected BOOLEAN DEFAULT FALSE;

-- Optional: create index for faster lookup
CREATE INDEX idx_voice_settings_user_id ON voice_settings(user_id);
