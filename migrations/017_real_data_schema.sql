-- Real Data Schema

-- 1. Properties Table (Enriched)
-- Replaces/Extends the mock properties table
CREATE TABLE IF NOT EXISTS properties_real (
    property_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id VARCHAR(50) UNIQUE NOT NULL,
    
    -- Owner Info
    owner_name VARCHAR(255),
    owner_mailing_address TEXT,
    
    -- Property Address
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(50) DEFAULT 'FL',
    address_zip VARCHAR(20),
    
    -- Valuation & Sales
    appraised_value DECIMAL(12, 2),
    last_sale_date DATE,
    last_sale_price DECIMAL(12, 2),
    
    -- Specs
    year_built INTEGER,
    sqft INTEGER,
    bedrooms INTEGER,
    bathrooms DECIMAL(3, 1),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Legal Status Table (Distress Signals)
CREATE TABLE IF NOT EXISTS property_legal_status (
    status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id VARCHAR(50) REFERENCES properties_real(parcel_id) ON DELETE CASCADE,
    
    lis_pendens_filed BOOLEAN DEFAULT FALSE,
    tax_lien_filed BOOLEAN DEFAULT FALSE,
    foreclosure_status VARCHAR(50), -- 'none', 'pre_foreclosure', 'auction'
    divorce_filing BOOLEAN DEFAULT FALSE,
    bankruptcy_filing BOOLEAN DEFAULT FALSE,
    
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parcel_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_real_zip ON properties_real(address_zip);
CREATE INDEX IF NOT EXISTS idx_properties_real_value ON properties_real(appraised_value);
CREATE INDEX IF NOT EXISTS idx_legal_lis_pendens ON property_legal_status(lis_pendens_filed);
