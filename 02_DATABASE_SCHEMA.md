# DATABASE SCHEMA SPECIFICATION
## MIAMI-DADE PROPERTY INTELLIGENCE SAAS

**Document Version:** 1.0  
**Database Engine:** PostgreSQL 15  
**Instance Name:** real_estate_services_saas_db  
**Extensions Required:** uuid-ossp, postgis

---

## SCHEMA OVERVIEW

### TABLE GROUPS
1. User Management (users, subscriber_profiles, homeowner_profiles)
2. Property Data (properties, fsbo_listings)
3. Intent Scoring (intent_indicators, property_intents)
4. Subscriber Customization (subscriber_scripts, subscriber_knowledge_base)
5. Lead Management (saved_leads, saved_searches)
6. Token System (token_purchases, company_token_pool, token_usage_logs, token_pricing, token_transactions)
7. AI Interactions (conversation_history, ai_voice_call_logs, email_workflow_logs)
8. Voice Assistant (subscriber_phone_numbers, ai_call_templates, calendar_integrations)
9. Homeowner Jobs (homeowner_jobs, job_bids, contractor_reviews)
10. CRM Integration (crm_contacts)
11. Admin Controls (subscription_plans, token_bundles, ai_cost_config, admin_audit_logs)

---

## INITIALIZATION SCRIPT

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Set timezone
SET timezone = 'America/New_York';
```

---

## 1. USER MANAGEMENT

### users
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  user_type VARCHAR(20) CHECK (user_type IN ('subscriber', 'homeowner', 'admin')) NOT NULL,
  subscription_tier VARCHAR(20) CHECK (subscription_tier IN ('none', 'contractor', 'investor', 'full')),
  subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'trialing')),
  stripe_customer_id VARCHAR(255),
  token_balance INTEGER DEFAULT 0,
  token_preferences JSONB DEFAULT '{"daily_limit": null, "auto_recharge": false, "recharge_threshold": 0, "recharge_amount": 0}',
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_subscription_status ON users(subscription_status) WHERE subscription_status = 'active';
```

### subscriber_profiles
```sql
CREATE TABLE subscriber_profiles (
  profile_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  business_type VARCHAR(100),
  service_area JSONB,
  services_offered JSONB,
  target_criteria JSONB,
  brand_voice VARCHAR(50) DEFAULT 'professional',
  verified BOOLEAN DEFAULT FALSE,
  license_number VARCHAR(100),
  license_type VARCHAR(100),
  license_documents JSONB,
  insurance_documents JSONB,
  bond_documents JSONB,
  portfolio_images JSONB,
  business_logo_url TEXT,
  business_description TEXT,
  website_url TEXT,
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriber_profiles_user_id ON subscriber_profiles(user_id);
CREATE INDEX idx_subscriber_profiles_verified ON subscriber_profiles(verified) WHERE verified = TRUE;
CREATE INDEX idx_subscriber_profiles_business_type ON subscriber_profiles(business_type);
```

### homeowner_profiles
```sql
CREATE TABLE homeowner_profiles (
  profile_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  zip_code VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_homeowner_profiles_user_id ON homeowner_profiles(user_id);
```

---

## 2. PROPERTY DATA

