-- Migration: Add Municipal Roll columns to properties_real
-- This adds support for the complete Municipal Roll data including previous sales (comparables)

-- Add missing columns for full Municipal Roll data
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS owner_name_2 VARCHAR(255);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS mailing_address VARCHAR(500);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS mailing_city VARCHAR(100);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS mailing_state VARCHAR(50);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS mailing_zip VARCHAR(20);

-- Property details
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS lot_size INTEGER;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS stories INTEGER;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS units INTEGER;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS zoning VARCHAR(50);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS land_value DECIMAL(12, 2);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS building_value DECIMAL(12, 2);

-- Sale 2 (Previous sale - for comparables)
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sale_2_date DATE;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sale_2_price DECIMAL(12, 2);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sale_2_type VARCHAR(50);

-- Sale 3 (Older sale - for comparables)
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sale_3_date DATE;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sale_3_price DECIMAL(12, 2);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sale_3_type VARCHAR(50);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_properties_sale_2_date ON properties_real(sale_2_date DESC);
CREATE INDEX IF NOT EXISTS idx_properties_owner_name ON properties_real(owner_name);
CREATE INDEX IF NOT EXISTS idx_properties_address_city ON properties_real(address_city);
CREATE INDEX IF NOT EXISTS idx_properties_address_zip ON properties_real(address_zip);
CREATE INDEX IF NOT EXISTS idx_properties_year_built ON properties_real(year_built);
CREATE INDEX IF NOT EXISTS idx_properties_appraised_value ON properties_real(appraised_value);

-- Comment describing the table
COMMENT ON TABLE properties_real IS 'Real property data from Miami-Dade Municipal Roll - contains addresses, owners, and last 3 sales for all properties';
