-- Migration: Create Projects and Bids tables

-- Projects Table: Requests from Homeowners
CREATE TABLE projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    homeowner_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g., Roofing, Plumbing
    location_zip VARCHAR(20),
    budget_range VARCHAR(100), -- e.g. "$500-$1000" or simple text for flexibility
    status VARCHAR(50) DEFAULT 'open', -- open, in_progress, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bids Table: Proposals from Providers
CREATE TABLE bids (
    bid_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    amount DECIMAL(12, 2),
    proposal_text TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookup
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_bids_project ON bids(project_id);
CREATE INDEX idx_bids_provider ON bids(provider_id);
