-- Create user_api_keys table for storing encrypted user AI API keys
CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    api_key TEXT NOT NULL,
    is_valid BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider),
    CONSTRAINT chk_provider CHECK (provider IN ('claude', 'gemini', 'deepseek', 'groq', 'chatgpt'))
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

-- Partial index for quickly finding valid keys per user
CREATE INDEX IF NOT EXISTS idx_user_api_keys_valid ON user_api_keys(user_id, is_valid) WHERE is_valid = TRUE;
