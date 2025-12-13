-- Comprehensive migration to add ALL missing columns for Municipal Roll import
-- Run this to ensure all required columns exist

-- Core property details
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS baths DECIMAL(4,2);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS bedrooms INTEGER;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sqft INTEGER;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS stories INTEGER;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS units INTEGER;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS year_built INTEGER;

-- Address fields (ensure zip is consistent)
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS address_zip VARCHAR(20);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS address_state VARCHAR(10) DEFAULT 'FL';

-- Owner fields
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS owner_name_2 VARCHAR(255);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS mailing_address VARCHAR(500);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS mailing_city VARCHAR(100);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS mailing_state VARCHAR(50);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS mailing_zip VARCHAR(20);

-- Property type and zoning
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS property_type VARCHAR(100);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS zoning VARCHAR(50);

-- Lot and land
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS lot_size INTEGER;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS land_value DECIMAL(12,2);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS building_value DECIMAL(12,2);

-- Sale history (for comparables)
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sale_2_date DATE;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sale_2_price DECIMAL(12,2);
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sale_3_date DATE;
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS sale_3_price DECIMAL(12,2);

-- Extra features (pool, etc. - XF columns from Municipal Roll)
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS extra_features TEXT;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties_real(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_baths ON properties_real(baths);
CREATE INDEX IF NOT EXISTS idx_properties_sqft ON properties_real(sqft);
CREATE INDEX IF NOT EXISTS idx_properties_year_built ON properties_real(year_built);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties_real(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_address_city ON properties_real(address_city);
CREATE INDEX IF NOT EXISTS idx_properties_address_zip ON properties_real(address_zip);
CREATE INDEX IF NOT EXISTS idx_properties_sale_2_date ON properties_real(sale_2_date);

-- Verify columns exist
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'properties_real' 
ORDER BY ordinal_position;
