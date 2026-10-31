-- ============================================================
-- BIKA WUNGUKE - PostgreSQL (Neon) database schema
-- Bika neza. Cunga neza. Wunguke kurushaho.
-- ============================================================

-- Keep updated_at fresh on every write, matching the old MySQL
-- "ON UPDATE CURRENT_TIMESTAMP" behaviour.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Users (traders)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                   SERIAL PRIMARY KEY,
  full_name            VARCHAR(120)  NOT NULL,
  phone                VARCHAR(20)   NOT NULL,
  email                VARCHAR(160)  NULL,
  password_hash        VARCHAR(255)  NOT NULL,
  business_name        VARCHAR(160)  NULL,
  business_type        VARCHAR(120)  NULL,
  business_location    VARCHAR(160)  NULL,
  business_description VARCHAR(255)  NULL,
  currency             CHAR(3)       NOT NULL DEFAULT 'RWF',
  locale               VARCHAR(10)   NOT NULL DEFAULT 'rw',
  email_verified       SMALLINT      NOT NULL DEFAULT 0,
  token_version        INTEGER       NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_phone UNIQUE (phone),
  CONSTRAINT uq_users_email UNIQUE (email)
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Email OTP (one-time passwords for email verification)
-- Only the HMAC-SHA256 hash of the OTP is ever stored.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Categories (income / expense categories per user)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL,
  name       VARCHAR(80) NOT NULL,
  type       VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  color      VARCHAR(9)  NOT NULL DEFAULT '#10b981',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_category_user_name_type UNIQUE (user_id, name, type),
  CONSTRAINT fk_categories_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories (user_id);

-- ------------------------------------------------------------
-- Transactions (income / expense records)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER        NOT NULL,
  category_id    INTEGER        NULL,
  type           VARCHAR(10)    NOT NULL CHECK (type IN ('income', 'expense')),
  amount         NUMERIC(14,2)  NOT NULL,
  description    VARCHAR(255)   NULL,
  payment_method VARCHAR(20)    NOT NULL DEFAULT 'cash'
                   CHECK (payment_method IN ('cash', 'mobile_money', 'bank', 'credit', 'other')),
  txn_date       DATE           NOT NULL,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_txn_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_txn_category FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_txn_user_date ON transactions (user_id, txn_date);
CREATE INDEX IF NOT EXISTS idx_txn_user_type ON transactions (user_id, type);
CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions (category_id);

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Savings goals (name + target amount + optional target date)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings_goals (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER       NOT NULL,
  name          VARCHAR(120)  NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL,
  target_date   DATE          NULL,
  status        VARCHAR(10)   NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'achieved', 'closed')),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON savings_goals (user_id, status);

DROP TRIGGER IF EXISTS trg_savings_goals_updated_at ON savings_goals;
CREATE TRIGGER trg_savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Savings (deposits / withdrawals from a savings pot)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS savings (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER       NOT NULL,
  type        VARCHAR(12)   NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount      NUMERIC(14,2) NOT NULL,
  goal        VARCHAR(120)  NULL,
  goal_id     INTEGER       NULL,
  note        VARCHAR(255)  NULL,
  saving_date DATE          NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_savings_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_savings_goal FOREIGN KEY (goal_id)
    REFERENCES savings_goals (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_savings_user_date ON savings (user_id, saving_date);
CREATE INDEX IF NOT EXISTS idx_savings_goal ON savings (goal_id);

DROP TRIGGER IF EXISTS trg_savings_updated_at ON savings;
CREATE TRIGGER trg_savings_updated_at
  BEFORE UPDATE ON savings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Password reset tokens (only the SHA-256 hash of the token is
-- ever stored; the raw token exists only inside the reset email)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Default categories for a freshly registered user are inserted
-- by the application (see backend/src/services/category.service.ts).
-- ------------------------------------------------------------
