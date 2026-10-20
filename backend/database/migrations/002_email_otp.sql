-- ============================================================
-- BIKA WUNGUKE - Migration 002: email OTP verification
-- Idempotent: safe to run repeatedly.
-- ============================================================

USE bika_wunguke;

-- 1) users.email_verified — false until the owner proves control of the
--    email address. Existing accounts (created before this feature) are
--    grandfathered as verified so they are not locked out.
SET @has_col := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'users'
    AND COLUMN_NAME  = 'email_verified'
);
SET @ddl := IF(
  @has_col = 0,
  'ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER locale',
  'SELECT ''email_verified already exists'' AS notice'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := IF(
  @has_col = 0,
  'UPDATE users SET email_verified = 1 WHERE email IS NOT NULL',
  'SELECT ''existing accounts already handled'' AS notice'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Email OTP table — only the HMAC-SHA256 hash of the OTP is stored.
CREATE TABLE IF NOT EXISTS email_otp (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED    NOT NULL,
  otp_hash     CHAR(64)        NOT NULL,
  expires_at   DATETIME        NOT NULL,
  attempts     INT UNSIGNED    NOT NULL DEFAULT 0,
  last_sent_at DATETIME        NOT NULL,
  verified_at  DATETIME        NULL,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_email_otp_user (user_id),
  KEY idx_email_otp_expires (expires_at),
  CONSTRAINT fk_email_otp_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