### properties
```sql
CREATE TABLE properties (
  property_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Address
  full_address TEXT NOT NULL,
  street_address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(2) DEFAULT 'FL',
  zip_code VARCHAR(10),
  county VARCHAR(50) DEFAULT 'Miami-Dade',
  location GEOGRAPHY(POINT, 4326),
  
  -- Property Details
  folio_number VARCHAR(50) UNIQUE,
  parcel_id VARCHAR(50),
  property_type VARCHAR(50),
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  square_feet INTEGER,
  lot_size_sqft INTEGER,
  year_built INTEGER,
  pool BOOLEAN DEFAULT FALSE,
  stories INTEGER,
  
  -- Ownership
  owner_name VARCHAR(255),
  owner_first_name VARCHAR(100),
  owner_last_name VARCHAR(100),
  owner_type VARCHAR(50),
  mailing_address TEXT,
  out_of_state_owner BOOLEAN DEFAULT FALSE,
  
  -- Financial
  assessed_value INTEGER,
  market_value INTEGER,
  last_sale_price INTEGER,
  last_sale_date DATE,
  estimated_equity INTEGER,
  mortgage_balance INTEGER,
  
  -- Distressed Indicators
  distressed_score INTEGER DEFAULT 0,
  intent_breakdown JSONB,
  has_tax_lien BOOLEAN DEFAULT FALSE,
  has_code_violation BOOLEAN DEFAULT FALSE,
  is_pre_foreclosure BOOLEAN DEFAULT FALSE,
  is_foreclosure BOOLEAN DEFAULT FALSE,
  is_vacant BOOLEAN DEFAULT FALSE,
  is_probate BOOLEAN DEFAULT FALSE,
  is_divorce BOOLEAN DEFAULT FALSE,
  is_heirship BOOLEAN DEFAULT FALSE,
  
  -- New Homeowner Data
  is_new_homeowner BOOLEAN DEFAULT FALSE,
  sale_date DATE,
  days_since_sale INTEGER,
  new_homeowner_score INTEGER,
  
  -- Contact Info
  phone_number VARCHAR(20),
  email VARCHAR(255),
  enriched_at TIMESTAMP,
  
  -- Meta
  source VARCHAR(50),
  data_quality_score INTEGER,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_properties_zip ON properties(zip_code);
CREATE INDEX idx_properties_county ON properties(county);
CREATE INDEX idx_properties_folio ON properties(folio_number);
CREATE INDEX idx_properties_distressed_score ON properties(distressed_score) WHERE distressed_score > 0;
CREATE INDEX idx_properties_new_homeowner ON properties(is_new_homeowner) WHERE is_new_homeowner = TRUE;
CREATE INDEX idx_properties_location ON properties USING GIST(location);
CREATE INDEX idx_properties_sale_date ON properties(sale_date) WHERE sale_date IS NOT NULL;
CREATE INDEX idx_properties_intent_breakdown ON properties USING GIN(intent_breakdown);
CREATE INDEX idx_properties_property_type ON properties(property_type);
CREATE INDEX idx_properties_pool ON properties(pool) WHERE pool = TRUE;
```

### fsbo_listings
```sql
CREATE TABLE fsbo_listings (
  fsbo_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE,
  listing_url TEXT NOT NULL,
  listing_platform VARCHAR(50),
  listing_price INTEGER,
  listing_description TEXT,
  listing_photos JSONB,
  contact_name VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  days_on_market INTEGER,
  listing_status VARCHAR(20) DEFAULT 'active',
  scraped_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fsbo_listings_property_id ON fsbo_listings(property_id);
CREATE INDEX idx_fsbo_listings_status ON fsbo_listings(listing_status) WHERE listing_status = 'active';
CREATE INDEX idx_fsbo_listings_platform ON fsbo_listings(listing_platform);
```

---

## 3. INTENT SCORING

