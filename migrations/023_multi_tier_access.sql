-- Migration: Add multi-tier access support
-- Allow users to have access to multiple SaaS tiers (investor, provider, admin)

-- Add accessible_tiers column to track which tiers a user can access
ALTER TABLE users ADD COLUMN IF NOT EXISTS accessible_tiers TEXT[] DEFAULT ARRAY['investor'];

-- Update existing users based on their current subscription_tier
UPDATE users SET accessible_tiers = ARRAY[subscription_tier] WHERE accessible_tiers IS NULL OR accessible_tiers = '{}';

-- Update admin users to have access to all tiers
UPDATE users SET accessible_tiers = ARRAY['admin', 'investor', 'provider'] WHERE role = 'admin';

-- Add active_tier column to track which tier they're currently viewing
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_tier VARCHAR(20);

-- Set active_tier to subscription_tier by default
UPDATE users SET active_tier = subscription_tier WHERE active_tier IS NULL;
