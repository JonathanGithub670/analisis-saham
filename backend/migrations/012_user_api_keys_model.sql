-- Optional per-key model override. When NULL, the backend uses a sensible
-- default per provider at chat time. Lets users pick e.g. glm-5.2, gpt-4o, etc.
ALTER TABLE user_api_keys ADD COLUMN IF NOT EXISTS model VARCHAR(60);