### intent_indicators
```sql
CREATE TABLE intent_indicators (
  indicator_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intent_type VARCHAR(50),
  indicator_name VARCHAR(100) UNIQUE NOT NULL,
  weight INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed distressed property indicators
INSERT INTO intent_indicators (intent_type, indicator_name, weight, description) VALUES
('distressed_property', 'tax_lien', 30, 'Property has outstanding tax liens'),
('distressed_property', 'pre_foreclosure', 40, 'Property in pre-foreclosure status'),
('distressed_property', 'foreclosure', 50, 'Property in active foreclosure'),
('distressed_property', 'code_violation', 15, 'Property has code violations'),
('distressed_property', 'vacant', 20, 'Property appears vacant'),
('distressed_property', 'probate', 25, 'Property in probate'),
('distressed_property', 'divorce', 20, 'Property involved in divorce'),
('distressed_property', 'out_of_state_owner', 10, 'Owner lives out of state'),
('distressed_property', 'high_equity', 15, 'Property has 50 percent or more equity'),
('distressed_property', 'old_listing', 10, 'Listed over 90 days');

-- Seed new homeowner indicators
INSERT INTO intent_indicators (intent_type, indicator_name, weight, description) VALUES
('new_homeowner', 'days_0_30', 100, 'Purchased within last 30 days'),
('new_homeowner', 'days_31_60', 75, 'Purchased 31-60 days ago'),
('new_homeowner', 'days_61_90', 50, 'Purchased 61-90 days ago'),
('new_homeowner', 'has_pool', 15, 'Property has pool needs service'),
('new_homeowner', 'large_lawn', 10, 'Lot size over 5000 sqft'),
('new_homeowner', 'old_hvac', 20, 'Home built before 2000');

CREATE INDEX idx_intent_indicators_type ON intent_indicators(intent_type);
```

### property_intents
```sql
CREATE TABLE property_intents (
  property_id UUID REFERENCES properties(property_id) ON DELETE CASCADE,
  indicator_id UUID REFERENCES intent_indicators(indicator_id),
  detected_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (property_id, indicator_id)
);

CREATE INDEX idx_property_intents_property_id ON property_intents(property_id);
CREATE INDEX idx_property_intents_indicator_id ON property_intents(indicator_id);
```

---

## 4. SUBSCRIBER CUSTOMIZATION

### subscriber_scripts
```sql
CREATE TABLE subscriber_scripts (
  script_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  script_type VARCHAR(20) CHECK (script_type IN ('cold_call', 'email', 'sms', 'voicemail', 'chat')),
  script_name VARCHAR(255) NOT NULL,
  script_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

CREATE INDEX idx_subscriber_scripts_user_id ON subscriber_scripts(user_id);
CREATE INDEX idx_subscriber_scripts_type ON subscriber_scripts(script_type);
CREATE INDEX idx_subscriber_scripts_active ON subscriber_scripts(is_active) WHERE is_active = TRUE;
```

### subscriber_knowledge_base
```sql
CREATE TABLE subscriber_knowledge_base (
  kb_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  content_type VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  tags JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriber_kb_user_id ON subscriber_knowledge_base(user_id);
CREATE INDEX idx_subscriber_kb_type ON subscriber_knowledge_base(content_type);
CREATE INDEX idx_subscriber_kb_tags ON subscriber_knowledge_base USING GIN(tags);
```

---

## 5. LEAD MANAGEMENT

### saved_leads
```sql
CREATE TABLE saved_leads (
  lead_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(property_id),
  lead_source VARCHAR(50),
  lead_score INTEGER,
  status VARCHAR(50) DEFAULT 'new',
  notes TEXT,
  contact_attempts INTEGER DEFAULT 0,
  last_contact_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_saved_leads_user_id ON saved_leads(user_id);
CREATE INDEX idx_saved_leads_property_id ON saved_leads(property_id);
CREATE INDEX idx_saved_leads_status ON saved_leads(status);
CREATE INDEX idx_saved_leads_created_at ON saved_leads(created_at DESC);
```

### saved_searches
```sql
CREATE TABLE saved_searches (
  search_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  search_name VARCHAR(255),
  search_criteria JSONB NOT NULL,
  alert_frequency VARCHAR(20),
  last_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_alert_frequency ON saved_searches(alert_frequency);
```

---

## 6. TOKEN SYSTEM

### token_pricing
```sql
CREATE TABLE token_pricing (
  action_type VARCHAR(50) PRIMARY KEY,
  tokens_required INTEGER NOT NULL,
  actual_cost_usd DECIMAL(10,6),
  description TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO token_pricing (action_type, tokens_required, actual_cost_usd, description) VALUES
('ai_voice_call_3min', 20, 0.001800, 'Gemini TTS voice call approximately 3 minutes'),
('ai_chat_1k_tokens', 5, 0.000200, 'Together.ai chat per 1K tokens'),
('sms_send', 10, 0.007500, 'Twilio SMS outbound'),
('email_send', 1, 0.000100, 'SendGrid email'),
('contact_enrichment', 50, 0.010000, 'BatchData skip trace');
```

