-- Check what migrations are already applied
SELECT 'Current migrations:' as info;
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;

-- Apply normalization migrations if not exists
DO $$
BEGIN
    -- We will apply migrations directly
    RAISE NOTICE 'Starting normalization migrations...';
END $$;
