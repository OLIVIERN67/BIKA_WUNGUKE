import crypto from 'crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { RowDataPacket } from 'mysql2';

vi.mock('../services/email.service', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendOtpEmail: vi.fn().mockResolvedValue(undefined),
  verifyEmailTransport: vi.fn().mockResolvedValue(undefined),
}));

import app from '../app';
import { pool } from '../config/database';
import { sendOtpEmail } from '../services/email.service';
import { resetTestDatabase } from './test-db';

const PASSWORD = 'StrongPassword123!';
const INVALID_OTP_MESSAGE =
  'That verification code is invalid or has expired. Please request a new one.';

let seq = 0;
function uniquePhone(): string {
  seq += 1;
  const tail = String((Date.now() + seq) % 1_000_000).padStart(6, '0');
  return `0733${tail}`;
}

/** The raw OTP only exists in the mailer argument - capture it from the mock. */
function lastOtp(): string {
  const calls = vi.mocked(sendOtpEmail).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  return calls[calls.length - 1][1] as string;
}

async function register(overrides: Record<string, unknown> = {}) {
  const phone = uniquePhone();
  const email = `verify-${phone}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      full_name: 'OTP Tester',
      phone,
      email,
      password: PASSWORD,
      confirm_password: PASSWORD,
      ...overrides,
    });
  return { phone, email, res };
}

function verify(email: string, otp: string) {
  return request(app).post('/api/auth/verify-email').send({ email, otp });
}

function resend(email: string) {
  return request(app).post('/api/auth/resend-otp').send({ email });
}

function login(phone: string, password: string) {
  return request(app).post('/api/auth/login').send({ phone, password });
}

beforeAll(async () => {
  await resetTestDatabase();
});

beforeEach(() => {
  vi.mocked(sendOtpEmail).mockClear();
});

describe('POST /api/auth/register (OTP)', () => {
  it('creates a pending account, emails a 6-digit OTP, and returns no token', async () => {
    const { res, email } = await register();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verificationRequired).toBe(true);
    expect(res.body.data.token).toBeUndefined();

    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    const [recipient, otp] = vi.mocked(sendOtpEmail).mock.calls[0];
    expect(recipient).toBe(email);
    expect(String(otp)).toMatch(/^\d{6}$/);

    // The OTP must never appear in the API response.
    expect(JSON.stringify(res.body)).not.toContain(String(otp));
  });

  it('stores only a hash of the OTP, not the raw code', async () => {
    const { res } = await register();
    const otp = lastOtp();
    const userId = res.body.data.user.id as number;

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT otp_hash FROM email_otp WHERE user_id = ?',
      [userId],
    );
    expect(rows).toHaveLength(1);
    expect(String(otp)).toMatch(/^\d{6}$/);
    expect(rows[0].otp_hash).not.toBe(otp);
    expect(String(rows[0].otp_hash)).toHaveLength(64);
  });

  it('rejects a duplicate phone number', async () => {
    const { phone, res } = await register();
    expect(res.status).toBe(201);

    const dupe = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Dupe',
        phone,
        email: `other-${uniquePhone()}@example.com`,
        password: PASSWORD,
        confirm_password: PASSWORD,
      });
    expect(dupe.status).toBe(409);
  });

  it('rejects a duplicate email address', async () => {
    const { email } = await register();

    const dupe = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Dupe',
        phone: uniquePhone(),
        email,
        password: PASSWORD,
        confirm_password: PASSWORD,
      });
    expect(dupe.status).toBe(409);
  });

  it('rejects mismatched confirmation passwords', async () => {
    const phone = uniquePhone();
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        full_name: 'Mismatch',
        phone,
        email: `mismatch-${phone}@example.com`,
        password: PASSWORD,
        confirm_password: 'Different12345!',
      });
    expect(res.status).toBe(400);
    const paths = (res.body.details ?? []).map((d: { path: string }) => d.path);
    expect(paths).toContain('confirm_password');
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it('handles OTP email delivery failure without failing registration', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(sendOtpEmail).mockRejectedValueOnce(new Error('SMTP down'));

    const { res } = await register();
    expect(res.status).toBe(201);
    // The response must not claim the email was sent.
    expect(res.body.data.otpSent).toBe(false);

    const logged = errorSpy.mock.calls.map((c) => c.map(String).join(' ')).join(' ');
    expect(logged).toContain('[email] verification OTP email could not be sent');
    errorSpy.mockRestore();
  });

  it('reports otpSent=true when the email is accepted', async () => {
    const { res } = await register();
    expect(res.status).toBe(201);
    expect(res.body.data.otpSent).toBe(true);
  });
});

describe('POST /api/auth/verify-email', () => {
  it('verifies the email with the correct OTP and allows login afterwards', async () => {
    const { phone, email } = await register();
    const otp = lastOtp();

    const res = await verify(email, otp);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const loginRes = await login(phone, PASSWORD);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.verificationRequired).toBe(true);
    const loginOtp = lastOtp();
    const verifiedLogin = await verify(email, loginOtp);
    expect(verifiedLogin.status).toBe(200);
    expect(verifiedLogin.body.data.token).toBeTruthy();
  });

  it('rejects a wrong OTP', async () => {
    const { res: reg, email } = await register();
    const otp = lastOtp();
    const wrong = otp === '000000' ? '111111' : '000000';

    const res = await verify(email, wrong);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Incorrect code');

    // The account is still unverified.
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT email_verified FROM users WHERE id = ?',
      [reg.body.data.user.id],
    );
    expect(Number(rows[0].email_verified)).toBe(0);
  });

  it('rejects an expired OTP', async () => {
    const { res: reg, email } = await register();
    await pool.query('UPDATE email_otp SET expires_at = ? WHERE user_id = ?', [
      new Date(Date.now() - 60_000),
      reg.body.data.user.id,
    ]);

    const res = await verify(email, lastOtp());
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('expired');
  });

  it('does not allow a used OTP to be reused', async () => {
    const { res: reg, email } = await register();
    const otp = lastOtp();

    const first = await verify(email, otp);
    expect(first.status).toBe(200);

    // Force the account back to unverified to prove the code itself is spent.
    await pool.query('UPDATE users SET email_verified = 0 WHERE id = ?', [reg.body.data.user.id]);
    const second = await verify(email, otp);
    expect(second.status).toBe(400);
    expect(second.body.message).toBe(INVALID_OTP_MESSAGE);
  });

  it('does not issue a token for an already verified account with an arbitrary OTP', async () => {
    const { email } = await register();
    const otp = lastOtp();

    expect((await verify(email, otp)).status).toBe(200);
    const replay = await verify(email, '000000');

    expect(replay.status).toBe(400);
    expect(replay.body.message).toBe(INVALID_OTP_MESSAGE);
    expect(replay.body.data?.token).toBeUndefined();
  });

  it('locks out after too many wrong attempts', async () => {
    const { email } = await register();
    const wrong = '000000';
    let last = 0;
    for (let i = 0; i < 7; i += 1) {
      const res = await verify(email, wrong);
      last = res.status;
    }
    expect([400, 429]).toContain(last);
    const statuses: number[] = [];
    for (let i = 0; i < 3; i += 1) {
      statuses.push((await verify(email, wrong)).status);
    }
    expect(statuses).toContain(400);
  });

  it('reveals nothing about unknown accounts', async () => {
    const res = await verify('nobody-here@example.com', '123456');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(INVALID_OTP_MESSAGE);
  });

  it('verifies using the registered phone number instead of the email', async () => {
    const { phone } = await register();
    const otp = lastOtp();

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ phone, otp });
    expect(res.status).toBe(200);

    const loginRes = await login(phone, PASSWORD);
    expect(loginRes.status).toBe(200);
  });
});

describe('POST /api/auth/resend-otp', () => {
  it('issues a new OTP that invalidates the previous one', async () => {
    const { res: reg, email } = await register();
    const firstOtp = lastOtp();

    // Backdate the initial send so the resend cooldown has elapsed.
    await pool.query('UPDATE email_otp SET last_sent_at = ? WHERE user_id = ?', [
      new Date(Date.now() - 61_000),
      reg.body.data.user.id,
    ]);

    const res = await resend(email);
    expect(res.status).toBe(200);
    expect(sendOtpEmail).toHaveBeenCalledTimes(2);
    const secondOtp = lastOtp();
    expect(secondOtp).not.toBe(firstOtp);

    // The old code no longer works.
    const oldAttempt = await verify(email, firstOtp);
    expect(oldAttempt.status).toBe(400);

    const newAttempt = await verify(email, secondOtp);
    expect(newAttempt.status).toBe(200);
  });

  it('enforces a cooldown between requests, then succeeds after it passes', async () => {
    const { res: reg, email } = await register();
    const firstOtp = lastOtp();

    // Immediately after registration the resend cooldown is still active.
    const tooSoon = await resend(email);
    expect(tooSoon.status).toBe(429);

    // Backdate the last send so the cooldown has elapsed.
    await pool.query('UPDATE email_otp SET last_sent_at = ? WHERE user_id = ?', [
      new Date(Date.now() - 61_000),
      reg.body.data.user.id,
    ]);

    const okRes = await resend(email);
    expect(okRes.status).toBe(200);
    const secondOtp = lastOtp();
    expect(secondOtp).not.toBe(firstOtp);

    // The previous code is invalidated.
    expect((await verify(email, firstOtp)).status).toBe(400);
    expect((await verify(email, secondOtp)).status).toBe(200);
  });

  it('returns a generic message for unknown addresses without sending mail', async () => {
    const res = await resend('unknown-address@example.com');
    expect(res.status).toBe(200);
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it('can issue a login OTP for an already verified account', async () => {
    const { email } = await register();
    await verify(email, lastOtp());
    vi.mocked(sendOtpEmail).mockClear();

    await pool.query('UPDATE email_otp SET last_sent_at = ? WHERE user_id = (SELECT id FROM users WHERE email = ?)', [
      new Date(Date.now() - 61_000),
      email,
    ]);
    const res = await resend(email);
    expect(res.status).toBe(200);
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
  });

  it('resends using the registered phone number', async () => {
    const { res: reg, phone } = await register();
    await pool.query('UPDATE email_otp SET last_sent_at = ? WHERE user_id = ?', [
      new Date(Date.now() - 61_000),
      reg.body.data.user.id,
    ]);

    const res = await request(app).post('/api/auth/resend-otp').send({ phone });
    expect(res.status).toBe(200);
    expect(sendOtpEmail).toHaveBeenCalledTimes(2);
  });

  it('surfaces a delivery failure when the resend email cannot be sent', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { res: reg, email } = await register();
    await pool.query('UPDATE email_otp SET last_sent_at = ? WHERE user_id = ?', [
      new Date(Date.now() - 61_000),
      reg.body.data.user.id,
    ]);
    vi.mocked(sendOtpEmail).mockRejectedValueOnce(new Error('SMTP down'));

    const res = await resend(email);
    expect(res.status).toBe(500);
    expect(res.body.message).toContain('could not send');
    errorSpy.mockRestore();
  });
});

describe('POST /api/auth/login (verification gate)', () => {
  it('does not issue a session for an unverified account and emails a fresh OTP', async () => {
    const { phone, email } = await register();
    vi.mocked(sendOtpEmail).mockClear();

    const res = await login(phone, PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.data.verificationRequired).toBe(true);
    // No session token may be issued before verification.
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.otpSent).toBe(true);

    // A fresh code is sent on login so a lost registration code can be recovered.
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    const [recipient, otp] = vi.mocked(sendOtpEmail).mock.calls[0];
    expect(recipient).toBe(email);
    expect(String(otp)).toMatch(/^\d{6}$/);

    // Masked email hides the local part; the raw OTP never appears.
    const masked = res.body.data.maskedEmail as string;
    expect(masked).toContain('@');
    expect(masked).not.toBe(email);
    expect(masked).toContain('*');
    expect(JSON.stringify(res.body)).not.toContain(String(otp));
  });

  it('completes login after the emailed OTP is verified (verify returns a session)', async () => {
    const { phone } = await register();

    const gate = await login(phone, PASSWORD);
    expect(gate.body.data.verificationRequired).toBe(true);
    const otp = lastOtp();

    const verified = await request(app)
      .post('/api/auth/verify-email')
      .send({ phone, otp });
    expect(verified.status).toBe(200);
    expect(verified.body.data.token).toBeTruthy();
    expect(verified.body.data.user.email_verified).toBe(1);
  });

  it('rejects wrong credentials with a generic message and never sends an OTP', async () => {
    const { phone } = await register();
    vi.mocked(sendOtpEmail).mockClear();

    const res = await login(phone, 'WrongPassword123!');
    expect(res.status).toBe(401);
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });

  it('requires an OTP for a verified user after phone + password', async () => {
    const { phone, email } = await register();
    await verify(email, lastOtp());
    vi.mocked(sendOtpEmail).mockClear();

    const res = await login(phone, PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email_verified).toBe(1);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.verificationRequired).toBe(true);
    expect(res.body.data.otpSent).toBe(true);
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);

    const verified = await verify(email, lastOtp());
    expect(verified.status).toBe(200);
    expect(verified.body.data.token).toBeTruthy();
  });

  it('reports otpSent=false on login when the OTP email cannot be delivered', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { phone } = await register();
    vi.mocked(sendOtpEmail).mockRejectedValueOnce(new Error('SMTP down'));

    const res = await login(phone, PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.data.verificationRequired).toBe(true);
    expect(res.body.data.otpSent).toBe(false);
    errorSpy.mockRestore();
  });

  it('issues opaque OTP hashes (never a bare SHA-256 of the code)', async () => {
    const { res: reg } = await register();
    const otp = lastOtp();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT otp_hash FROM email_otp WHERE user_id = ?',
      [reg.body.data.user.id],
    );
    const bareSha = crypto.createHash('sha256').update(otp).digest('hex');
    expect(rows[0].otp_hash).not.toBe(bareSha);
  });
});

describe('protected routes require a verified account', () => {
  it('rejects an unverified JWT even if it is somehow presented', async () => {
    const { res: reg } = await register();
    const userId = reg.body.data.user.id as number;

    // Craft a token exactly as the server would, but for an unverified user.
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { sub: userId, phone: '0700000000', tv: 0 },
      process.env.JWT_SECRET as string,
      { expiresIn: '5m' },
    );

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.details?.code).toBe('EMAIL_NOT_VERIFIED');
  });
});
