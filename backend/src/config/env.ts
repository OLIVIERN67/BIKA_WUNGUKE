import dotenv from 'dotenv';

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

const INSECURE_SECRET_PLACEHOLDERS = new Set([
  'dev_only_change_me',
  'change_this_to_a_long_random_secret',
  'secret',
  'changeme',
]);

/**
 * Refuses to start in production with a missing, placeholder or too-short
 * JWT secret. In development the fallback is allowed so the app runs locally.
 */
function resolveJwtSecret(nodeEnv: string): string {
  const secret = process.env.JWT_SECRET ?? '';
  if (nodeEnv !== 'production') {
    return secret || 'dev_only_change_me';
  }
  if (!secret || secret.length < 32 || INSECURE_SECRET_PLACEHOLDERS.has(secret)) {
    throw new Error(
      'JWT_SECRET must be set to a unique random value of at least 32 characters in production.',
    );
  }
  return secret;
}

/**
 * Turns off HTTP rate limiting when running the automated suite, which shares
 * one in-memory store across tests. Production and development are untouched.
 */
export const rateLimitingEnabled = (process.env.NODE_ENV ?? 'development') !== 'test';

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  db: {
    host: required('PGHOST', 'localhost'),
    port: Number(process.env.PGPORT ?? 5432),
    user: required('PGUSER', 'postgres'),
    password: process.env.PGPASSWORD ?? '',
    name: required('PGDATABASE', 'bika_wunguke'),
    sslMode: (process.env.PGSSLMODE ?? 'prefer').toLowerCase(),
    channelBinding: (process.env.PGCHANNELBINDING ?? 'prefer').toLowerCase(),
    schema: (process.env.PGSCHEMA ?? 'public').trim() || 'public',
  },
  jwt: {
    secret: resolveJwtSecret(nodeEnv),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  isProd: nodeEnv === 'production',
  /**
   * Number of trusted reverse proxies in front of the app. Needed so
   * express-rate-limit keys on the real client IP (X-Forwarded-For) instead
   * of the proxy address. Set TRUST_PROXY to the hop count, `true`, or leave
   * empty to disable. Defaults to 1 in production.
   */
  trustProxy: (() => {
    const raw = (process.env.TRUST_PROXY ?? '').trim();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (/^\d+$/.test(raw)) return Number(raw);
    return nodeEnv === 'production' ? 1 : false;
  })(),
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    // Port 587 uses STARTTLS (secure=false); port 465 uses implicit TLS.
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: bool(process.env.SMTP_SECURE, Number(process.env.SMTP_PORT ?? 465) === 465),
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
  },
  emailFrom: process.env.EMAIL_FROM ?? '',
  /**
   * Friendly display name shown next to the from address, e.g.
   * `BIKA WUNGUKE <no-reply@example.com>`. Helps inbox placement.
   */
  emailFromName: process.env.EMAIL_FROM_NAME ?? 'BIKA WUNGUKE',
  /** Optional Reply-To; defaults to the from address when unset. */
  emailReplyTo: process.env.EMAIL_REPLY_TO ?? '',
  /**
   * Trusted frontend origin used to build password-reset links.
   * Never taken from the request Host header.
   */
  frontendUrl: (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
};

export const smtpConfigured = Boolean(env.smtp.host && env.emailFrom);
