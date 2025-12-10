-- Migration: Create Referral & Commission System
-- Tables: referrers, referral_signups, commission_transactions, coupons

-- ============================================================
-- REFERRERS TABLE
-- Stores referrer/affiliate partner information
-- ============================================================
CREATE TABLE IF NOT EXISTS referrers (
    referrer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,  -- Optional: if referrer is also a user
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(255),
    referral_code VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "JOHN123"
    commission_percent DECIMAL(5,2) DEFAULT 10.00,  -- Default 10% of each payment
    status VARCHAR(20) DEFAULT 'active',  -- active, paused, suspended
    payout_method VARCHAR(50),  -- paypal, bank, check, venmo
    payout_details JSONB DEFAULT '{}',  -- Bank account info, PayPal email, etc.
    total_signups INTEGER DEFAULT 0,
    total_active_users INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    total_commission_earned DECIMAL(12,2) DEFAULT 0.00,
    total_commission_paid DECIMAL(12,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrers_code ON referrers(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrers_email ON referrers(email);
CREATE INDEX IF NOT EXISTS idx_referrers_status ON referrers(status);

-- ============================================================
-- REFERRAL SIGNUPS TABLE
-- Tracks which users signed up through which referrer
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_signups (
    signup_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES referrers(referrer_id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    user_role VARCHAR(50),  -- 'investor', 'provider'
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    discount_applied BOOLEAN DEFAULT true,
    discount_percent DECIMAL(5,2) DEFAULT 10.00,
    discount_months INTEGER DEFAULT 6,
    discount_ends_at TIMESTAMPTZ,
    monthly_amount DECIMAL(10,2) DEFAULT 0.00,  -- What they pay per month
    lifetime_value DECIMAL(12,2) DEFAULT 0.00,  -- Total paid so far
    status VARCHAR(20) DEFAULT 'pending',  -- pending, active, churned, cancelled
    churned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_signups_referrer ON referral_signups(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_signups_user ON referral_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_signups_status ON referral_signups(status);

-- ============================================================
-- COMMISSION TRANSACTIONS TABLE
-- Records every commission earned from payments
-- ============================================================
CREATE TABLE IF NOT EXISTS commission_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES referrers(referrer_id) ON DELETE SET NULL,
    signup_id UUID REFERENCES referral_signups(signup_id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(100),
    stripe_invoice_id VARCHAR(100),
    payment_amount DECIMAL(12,2) NOT NULL,  -- What the user paid
    commission_percent DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(12,2) NOT NULL,  -- What referrer earns
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, paid, cancelled
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(user_id),
    paid_at TIMESTAMPTZ,
    payout_reference VARCHAR(255),  -- Transaction ID from payout method
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_referrer ON commission_transactions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_commission_status ON commission_transactions(status);
CREATE INDEX IF NOT EXISTS idx_commission_created ON commission_transactions(created_at);

-- ============================================================
-- COUPONS TABLE
-- Discount codes that can be linked to referrers
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
    coupon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    description TEXT,
    discount_type VARCHAR(20) DEFAULT 'percent',  -- 'percent' or 'fixed'
    discount_value DECIMAL(10,2) NOT NULL,  -- 10 for 10%, or 50.00 for $50
    duration VARCHAR(20) DEFAULT 'repeating',  -- 'once', 'repeating', 'forever'
    duration_months INTEGER DEFAULT 6,  -- For 'repeating' duration
    applies_to VARCHAR(50) DEFAULT 'all',  -- 'all', 'investor', 'provider'
    max_uses INTEGER,  -- null = unlimited
    times_used INTEGER DEFAULT 0,
    referrer_id UUID REFERENCES referrers(referrer_id) ON DELETE SET NULL,
    stripe_coupon_id VARCHAR(100),
    stripe_promo_code_id VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_referrer ON coupons(referrer_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);

-- ============================================================
-- COMMISSION PAYOUTS TABLE
-- Tracks batch payouts to referrers
-- ============================================================
CREATE TABLE IF NOT EXISTS commission_payouts (
    payout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES referrers(referrer_id) ON DELETE SET NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_count INTEGER DEFAULT 0,
    payout_method VARCHAR(50),
    payout_reference VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(user_id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_referrer ON commission_payouts(referrer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON commission_payouts(status);

-- ============================================================
-- UPDATE USERS TABLE
-- Add referral tracking columns
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES referrers(referrer_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code_used VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_discount_ends_at TIMESTAMPTZ;

-- ============================================================
-- HELPER FUNCTION: Generate unique referral code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_referral_code(name_input VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    base_code VARCHAR;
    final_code VARCHAR;
    counter INTEGER := 0;
BEGIN
    -- Create base code from first 4 chars of name (uppercase) + random 4 digits
    base_code := UPPER(LEFT(REGEXP_REPLACE(name_input, '[^a-zA-Z]', '', 'g'), 4));
    IF LENGTH(base_code) < 4 THEN
        base_code := base_code || REPEAT('X', 4 - LENGTH(base_code));
    END IF;
    
    LOOP
        final_code := base_code || LPAD((FLOOR(RANDOM() * 10000))::TEXT, 4, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM referrers WHERE referral_code = final_code);
        counter := counter + 1;
        EXIT WHEN counter > 100;  -- Safety limit
    END LOOP;
    
    RETURN final_code;
END;
$$ LANGUAGE plpgsql;