### token_purchases
```sql
CREATE TABLE token_purchases (
  purchase_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  tokens INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  purchased_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_token_purchases_user_id ON token_purchases(user_id);
CREATE INDEX idx_token_purchases_purchased_at ON token_purchases(purchased_at DESC);
```

### company_token_pool
```sql
CREATE TABLE company_token_pool (
  pool_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_tokens INTEGER DEFAULT 0,
  tokens_purchased INTEGER DEFAULT 0,
  tokens_consumed INTEGER DEFAULT 0,
  cost_per_token DECIMAL(10,6),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initialize with single row
INSERT INTO company_token_pool (total_tokens) VALUES (0);
```

### token_usage_logs
```sql
CREATE TABLE token_usage_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  action_type VARCHAR(50),
  tokens_used INTEGER NOT NULL,
  actual_cost DECIMAL(10,6),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_token_usage_logs_user_id ON token_usage_logs(user_id);
CREATE INDEX idx_token_usage_logs_timestamp ON token_usage_logs(timestamp DESC);
CREATE INDEX idx_token_usage_logs_action_type ON token_usage_logs(action_type);
```

### token_transactions
```sql
CREATE TABLE token_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  transaction_type VARCHAR(20),
  tokens_amount INTEGER,
  description TEXT,
  admin_user_id UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX idx_token_transactions_created_at ON token_transactions(created_at DESC);
```

---

## 7. AI INTERACTIONS

### conversation_history
```sql
CREATE TABLE conversation_history (
  conversation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  message_role VARCHAR(20),
  message_content TEXT NOT NULL,
  context_used JSONB,
  tokens_used INTEGER,
  cost DECIMAL(10,6),
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversation_history_user_id ON conversation_history(user_id);
CREATE INDEX idx_conversation_history_timestamp ON conversation_history(timestamp DESC);
```

### ai_voice_call_logs
```sql
CREATE TABLE ai_voice_call_logs (
  call_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  lead_id UUID REFERENCES saved_leads(lead_id),
  call_type VARCHAR(20),
  script_used UUID REFERENCES subscriber_scripts(script_id),
  phone_number VARCHAR(20),
  call_transcript TEXT,
  call_outcome VARCHAR(50),
  duration_seconds INTEGER,
  tokens_used INTEGER,
  cost DECIMAL(10,6),
  twilio_call_sid VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_voice_call_logs_user_id ON ai_voice_call_logs(user_id);
CREATE INDEX idx_ai_voice_call_logs_lead_id ON ai_voice_call_logs(lead_id);
CREATE INDEX idx_ai_voice_call_logs_created_at ON ai_voice_call_logs(created_at DESC);
CREATE INDEX idx_ai_voice_call_logs_outcome ON ai_voice_call_logs(call_outcome);
```

### email_workflow_logs
```sql
CREATE TABLE email_workflow_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  lead_id UUID REFERENCES saved_leads(lead_id),
  email_type VARCHAR(50),
  email_subject VARCHAR(255),
  sent_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  replied_at TIMESTAMP,
  sendgrid_message_id VARCHAR(255)
);

CREATE INDEX idx_email_workflow_logs_user_id ON email_workflow_logs(user_id);
CREATE INDEX idx_email_workflow_logs_lead_id ON email_workflow_logs(lead_id);
CREATE INDEX idx_email_workflow_logs_sent_at ON email_workflow_logs(sent_at DESC);
```

---

## 8. VOICE ASSISTANT

### subscriber_phone_numbers
```sql
CREATE TABLE subscriber_phone_numbers (
  phone_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  twilio_sid VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriber_phone_numbers_user_id ON subscriber_phone_numbers(user_id);
CREATE INDEX idx_subscriber_phone_numbers_active ON subscriber_phone_numbers(is_active) WHERE is_active = TRUE;
```

