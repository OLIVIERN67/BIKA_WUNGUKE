import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool, ResultSetHeader, RowDataPacket } from '../config/database';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { sendPasswordResetEmail } from './email.service';
import { normalizeEmail } from '../utils/email';

const SALT_ROUNDS = 10;
const TOKEN_BYTES = 32; // 256 bits of entropy
export const RESET_TOKEN_TTL_MINUTES = 30;

const GENERIC_RESET_MESSAGE =
  'We have received your request. If an account exists with that email address, ' +
  'you will receive a password-reset link shortly. Please check your inbox and spam folder.';

export const INVALID_TOKEN_MESSAGE =
  'This reset link is invalid or has expired. Please request a new one.';

export { normalizeEmail };

/** SHA-256 hex digest - only this value is ever stored in the database. */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

export function buildResetUrl(token: string): string {
  return `${env.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Step 1 of the flow. Always behaves the same way whether or not an account
 * exists (no account enumeration). Email-delivery failures are logged safely
 * (never including the token) and do not change the API response.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const normalized = normalizeEmail(email);

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [normalized],
  );
  const user = rows[0] as { id: number } | undefined;

  // Unknown address: pretend success, do nothing else.
  if (!user) return;

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60_000);

  await pool.query<ResultSetHeader>(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, tokenHash, expiresAt],
  );

  try {
    await sendPasswordResetEmail(normalized, buildResetUrl(token), RESET_TOKEN_TTL_MINUTES);
  } catch (error) {
    const err = error as { code?: string; message?: string };
    // Never log the token / reset URL - code and message only.
    console.error(
      '[email] password reset email could not be sent:',
      err.code ?? err.message ?? 'unknown error',
    );
  }
}

/**
 * Step 2 of the flow. Runs inside a single transaction:
 * update the password, consume the token and invalidate every other
 * outstanding token for that account, bumping token_version so any
 * previously issued JWT stops working.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(token);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT id, user_id
         FROM password_reset_tokens
        WHERE token_hash = ?
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT 1`,
      [tokenHash],
    );
    const record = rows[0] as { id: number; user_id: number } | undefined;
    if (!record) {
      await conn.rollback();
      throw ApiError.badRequest(INVALID_TOKEN_MESSAGE);
    }

    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await conn.query<ResultSetHeader>(
      'UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?',
      [password_hash, record.user_id],
    );
    await conn.query<ResultSetHeader>(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
      [record.id],
    );
    // Invalidate every other outstanding token for this account.
    await conn.query<ResultSetHeader>(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [record.user_id],
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Optional helper used by the frontend to show a clear
 * "invalid/expired link" state before the user types a password.
 * Reveals nothing about the account behind the token.
 */
export async function isResetTokenValid(token: string): Promise<boolean> {
  if (!token) return false;
  const tokenHash = hashToken(token);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id
       FROM password_reset_tokens
      WHERE token_hash = ?
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1`,
    [tokenHash],
  );
  return rows.length > 0;
}

export { GENERIC_RESET_MESSAGE };
