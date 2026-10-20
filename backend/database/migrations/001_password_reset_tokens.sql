-- ============================================================
-- Migration 001: password reset support
-- Safe to run more than once against an existing database.
-- Usage (from backend/):  npm run db:migrate
-- ============================================================

USE bika_wunguke;

-- 1) Password reset tokens (hashed tokens only)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED    NOT NULL,
  token_hash CHAR(64)        NOT NULL,
  expires_at DATETIME        NOT NULL,
  used_at    DATETIME        NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_reset_token_hash (token_hash),
  KEY idx_reset_user_used (user_id, used_at),
  KEY idx_reset_expires (expires_at),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) users.token_version — bumped on every password change/reset so
--    already-issued JWTs are rejected and the user must log in again.
SET @has_col := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'users'
    AND COLUMN_NAME  = 'token_version'
);
SET @ddl := IF(
  @has_col = 0,
  'ALTER TABLE users ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER locale',
  'SELECT ''token_version already exists'' AS notice'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
