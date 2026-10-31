import crypto from 'crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../services/email.service', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  verifyEmailTransport: vi.fn().mockResolvedValue(undefined),
}));

import app from '../app';
import { pool, RowDataPacket } from '../config/database';
import { rateLimitingEnabled } from '../config/env';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/email.service';
import { resetTestDatabase } from './test-db';

const GENERIC_MESSAGE = 'We have received your request.';
const INVALID_TOKEN_MESSAGE =
  'This reset link is invalid or has expired. Please request a new one.';
const OLD_PASSWORD = 'OldPassword1234!';
const NEW_PASSWORD = 'NewSecurePass123!';

let seq = 0;
function uniquePhone(): string {
  seq += 1;
  const tail = String((Date.now() + seq) % 1_000_000).padStart(6, '0');
  return `0722${tail}`;
}

async function registerUser() {
  const phone = uniquePhone();
  const email = `trader-${phone}@example.com`;
  const res = await request(app).post('/api/auth/register').send({
    full_name: 'Reset Tester',
    phone,
    email,
    password: OLD_PASSWORD,
    confirm_password: OLD_PASSWORD,
  });
  expect(res.status).toBe(201);
  // Simulate the owner completing email verification so password reset
  // (and login) can be exercised.
  await pool.query('UPDATE users SET email_verified = 1 WHERE id = ?', [res.body.data.user.id]);
  return {
    phone,
    email,
    userId: res.body.data.user.id as number,
  };
}

function requestReset(email: string) {
  return request(app).post('/api/auth/forgot-password').send({ email });
}

function lastResetUrl(): string {
  const calls = vi.mocked(sendPasswordResetEmail).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][1] as string;
}

function tokenFromUrl(url: string): string {
  const token = new URL(url).searchParams.get('token');
  expect(token).toBeTruthy();
  return token as string;
}

function login(phone: string, password: string) {
  return request(app).post('/api/auth/login').send({ phone, password });
}

function resetPassword(token: string, newPassword = NEW_PASSWORD, confirmPassword = newPassword) {
  return request(app)
    .post('/api/auth/reset-password')
    .send({ token, newPassword, confirmPassword });
}

beforeAll(async () => {
  await resetTestDatabase();
});

beforeEach(() => {
  vi.mocked(sendPasswordResetEmail).mockClear();
});

