-- Migration 027: Data Import System
-- Track uploaded files and import jobs for Official Records processing

-- 1. Track uploaded data files
CREATE TABLE IF NOT EXISTS data_import_files (
    file_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    county VARCHAR(50) NOT NULL DEFAULT 'MiamiDade',
    data_type VARCHAR(50) NOT NULL, -- 'records', 'property_appraiser'
    file_subtype VARCHAR(50), -- 'daily', 'monthly'
    gcs_path TEXT,
    file_size_bytes BIGINT,
    uploaded_by UUID REFERENCES users(user_id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT
);

-- 2. Track import jobs
CREATE TABLE IF NOT EXISTS data_import_jobs (
    job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID REFERENCES data_import_files(file_id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_processed INTEGER DEFAULT 0,
    records_imported INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'running', -- running, completed, failed, cancelled
    error_message TEXT,
    log_entries JSONB DEFAULT '[]'
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_import_files_county ON data_import_files(county);
CREATE INDEX IF NOT EXISTS idx_import_files_status ON data_import_files(status);
CREATE INDEX IF NOT EXISTS idx_import_files_uploaded ON data_import_files(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON data_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_file ON data_import_jobs(file_id);

-- 4. Add county column to properties_real for multi-county support
ALTER TABLE properties_real ADD COLUMN IF NOT EXISTS county VARCHAR(50) DEFAULT 'MiamiDade';
CREATE INDEX IF NOT EXISTS idx_properties_county ON properties_real(county);

-- 5. Add last_sale_date index for "New Homeowner Leads" queries
CREATE INDEX IF NOT EXISTS idx_properties_sale_date ON properties_real(last_sale_date DESC);
