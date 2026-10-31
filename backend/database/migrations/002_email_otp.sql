-- ============================================================
-- BIKA WUNGUKE - Migration 002: email OTP verification
-- PostgreSQL / Neon. Idempotent: safe to run repeatedly.
-- ============================================================

-- 1) users.email_verified — false until the owner proves control of the
--    email address. Existing accounts (created before this feature) are
--    grandfathered as verified so they are not locked out.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name   = 'users'
       AND column_name  = 'email_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN email_verified SMALLINT NOT NULL DEFAULT 0;
    UPDATE users SET email_verified = 1 WHERE email IS NOT NULL;
  END IF;
END;
$$;

-- 2) Email OTP table — only the HMAC-SHA256 hash of the OTP is stored.
CREATE TABLE IF NOT EXISTS email_otp (
  id           BIGSERIAL PRIMARY KEY,
  user_id      INTEGER     NOT NULL,
  otp_hash     VARCHAR(64) NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INTEGER     NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL,
  verified_at  TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_email_otp_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_email_otp_user ON email_otp (user_id);
CREATE INDEX IF NOT EXISTS idx_email_otp_expires ON email_otp (expires_at);
