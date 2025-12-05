-- Migration: Marketplace & Onboarding
-- Creates tables for Profiles, Reviews, Projects, and Bids

-- 1. User Profiles (Extends users table)
CREATE TABLE IF NOT EXISTS profiles (
    profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Persona Type
    user_type VARCHAR(50) NOT NULL, -- 'investor', 'provider', 'homeowner'
    
    -- Public Info
    business_name VARCHAR(255),
    bio TEXT,
    website VARCHAR(255),
    phone VARCHAR(50),
    avatar_url TEXT,
    
    -- Provider Specifics
    license_number VARCHAR(100),
    license_verified BOOLEAN DEFAULT false,
    insurance_verified BOOLEAN DEFAULT false,
    years_experience INTEGER,
    service_area_radius_miles INTEGER,
    service_zip_codes TEXT[], -- Array of zip codes
    trades TEXT[], -- Array of trades e.g. ['plumbing', 'roofing']
    
    -- Investor Specifics
    investment_focus TEXT[], -- ['fix_flip', 'buy_hold', 'land']
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- 2. Reviews (For Providers)
CREATE TABLE IF NOT EXISTS reviews (
    review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(user_id) ON DELETE SET NULL, -- Can be null if imported from Google
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    source VARCHAR(50) DEFAULT 'internal', -- 'internal', 'google'
    external_id VARCHAR(255), -- Google Review ID
    author_name VARCHAR(255), -- For external reviews
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Projects (Homeowner Requests)
CREATE TABLE IF NOT EXISTS projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homeowner_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100), -- 'roofing', 'plumbing', etc.
    
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'completed', 'cancelled'
    budget_range VARCHAR(100),
    
    location_address TEXT,
    location_zip VARCHAR(20),
    
    images TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bids (Provider Proposals)
CREATE TABLE IF NOT EXISTS bids (
    bid_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
    
    amount DECIMAL(12, 2),
    proposal_text TEXT NOT NULL,
    estimated_days INTEGER,
    
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_trades ON profiles USING GIN(trades);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_bids_project_id ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_provider_id ON bids(provider_id);
