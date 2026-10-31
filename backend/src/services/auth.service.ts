import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, RowDataPacket, ResultSetHeader } from '../config/database';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { PublicUser, User } from '../types';
import {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '../validators/auth.validator';
import { seedDefaultCategories } from './category.service';
import { issueEmailOtp, maskEmail } from './email-verification.service';
import { normalizeEmail } from '../utils/email';

const SALT_ROUNDS = 10;

function toPublicUser(user: User): PublicUser {
  const { password_hash, token_version: _tokenVersion, ...rest } = user;
  return rest;
}

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/.test(value);
}

/**
 * Compares a plaintext password against the stored bcrypt hash. Only bcrypt
 * hashes are accepted; plaintext or malformed values never match.
 */
async function passwordMatches(plainPassword: string, storedPassword: string): Promise<boolean> {
  if (!isBcryptHash(storedPassword)) return false;
  try {
    return await bcrypt.compare(plainPassword, storedPassword);
  } catch {
    return false;
  }
}

export function signToken(user: User): string {
  return jwt.sign(
    { sub: user.id, phone: user.phone, tv: user.token_version ?? 0 },
    env.jwt.secret,
    {
      expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    },
  );
}

export function publicUser(user: User): PublicUser {
  return toPublicUser(user);
}

export async function register(input: RegisterInput) {
  const email = input.email ? normalizeEmail(input.email) : '';

  const [existingPhone] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM users WHERE phone = ? LIMIT 1',
    [input.phone],
  );
  if (existingPhone.length > 0) {
    throw ApiError.conflict('An account with this phone number already exists.');
  }
  if (email) {
    const [existingEmail] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email],
    );
    if (existingEmail.length > 0) {
      throw ApiError.conflict('An account with this email address already exists.');
    }
  }

  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (full_name, phone, email, password_hash, business_name, business_type, business_location, business_description, currency, locale, email_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        input.full_name,
        input.phone,
        email ? email : null,
        password_hash,
        input.business_name || null,
        input.business_type || null,
        input.business_location || null,
        input.business_description || null,
        input.currency || 'RWF',
        input.locale || 'rw',
        0,
      ],
    );

    const userId = result.insertId;
    await seedDefaultCategories(userId);

    const user = await findById(userId);
    if (!user) throw ApiError.internal('Failed to create user');

    // Send the verification code. The account already exists, so a delivery
    // failure must not fail registration (the user can resend) — but we report
    // it honestly instead of pretending the email went out.
    let otpSent = false;
    if (user.email) {
      try {
        await issueEmailOtp(user);
        otpSent = true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 429) throw error;
        otpSent = false;
      }
    }

    return { user: toPublicUser(user), verificationRequired: true, otpSent };
  } catch (error) {
    // Keep the unique indexes as the source of truth if two requests race.
    const dbError = error as { code?: string; message?: string; constraint?: string };
    if (dbError?.code === '23505') {
      const detail = `${dbError.constraint ?? ''} ${dbError.message ?? ''}`;
      if (detail.includes('uq_users_email')) {
        throw ApiError.conflict('An account with this email address already exists.');
      }
      if (detail.includes('uq_users_phone')) {
        throw ApiError.conflict('An account with this phone number already exists.');
      }
    }
    throw error;
  }
}

/** Result of a successful credential check that still needs an email OTP. */
export interface LoginVerificationRequired {
  user: PublicUser;
  verificationRequired: true;
  otpSent: boolean;
  maskedEmail: string | null;
}

export type LoginResult =
  | { user: PublicUser; token: string; verificationRequired?: false }
  | LoginVerificationRequired;

/**
 * Authenticates the first factor by phone + password. No account receives a
 * session until the registered email OTP is verified. Wrong credentials never
 * send an email.
 */
export async function login(input: LoginInput): Promise<LoginResult> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM users WHERE phone = ? LIMIT 1',
    [input.phone],
  );
  const user = rows[0] as User | undefined;
  if (!user) throw ApiError.unauthorized('Wrong phone number or password.');

  const match = await passwordMatches(input.password, user.password_hash);
  if (!match) throw ApiError.unauthorized('Wrong phone number or password.');

  if (!user.email) {
    throw new ApiError(
      403,
      user.email_verified
        ? 'This account has no email address available for sign-in verification.'
        : 'Please verify your email address to continue.',
      { code: 'EMAIL_NOT_VERIFIED', email: null },
    );
  }

  const maskedEmail = maskEmail(user.email) ?? user.email;
  let otpSent = false;
  try {
    // A valid password is required before issuing this second-factor code.
    await issueEmailOtp(user);
    otpSent = true;
  } catch (error) {
    // Do not issue a token when email delivery fails.
    if (!(error instanceof ApiError)) throw error;
  }

  return {
    user: toPublicUser(user),
    verificationRequired: true,
    otpSent,
    maskedEmail,
  };
}

export async function findById(id: number): Promise<User | undefined> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] as User | undefined;
}

export async function getProfile(id: number): Promise<PublicUser> {
  const user = await findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return toPublicUser(user);
}

export async function updateProfile(
  id: number,
  input: UpdateProfileInput,
): Promise<PublicUser & { otpSent?: boolean }> {
  const user = await findById(id);
  if (!user) throw ApiError.notFound('User not found');

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.full_name !== undefined) {
    fields.push('full_name = ?');
    values.push(input.full_name);
  }

  let newEmail: string | null | undefined;
  let emailChanged = false;
  if (input.email !== undefined) {
    newEmail = input.email ? normalizeEmail(input.email) : null;
    emailChanged = (newEmail ?? null) !== (user.email ?? null);
    if (emailChanged) {
      if (newEmail) {
        const [dupe] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
          [newEmail, id],
        );
        if (dupe.length > 0) {
          throw ApiError.conflict('An account with this email address already exists.');
        }
      }
      fields.push('email = ?');
      values.push(newEmail);
      // A changed address must be re-verified; clearing verification also
      // makes the account unusable for login until the new address is proven.
      fields.push('email_verified = ?');
      values.push(0);
    }
  }

  if (input.business_name !== undefined) {
    fields.push('business_name = ?');
    values.push(input.business_name || null);
  }
  if (input.business_type !== undefined) {
    fields.push('business_type = ?');
    values.push(input.business_type || null);
  }
  if (input.business_location !== undefined) {
    fields.push('business_location = ?');
    values.push(input.business_location || null);
  }
  if (input.business_description !== undefined) {
    fields.push('business_description = ?');
    values.push(input.business_description || null);
  }
  if (input.currency !== undefined) {
    fields.push('currency = ?');
    values.push(input.currency);
  }
  if (input.locale !== undefined) {
    fields.push('locale = ?');
    values.push(input.locale);
  }

  if (fields.length > 0) {
    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  const updated = await findById(id);
  let otpSent: boolean | undefined;
  if (emailChanged && updated?.email) {
    try {
      await issueEmailOtp(updated);
      otpSent = true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) throw error;
      otpSent = false;
    }
  }

  const profile = await getProfile(id);
  return otpSent === undefined ? profile : { ...profile, otpSent };
}

export async function changePassword(id: number, input: ChangePasswordInput): Promise<void> {
  const user = await findById(id);
  if (!user) throw ApiError.notFound('User not found');

  const match = await passwordMatches(input.current_password, user.password_hash);
  if (!match) throw ApiError.badRequest('Current password is incorrect.');

  const password_hash = await bcrypt.hash(input.new_password, SALT_ROUNDS);
  // Bump token_version so every outstanding JWT for this user is rejected.
  await pool.query(
    'UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?',
    [password_hash, id],
  );
}