### ai_call_templates
```sql
CREATE TABLE ai_call_templates (
  template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  template_type VARCHAR(20),
  template_name VARCHAR(255),
  template_content TEXT,
  variables JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_call_templates_user_id ON ai_call_templates(user_id);
CREATE INDEX idx_ai_call_templates_type ON ai_call_templates(template_type);
```

### calendar_integrations
```sql
CREATE TABLE calendar_integrations (
  integration_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id),
  provider VARCHAR(20),
  oauth_refresh_token TEXT,
  calendar_id VARCHAR(255),
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_synced_at TIMESTAMP
);

CREATE INDEX idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX idx_calendar_integrations_provider ON calendar_integrations(provider);
```

---

## 9. HOMEOWNER JOBS

### homeowner_jobs
```sql
CREATE TABLE homeowner_jobs (
  job_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homeowner_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  job_title VARCHAR(255) NOT NULL,
  job_description TEXT NOT NULL,
  service_category VARCHAR(100),
  budget_range VARCHAR(50),
  address TEXT,
  zip_code VARCHAR(10),
  preferred_timeline VARCHAR(50),
  photos JSONB,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_homeowner_jobs_homeowner_id ON homeowner_jobs(homeowner_id);
CREATE INDEX idx_homeowner_jobs_status ON homeowner_jobs(status);
CREATE INDEX idx_homeowner_jobs_service_category ON homeowner_jobs(service_category);
CREATE INDEX idx_homeowner_jobs_created_at ON homeowner_jobs(created_at DESC);
```

### job_bids
```sql
CREATE TABLE job_bids (
  bid_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES homeowner_jobs(job_id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  bid_amount DECIMAL(10,2),
  bid_message TEXT,
  estimated_timeline VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_bids_job_id ON job_bids(job_id);
CREATE INDEX idx_job_bids_contractor_id ON job_bids(contractor_id);
CREATE INDEX idx_job_bids_status ON job_bids(status);
```

### contractor_reviews
```sql
CREATE TABLE contractor_reviews (
  review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contractor_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  homeowner_id UUID REFERENCES users(user_id),
  job_id UUID REFERENCES homeowner_jobs(job_id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  google_place_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contractor_reviews_contractor_id ON contractor_reviews(contractor_id);
CREATE INDEX idx_contractor_reviews_homeowner_id ON contractor_reviews(homeowner_id);
CREATE INDEX idx_contractor_reviews_rating ON contractor_reviews(rating);
```

---

## 10. CRM INTEGRATION

### crm_contacts
```sql
CREATE TABLE crm_contacts (
  contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(property_id),
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  intent_rating INTEGER,
  pipeline_stage VARCHAR(50),
  notes TEXT,
  twenty_contact_id VARCHAR(255),
  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_crm_contacts_user_id ON crm_contacts(user_id);
CREATE INDEX idx_crm_contacts_property_id ON crm_contacts(property_id);
CREATE INDEX idx_crm_contacts_pipeline_stage ON crm_contacts(pipeline_stage);
CREATE INDEX idx_crm_contacts_twenty_id ON crm_contacts(twenty_contact_id);
```

---

## 11. ADMIN CONTROLS

### subscription_plans
```sql
CREATE TABLE subscription_plans (
  plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_name VARCHAR(50) UNIQUE NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL,
  yearly_price DECIMAL(10,2),
  base_tokens_monthly INTEGER DEFAULT 10000,
  features JSONB,
  stripe_price_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO subscription_plans (plan_name, monthly_price, yearly_price, base_tokens_monthly, features) VALUES
('contractor', 49.00, 490.00, 10000, '{"new_homeowner_leads": true, "distressed_leads": false, "ai_chat": true, "ai_voice": false}'),
('investor', 49.00, 490.00, 10000, '{"new_homeowner_leads": false, "distressed_leads": true, "fsbo_leads": true, "ai_chat": true}'),
('full', 98.00, 980.00, 15000, '{"new_homeowner_leads": true, "distressed_leads": true, "fsbo_leads": true, "ai_chat": true, "ai_voice": true}');
```

