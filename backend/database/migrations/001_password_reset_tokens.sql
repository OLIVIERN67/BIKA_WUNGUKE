-- ============================================================
-- Migration 001: password reset support (PostgreSQL / Neon)
-- Safe to run more than once against an existing database.
-- Usage (from backend/):  npm run db:migrate
-- ============================================================

-- 1) users.token_version — bumped on every password change/reset so
--    already-issued JWTs are rejected and the user must log in again.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name   = 'users'
       AND column_name  = 'token_version'
  ) THEN
    ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
  END IF;
END;
$$;

-- 2) Password reset tokens (hashed tokens only)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reset_token_hash UNIQUE (token_hash),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reset_user_used ON password_reset_tokens (user_id, used_at);
CREATE INDEX IF NOT EXISTS idx_reset_expires ON password_reset_tokens (expires_at);
