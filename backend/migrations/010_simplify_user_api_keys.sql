-- Simplify user_api_keys: a user stores a single API key whose AI platform is
-- auto-detected from the key (not user-chosen). Drop the (user_id, provider)
-- uniqueness and the provider CHECK, then enforce one key per user.

-- Drop ALL unique + check constraints on the table (name-agnostic, so this is
-- robust regardless of how Postgres auto-named the original constraints).
DO $$
DECLARE c text;
BEGIN
    FOR c IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'user_api_keys'::regclass
          AND contype IN ('u', 'c')
    LOOP
        EXECUTE format('ALTER TABLE user_api_keys DROP CONSTRAINT IF EXISTS %I', c);
    END LOOP;
END $$;

-- If a user somehow has multiple rows (e.g. one per provider from the old flow),
-- keep only the best one: prefer a verified key, then the most recently updated.
DELETE FROM user_api_keys a
WHERE a.id <> (
    SELECT b.id
    FROM user_api_keys b
    WHERE b.user_id = a.user_id
    ORDER BY b.is_valid DESC, b.updated_at DESC, b.created_at DESC
    LIMIT 1
);

-- Enforce a single API key per user going forward.
ALTER TABLE user_api_keys ADD CONSTRAINT user_api_keys_user_id_unique UNIQUE (user_id);