### token_bundles
```sql
CREATE TABLE token_bundles (
  bundle_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_name VARCHAR(50),
  token_amount INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stripe_price_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO token_bundles (bundle_name, token_amount, price) VALUES
('10000 Credits', 10000, 10.00),
('25000 Credits', 25000, 20.00),
('50000 Credits', 50000, 35.00),
('100000 Credits', 100000, 60.00);
```

### ai_cost_config
```sql
CREATE TABLE ai_cost_config (
  config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name VARCHAR(50) UNIQUE NOT NULL,
  cost_per_unit DECIMAL(10,6) NOT NULL,
  markup_percentage DECIMAL(5,2) DEFAULT 50.00,
  tokens_per_unit INTEGER DEFAULT 1,
  unit_description VARCHAR(100),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO ai_cost_config (service_name, cost_per_unit, markup_percentage, tokens_per_unit, unit_description) VALUES
('gemini_tts_call', 0.001800, 50.00, 1, 'per 3-minute voice call'),
('together_chat_1k', 0.000200, 50.00, 1, 'per 1K chat tokens'),
('twilio_sms', 0.007500, 30.00, 1, 'per SMS message'),
('sendgrid_email', 0.000100, 100.00, 1, 'per email sent');
```

### admin_audit_logs
```sql
CREATE TABLE admin_audit_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES users(user_id),
  action VARCHAR(100),
  target_entity VARCHAR(50),
  target_id UUID,
  changes JSONB,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_admin_user_id ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_timestamp ON admin_audit_logs(timestamp DESC);
CREATE INDEX idx_admin_audit_logs_action ON admin_audit_logs(action);
```

---

## MAINTENANCE QUERIES

### Refresh Property Scores
```sql
-- Update days_since_sale for all new homeowners
UPDATE properties 
SET days_since_sale = EXTRACT(DAY FROM NOW() - sale_date)
WHERE sale_date IS NOT NULL;

-- Recalculate new_homeowner_score based on days
UPDATE properties
SET new_homeowner_score = CASE
  WHEN days_since_sale <= 30 THEN 100
  WHEN days_since_sale <= 60 THEN 75
  WHEN days_since_sale <= 90 THEN 50
  ELSE 10
END
WHERE is_new_homeowner = TRUE;
```

### Token Pool Reconciliation
```sql
-- Reconcile company token pool
UPDATE company_token_pool
SET 
  tokens_purchased = (SELECT COALESCE(SUM(tokens), 0) FROM token_purchases),
  tokens_consumed = (SELECT COALESCE(SUM(tokens_used), 0) FROM token_usage_logs),
  total_tokens = tokens_purchased - tokens_consumed,
  updated_at = NOW();
```

### Clean Old Data
```sql
-- Archive conversation history older than 90 days
DELETE FROM conversation_history WHERE timestamp < NOW() - INTERVAL '90 days';

-- Archive email logs older than 180 days
DELETE FROM email_workflow_logs WHERE sent_at < NOW() - INTERVAL '180 days';
```

---

## BACKUP STRATEGY

### Daily Backups
```bash
pg_dump -U postgres -h localhost real_estate_services_saas_db > backup_$(date +%Y%m%d).sql
```

### Cloud SQL Automated Backups
- Enable automated backups in Google Cloud SQL
- Retention: 30 days
- Backup window: 2:00 AM - 3:00 AM EST

---

## PERFORMANCE OPTIMIZATION

### Analyze and Vacuum
```sql
-- Run weekly
ANALYZE;
VACUUM ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### Monitor Slow Queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- 1 second
SELECT pg_reload_conf();

-- View slow queries
SELECT calls, mean_exec_time, query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```
