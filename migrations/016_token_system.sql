-- Token System Schema

-- 1. Wallets Table
-- Stores the current balance for each user
CREATE TABLE IF NOT EXISTS wallets (
    wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 2. Token Transactions Table
-- Records every addition or deduction of tokens
CREATE TABLE IF NOT EXISTS token_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(wallet_id) ON DELETE CASCADE,
    
    amount INTEGER NOT NULL, -- Positive for purchase/gift, Negative for usage
    transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'usage', 'bonus', 'refund'
    description TEXT,
    
    -- Optional: Link to specific resource usage
    related_entity_type VARCHAR(50), -- 'lead_purchase', 'ai_call', 'campaign'
    related_entity_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_token_transactions_wallet_id ON token_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);