describe('POST /api/auth/forgot-password', () => {
  it('returns the generic message and emails a correct frontend reset link', async () => {
    const user = await registerUser();

    const res = await requestReset(user.email);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain(GENERIC_MESSAGE);

    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const [recipient, url] = lastResetUrl().length
      ? vi.mocked(sendPasswordResetEmail).mock.calls[0]
      : [];
    expect(recipient).toBe(user.email);
    expect(String(url)).toContain(`${process.env.FRONTEND_URL}/reset-password?token=`);

    // The raw token must never appear in the API response.
    const token = tokenFromUrl(String(url));
    expect(JSON.stringify(res.body)).not.toContain(token);
  });

  it('returns the identical generic response for an unknown email and sends nothing', async () => {
    const res = await requestReset('definitely-not-registered@example.com');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain(GENERIC_MESSAGE);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('stores only the SHA-256 hash of the token, never the raw token', async () => {
    const user = await registerUser();
    await requestReset(user.email);
    const rawToken = tokenFromUrl(lastResetUrl());

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT token_hash FROM password_reset_tokens WHERE user_id = ?',
      [user.userId],
    );
    expect(rows).toHaveLength(1);
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    expect(rows[0].token_hash).toBe(expectedHash);
    expect(rows[0].token_hash).not.toBe(rawToken);
  });

  it('rejects an invalid email address with field-level validation details', async () => {
    const res = await requestReset('not-an-email');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details?.[0]?.path).toBe('email');
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('rate-limits repeated reset requests for the same email address', async () => {
    if (!rateLimitingEnabled) return;
    const email = `ratelimit-${Date.now()}@example.com`;
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const res = await requestReset(email);
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });
});

describe('POST /api/auth/reset-password', () => {
  it('rejects an invalid token', async () => {
    const res = await resetPassword('this-is-not-a-real-token');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(INVALID_TOKEN_MESSAGE);
  });

  it('rejects an expired token and leaves the password untouched', async () => {
    const user = await registerUser();
    const rawToken = `expired-${crypto.randomBytes(16).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.userId, hash, new Date(Date.now() - 60_000)],
    );

    const res = await resetPassword(rawToken);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(INVALID_TOKEN_MESSAGE);

    const stillWorks = await login(user.phone, OLD_PASSWORD);
    expect(stillWorks.status).toBe(200);
  });

  it('accepts a valid token, changes the password, and invalidates the old one', async () => {
    const user = await registerUser();
    await requestReset(user.email);
    const token = tokenFromUrl(lastResetUrl());

    const res = await resetPassword(token);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const oldLogin = await login(user.phone, OLD_PASSWORD);
    expect(oldLogin.status).toBe(401);

    const newLogin = await login(user.phone, NEW_PASSWORD);
    expect(newLogin.status).toBe(200);
  });

  it('does not allow a used token to be reused', async () => {
    const user = await registerUser();
    await requestReset(user.email);
    const token = tokenFromUrl(lastResetUrl());

    const first = await resetPassword(token);
    expect(first.status).toBe(200);

    const second = await resetPassword(token, 'AnotherPass12345!', 'AnotherPass12345!');
    expect(second.status).toBe(400);
    expect(second.body.message).toBe(INVALID_TOKEN_MESSAGE);
  });

  it('invalidates every other outstanding token after a successful reset', async () => {
    const user = await registerUser();
    await requestReset(user.email);
    const tokenA = tokenFromUrl(lastResetUrl());
    await requestReset(user.email);
    const tokenB = tokenFromUrl(lastResetUrl());

    const first = await resetPassword(tokenA);
    expect(first.status).toBe(200);

    const second = await resetPassword(tokenB, 'ThirdPassword123!', 'ThirdPassword123!');
    expect(second.status).toBe(400);
    expect(second.body.message).toBe(INVALID_TOKEN_MESSAGE);
  });

  it('rejects mismatched confirmation passwords', async () => {
    const user = await registerUser();
    await requestReset(user.email);
    const token = tokenFromUrl(lastResetUrl());

    const res = await resetPassword(token, NEW_PASSWORD, 'DifferentPass123!');
    expect(res.status).toBe(400);
    expect(res.body.details?.[0]?.path).toBe('confirmPassword');
  });

  it('rejects a new password that does not meet the password policy', async () => {
    const user = await registerUser();
    await requestReset(user.email);
    const token = tokenFromUrl(lastResetUrl());

    const res = await resetPassword(token, 'short', 'short');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    const paths = (res.body.details ?? []).map((d: { path: string }) => d.path);
    expect(paths).toContain('newPassword');
  });

  it('invalidates previously issued JWTs so the user must log in again', async () => {
    const user = await registerUser();

    const loginBefore = await login(user.phone, OLD_PASSWORD);
    expect(loginBefore.status).toBe(200);
    expect(loginBefore.body.data.verificationRequired).toBe(true);
    const sessionToken = (
      await request(app)
        .post('/api/auth/verify-email')
        .send({ phone: user.phone, otp: vi.mocked(sendOtpEmail).mock.calls.at(-1)?.[1] })
    ).body.data.token as string;

    const meBefore = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(meBefore.status).toBe(200);

    await requestReset(user.email);
    const token = tokenFromUrl(lastResetUrl());
    const reset = await resetPassword(token);
    expect(reset.status).toBe(200);

    const meAfter = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);
    expect(meAfter.status).toBe(401);
  });

  it('handles email delivery failure safely: generic response, no token leak in logs', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(sendPasswordResetEmail).mockRejectedValueOnce(new Error('SMTP connection failed'));

    const user = await registerUser();
    const res = await requestReset(user.email);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain(GENERIC_MESSAGE);

    const rawToken = tokenFromUrl(lastResetUrl());
    expect(JSON.stringify(res.body)).not.toContain(rawToken);

    const logged = errorSpy.mock.calls
      .map((call) => call.map((arg) => String(arg)).join(' '))
      .join(' ');
    expect(logged).toContain('[email] password reset email could not be sent');
    expect(logged).not.toContain(rawToken);
    expect(logged).not.toContain(OLD_PASSWORD);

    errorSpy.mockRestore();
  });

  it("does not let a caller reset another account's password without a valid token", async () => {
    const victim = await registerUser();
    const attacker = await registerUser();

    const res = await request(app).post('/api/auth/reset-password').send({
      token: `attacker-token-${crypto.randomBytes(16).toString('hex')}`,
      newPassword: 'AttackerPass123!',
      confirmPassword: 'AttackerPass123!',
    });
    expect(res.status).toBe(400);

    // The victim's credentials are untouched.
    const victimLogin = await login(victim.phone, OLD_PASSWORD);
    expect(victimLogin.status).toBe(200);
    const attackerLogin = await login(attacker.phone, OLD_PASSWORD);
    expect(attackerLogin.status).toBe(200);
  });
});

describe('POST /api/auth/validate-reset-token', () => {
  it('accepts a valid token and reveals no account details', async () => {
    const user = await registerUser();
    await requestReset(user.email);
    const token = tokenFromUrl(lastResetUrl());

    const res = await request(app).post('/api/auth/validate-reset-token').send({ token });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ valid: true });
    expect(JSON.stringify(res.body)).not.toContain(user.email);
    expect(JSON.stringify(res.body)).not.toContain(user.phone);
  });

  it('rejects an unknown token', async () => {
    const res = await request(app)
      .post('/api/auth/validate-reset-token')
      .send({ token: 'unknown-token-value' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(INVALID_TOKEN_MESSAGE);
  });

  it('rejects a token that has already been used', async () => {
    const user = await registerUser();
    await requestReset(user.email);
    const token = tokenFromUrl(lastResetUrl());
    await resetPassword(token);

    const res = await request(app).post('/api/auth/validate-reset-token').send({ token });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(INVALID_TOKEN_MESSAGE);
  });
});
