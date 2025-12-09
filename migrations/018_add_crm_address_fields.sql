-- Migration: Add address and source columns to crm.contacts

ALTER TABLE crm.contacts ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE crm.contacts ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE crm.contacts ADD COLUMN IF NOT EXISTS state VARCHAR(50);
ALTER TABLE crm.contacts ADD COLUMN IF NOT EXISTS zip VARCHAR(20);
ALTER TABLE crm.contacts ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
