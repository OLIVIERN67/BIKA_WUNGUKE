-- Older PostgreSQL deployments created users.email_verified as BOOLEAN.
-- The application (and schema.sql) use SMALLINT 0/1, so normalise any
-- pre-existing boolean column. Safe to run repeatedly.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name   = 'users'
      AND column_name  = 'email_verified'
      AND data_type    = 'boolean'
  ) THEN
    ALTER TABLE users ALTER COLUMN email_verified DROP DEFAULT;
    ALTER TABLE users
      ALTER COLUMN email_verified TYPE SMALLINT
      USING (CASE WHEN email_verified THEN 1 ELSE 0 END);
    ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT 0;
    ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
  END IF;
END $$;
