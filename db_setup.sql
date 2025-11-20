-- South Florida Property Intelligence SaaS - Database Setup
-- PostgreSQL on Google Cloud SQL

-- Create database
CREATE DATABASE real_estate_services_saas_db;

-- Connect to database
\c real_estate_services_saas_db;

-- Users table
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    subscription_tier VARCHAR(20) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    stripe_customer_id VARCHAR(255),
    token_balance INTEGER DEFAULT 0,
    token_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Subscriber Profiles
CREATE TABLE subscriber_profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    business_name VARCHAR(255),
    business_type VARCHAR(100),
    service_area JSONB,
    target_criteria JSONB,
    brand_voice VARCHAR(50),
    services_offered JSONB DEFAULT '[]',
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties
CREATE TABLE properties (
    property_id SERIAL PRIMARY KEY,
    address VARCHAR(255) NOT NULL,
    zip_code VARCHAR(10),
    county VARCHAR(50) DEFAULT 'Miami-Dade',
    owner_name VARCHAR(255),
    sale_date DATE,
    sale_price DECIMAL(12,2),
    property_type VARCHAR(50),
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    property_details JSONB DEFAULT '{}',
    distressed_score INTEGER DEFAULT 0,
    intent_breakdown JSONB DEFAULT '{}',
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- FSBO Listings
CREATE TABLE fsbo_listings (
    fsbo_id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(property_id),
    listing_url VARCHAR(500),
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    price DECIMAL(12,2),
    description TEXT
);

-- Intent Indicators
CREATE TABLE intent_indicators (
    indicator_id SERIAL PRIMARY KEY,
    intent_type VARCHAR(50) NOT NULL,
    indicator_name VARCHAR(100) NOT NULL,
    weight INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Property-Intent Mapping
CREATE TABLE property_intents (
    property_id INTEGER REFERENCES properties(property_id),
    indicator_id INTEGER REFERENCES intent_indicators(indicator_id),
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(100),
    PRIMARY KEY (property_id, indicator_id)
);

-- Subscriber Scripts
CREATE TABLE subscriber_scripts (
    script_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    script_type VARCHAR(50),
    script_name VARCHAR(255),
    script_content TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

-- Subscriber Knowledge Base
CREATE TABLE subscriber_knowledge_base (
    kb_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    content_type VARCHAR(50),
    title VARCHAR(255),
    content TEXT,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved Leads
CREATE TABLE saved_leads (
    lead_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    property_id INTEGER REFERENCES properties(property_id),
    lead_source VARCHAR(50),
    lead_score INTEGER,
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Saved Searches
CREATE TABLE saved_searches (
    search_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    search_name VARCHAR(255),
    search_criteria JSONB,
    alert_frequency VARCHAR(20),
    last_run_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token Purchases
CREATE TABLE token_purchases (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    tokens INTEGER,
    amount_paid DECIMAL(10,2),
    stripe_payment_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Company Token Pool
CREATE TABLE company_token_pool (
    id SERIAL PRIMARY KEY,
    total_tokens INTEGER DEFAULT 0,
    available_tokens INTEGER DEFAULT 0,
    last_purchase TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation History
CREATE TABLE conversation_history (
    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    message_content TEXT,
    context_used JSONB,
    tokens_used INTEGER,
    cost DECIMAL(5,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Voice Call Logs
CREATE TABLE ai_voice_call_logs (
    call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    lead_id UUID REFERENCES saved_leads(lead_id),
    script_used UUID REFERENCES subscriber_scripts(script_id),
    phone_number VARCHAR(20),
    call_transcript TEXT,
    call_outcome VARCHAR(50),
    duration_seconds INTEGER,
    cost DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Workflow Logs
CREATE TABLE email_workflow_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    lead_id UUID REFERENCES saved_leads(lead_id),
    email_type VARCHAR(50),
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    replied_at TIMESTAMP
);

-- CRM Schema
CREATE SCHEMA crm;

CREATE TABLE crm.contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    property_id INTEGER REFERENCES properties(property_id),
    intent_rating INTEGER,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_properties_zip ON properties(zip_code);
CREATE INDEX idx_properties_score ON properties(distressed_score);
CREATE INDEX idx_properties_location ON properties USING GIST (POINT(longitude, latitude));
CREATE INDEX idx_properties_details ON properties USING GIN (property_details);
CREATE INDEX idx_property_intents_property ON property_intents(property_id);
CREATE INDEX idx_property_intents_indicator ON property_intents(indicator_id);

-- Seed data
INSERT INTO intent_indicators (intent_type, indicator_name, weight, description) VALUES
('distress', 'tax_lien', 30, 'Unpaid property taxes'),
('distress', 'probate', 25, 'Inherited property'),
('distress', 'divorce', 20, 'Forced sale situation'),
('distress', 'bankruptcy', 20, 'Financial distress'),
('distress', 'bank_levy', 15, 'Legal seizure'),
('distress', 'pre_foreclosure', 15, 'Foreclosure filed'),
('distress', 'code_violation', 10, 'Property neglect'),
('distress', 'out_of_state_owner', 5, 'Absentee landlord');

INSERT INTO company_token_pool (total_tokens, available_tokens) VALUES (10000, 10000);