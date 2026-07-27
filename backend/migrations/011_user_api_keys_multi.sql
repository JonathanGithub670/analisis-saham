-- Allow a user to keep API keys for multiple AI platforms at once (one key per
-- platform). Chat auto-selects the first valid key. This relaxes migration 010's
-- single-key-per-user rule back to one-key-per-(user, provider).

-- Drop the single-key-per-user constraint added in 010.
ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS user_api_keys_user_id_unique;

-- Enforce at most one key per platform per user. Safe to add: after 010's dedup
-- there is at most one row per user, so no (user_id, provider) duplicates exist.
ALTER TABLE user_api_keys ADD CONSTRAINT user_api_keys_user_provider_unique
    UNIQUE (user_id, provider);
