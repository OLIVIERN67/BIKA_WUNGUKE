import crypto from 'crypto';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/database';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { User } from '../types';
import { sendOtpEmail } from './email.service';
import { maskEmail } from '../utils/email';

export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export const INVALID_OTP_MESSAGE =
  'That verification code is invalid or has expired. Please request a new one.';
export const EXPIRED_OTP_MESSAGE =
  'That verification code has expired. Please request a new one.';
export const TOO_MANY_ATTEMPTS_MESSAGE =
  'Too many incorrect attempts. Please request a new code.';
export const GENERIC_OTP_SENT_MESSAGE =
  "If an account needs verification, we've sent a new code to its registered email address.";
export const EMAIL_DELIVERY_FAILED_MESSAGE =
  'We could not send the verification email right now. Please try again in a moment.';

/** Cryptographically secure six-digit code (000000-999999). */
function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * HMAC-SHA256 of `userId:otp` keyed by the server secret. The OTP space is
 * only one million values, so a keyed hash (rather than a bare SHA-256) keeps
 * the stored value useless to anyone who obtains a database dump.
 */
function hashOtp(otp: string, userId: number): string {
  return crypto.createHmac('sha256', env.jwt.secret).update(`${userId}:${otp}`).digest('hex');
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

export { maskEmail } from '../utils/email';

interface OtpOptions {
  enforceCooldown?: boolean;
}

/**
 * Creates a fresh OTP for the account, invalidating any previous unused code,
 * and emails it. Throws `ApiError` when the code cannot be delivered so callers
 * can report an honest failure — the raw OTP is never stored in plaintext, and
 * never logged or returned.
 */
export async function issueEmailOtp(user: User, options: OtpOptions = {}): Promise<void> {
  if (!user.email) {
    throw ApiError.badRequest(
      'This account has no email address on file. Please add one in your profile.',
    );
  }

  const otp = generateOtp();
  const conn = await pool.getConnection();
  let cooldownRemainingSeconds = 0;
  let otpRecordId: number | null = null;
  try {
    await conn.beginTransaction();

    if (options.enforceCooldown) {
      const [rows] = await conn.query<RowDataPacket[]>(
        `SELECT last_sent_at FROM email_otp
          WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        [user.id],
      );
      const latest = rows[0] as { last_sent_at: string } | undefined;
      if (latest) {
        const elapsedMs = Date.now() - new Date(latest.last_sent_at).getTime();
        const remainingMs = OTP_RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs;
        if (remainingMs > 0) {
          cooldownRemainingSeconds = Math.ceil(remainingMs / 1000);
        }
      }
    }

    if (cooldownRemainingSeconds === 0) {
      // Invalidate every previous unused code for this account.
      await conn.query('DELETE FROM email_otp WHERE user_id = ? AND verified_at IS NULL', [user.id]);

      const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
      const [insert] = await conn.query<ResultSetHeader>(
        `INSERT INTO email_otp (user_id, otp_hash, expires_at, last_sent_at)
         VALUES (?, ?, ?, ?)`,
        [user.id, hashOtp(otp, user.id), expiresAt, new Date()],
      );
      otpRecordId = insert.insertId;
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }

  if (cooldownRemainingSeconds > 0) {
    throw ApiError.tooManyRequests(
      `Please wait ${cooldownRemainingSeconds} second(s) before requesting a new code.`,
    );
  }

  try {
    await sendOtpEmail(user.email, otp, OTP_TTL_MINUTES);
  } catch (error) {
    const err = error as { code?: string; message?: string };
    // Never log the OTP itself.
    console.error(
      '[email] verification OTP email could not be sent:',
      err.code ?? err.message ?? 'unknown error',
    );
    // Roll back the just-created code so the cooldown does not block an
    // immediate, genuine retry and no unusable code lingers.
    if (otpRecordId !== null) {
      await pool
        .query('DELETE FROM email_otp WHERE id = ?', [otpRecordId])
        .catch(() => undefined);
    }
    throw ApiError.internal(EMAIL_DELIVERY_FAILED_MESSAGE);
  }
}

interface OtpIdentity {
  email?: string;
  phone?: string;
}

/** Resolves the account by email or phone (whichever the caller supplied). */
async function findUserForOtp(identity: OtpIdentity): Promise<User | undefined> {
  const conditions: string[] = [];
  const values: string[] = [];
  if (identity.email) {
    conditions.push('email = ?');
    values.push(identity.email.trim().toLowerCase());
  }
  if (identity.phone) {
    conditions.push('phone = ?');
    values.push(identity.phone);
  }
  if (conditions.length === 0) return undefined;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM users WHERE ${conditions.join(' OR ')} LIMIT 1`,
    values,
  );
  return rows[0] as User | undefined;
}

/**
 * Verifies an OTP for the account identified by email or phone. On success the
 * account is marked verified when necessary and the code is consumed. Runs in
 * a single transaction so an OTP can never be used twice concurrently.
 */
export async function verifyEmailOtp(identity: OtpIdentity, otp: string): Promise<User> {
  const user = await findUserForOtp(identity);
  if (!user) throw ApiError.badRequest(INVALID_OTP_MESSAGE);

  const conn = await pool.getConnection();
  let failure: ApiError | null = null;
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT id, otp_hash, attempts, expires_at
         FROM email_otp
        WHERE user_id = ? AND verified_at IS NULL
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE`,
      [user.id],
    );
    const record = rows[0] as
      | { id: number; otp_hash: string; attempts: number; expires_at: string }
      | undefined;

    if (!record) {
      failure = ApiError.badRequest(INVALID_OTP_MESSAGE);
    } else if (new Date(record.expires_at).getTime() <= Date.now()) {
      await conn.query('DELETE FROM email_otp WHERE id = ?', [record.id]);
      failure = ApiError.badRequest(EXPIRED_OTP_MESSAGE);
    } else if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await conn.query('DELETE FROM email_otp WHERE id = ?', [record.id]);
      failure = ApiError.tooManyRequests(TOO_MANY_ATTEMPTS_MESSAGE);
    } else if (!constantTimeEquals(record.otp_hash, hashOtp(otp, user.id))) {
      await conn.query('UPDATE email_otp SET attempts = attempts + 1 WHERE id = ?', [record.id]);
      const remaining = OTP_MAX_ATTEMPTS - (record.attempts + 1);
      failure =
        remaining > 0
          ? ApiError.badRequest(`Incorrect code. You have ${remaining} attempt(s) left.`)
          : ApiError.tooManyRequests(TOO_MANY_ATTEMPTS_MESSAGE);
    } else {
      if (!user.email_verified) {
        await conn.query('UPDATE users SET email_verified = 1 WHERE id = ?', [user.id]);
      }
      await conn.query(
        'UPDATE email_otp SET verified_at = NOW(6) WHERE user_id = ? AND verified_at IS NULL',
        [user.id],
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }

  if (failure) throw failure;

  // Reflect the new state on the returned record so callers can issue a session.
  return { ...user, email_verified: 1 };
}

/**
 * Public resend entry point. Unknown accounts are a silent no-op (no account
 * enumeration). Verified accounts can also request a login code.
 */
export async function resendEmailOtp(identity: OtpIdentity): Promise<void> {
  const user = await findUserForOtp(identity);
  if (!user) return;
  await issueEmailOtp(user, { enforceCooldown: true });
}
