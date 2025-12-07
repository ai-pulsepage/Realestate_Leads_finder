-- Waitlist Entries Table
CREATE TABLE IF NOT EXISTS waitlist_entries (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL, -- 'provider', 'investor', 'homeowner'
    consent_given BOOLEAN DEFAULT FALSE, -- Critical for compliance
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    source VARCHAR(50) DEFAULT 'landing_page'
);

-- Index for faster lookups
CREATE INDEX idx_waitlist_email ON waitlist_entries(email);
CREATE INDEX idx_waitlist_role ON waitlist_entries(role);
