import { rateLimit, ipKeyGenerator, Options } from 'express-rate-limit';
import { Request } from 'express';
import { rateLimitingEnabled } from '../config/env';

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function jsonMessage(message: string) {
  return { success: false, message };
}

/** Email or phone identifying an OTP account, for per-account limits. */
function otpIdentity(req: Request): string {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim().toLowerCase() : '';
  return email || phone || '';
}

/** Shared base options applied to every limiter. */
function baseOptions(
  message: string,
  limit: number,
  keyGenerator: (req: Request) => string,
): Partial<Options> {
  return {
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: jsonMessage(message),
    // The automated suite shares one in-memory store; disable limits there.
    skip: () => !rateLimitingEnabled,
    keyGenerator,
  };
}

/**
 * Guards POST /auth/login against credential brute-forcing. Keyed by client
 * IP **and** the submitted phone number so one account can be targeted by
 * attempts from a single address, while different users behind the same NAT
 * are unaffected.
 */
export const loginLimiter = rateLimit(
  baseOptions('Too many sign-in attempts. Please wait a few minutes and try again.', 10, (req) => {
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim().toLowerCase() : '';
    return `${ipKeyGenerator(req.ip ?? '')}|${phone}`;
  }),
);

/**
 * Guards POST /auth/register against mass account creation, keyed by client IP.
 */
export const registerLimiter = rateLimit(
  baseOptions(
    'Too many accounts created from this address. Please try again later.',
    20,
    (req) => ipKeyGenerator(req.ip ?? ''),
  ),
);

/**
 * Guards POST /auth/verify-email against OTP brute-forcing, keyed by client
 * IP **and** the email or phone number identifying the account.
 */
export const verifyEmailLimiter = rateLimit(
  baseOptions(
    'Too many verification attempts. Please wait a few minutes and try again.',
    30,
    (req) => `${ipKeyGenerator(req.ip ?? '')}|${otpIdentity(req)}`,
  ),
);

/**
 * Guards POST /auth/resend-otp, keyed by client IP **and** the email or phone
 * number identifying the account. A tighter per-account cooldown is
 * additionally enforced in the service.
 */
export const resendOtpLimiter = rateLimit(
  baseOptions(
    'Too many code requests. Please wait a few minutes and try again.',
    10,
    (req) => `${ipKeyGenerator(req.ip ?? '')}|${otpIdentity(req)}`,
  ),
);

/**
 * Strict limit for POST /auth/forgot-password, keyed by client IP **and**
 * the submitted email address so one address (or one attacker) cannot be
 * spammed, while different users behind the same NAT are unaffected.
 */
export const forgotPasswordLimiter = rateLimit(
  baseOptions(
    'Too many password-reset requests. Please wait a few minutes and try again.',
    5,
    (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      return `${ipKeyGenerator(req.ip ?? '')}|${email}`;
    },
  ),
);

/**
 * Guards POST /auth/reset-password and POST /auth/validate-reset-token
 * against token brute-forcing (keyed by client IP).
 */
export const resetPasswordLimiter = rateLimit(
  baseOptions(
    'Too many attempts. Please wait a few minutes and try again.',
    30,
    (req) => ipKeyGenerator(req.ip ?? ''),
  ),
);
