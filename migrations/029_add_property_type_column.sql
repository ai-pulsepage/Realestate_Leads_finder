-- Add missing property_type column
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS property_type VARCHAR(100) DEFAULT 'Other';
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties_real(property_type);
