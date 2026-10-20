-- ============================================================
-- BIKA WUNGUKE - MySQL database schema
-- Bika neza. Cunga neza. Wunguke kurushaho.
-- ============================================================

CREATE DATABASE IF NOT EXISTS bika_wunguke
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bika_wunguke;

-- ------------------------------------------------------------
-- Users (traders)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(120)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL,
  email         VARCHAR(160)  NULL,
  password_hash VARCHAR(255)  NOT NULL,
  business_name VARCHAR(160)  NULL,
  business_type VARCHAR(120)  NULL,
  business_location VARCHAR(160) NULL,
  business_description VARCHAR(255) NULL,
  currency      CHAR(3)       NOT NULL DEFAULT 'RWF',
  locale        VARCHAR(10)   NOT NULL DEFAULT 'rw',
  email_verified TINYINT(1)   NOT NULL DEFAULT 0,
  token_version INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Email OTP (one-time passwords for email verification)
-- Only the HMAC-SHA256 hash of the OTP is ever stored.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Categories (income / expense categories per user)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  name       VARCHAR(80)  NOT NULL,
  type       ENUM('income','expense') NOT NULL,
  color      VARCHAR(9)   NOT NULL DEFAULT '#10b981',
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category_user_name_type (user_id, name, type),
  KEY idx_categories_user (user_id),
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Transactions (income / expense records)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  category_id  INT UNSIGNED NULL,
  type         ENUM('income','expense') NOT NULL,
  amount       DECIMAL(14,2) NOT NULL,
  description  VARCHAR(255) NULL,
  payment_method ENUM('cash','mobile_money','bank','credit','other') NOT NULL DEFAULT 'cash',
  txn_date     DATE         NOT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_txn_user_date (user_id, txn_date),
  KEY idx_txn_user_type (user_id, type),
  KEY idx_txn_category (category_id),
  CONSTRAINT fk_txn_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_txn_category FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Savings goals (name + target amount + optional target date)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_goals (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  name          VARCHAR(120)  NOT NULL,
  target_amount DECIMAL(14,2) NOT NULL,
  target_date   DATE          NULL,
  status        ENUM('active','achieved','closed') NOT NULL DEFAULT 'active',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_goals_user_status (user_id, status),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Savings (deposits / withdrawals from a savings pot)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  type        ENUM('deposit','withdrawal') NOT NULL,
  amount      DECIMAL(14,2) NOT NULL,
  goal        VARCHAR(120)  NULL,
  goal_id     INT UNSIGNED  NULL,
  note        VARCHAR(255)  NULL,
  saving_date DATE          NOT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_savings_user_date (user_id, saving_date),
  KEY idx_savings_goal (goal_id),
  CONSTRAINT fk_savings_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_savings_goal FOREIGN KEY (goal_id)
    REFERENCES savings_goals (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Password reset tokens (only the SHA-256 hash of the token is
-- ever stored; the raw token exists only inside the reset email)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Default categories for a freshly registered user are inserted
-- by the application (see backend/src/services/category.service.ts).
-- ------------------------------------------------------------
