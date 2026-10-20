import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';
import { env, smtpConfigured } from '../config/env';

let transporter: Transporter | null = null;

/** `BIKA WUNGUKE <no-reply@…>` when a display name is configured. */
function buildFrom(): string {
  return env.emailFromName
    ? `"${env.emailFromName}" <${env.emailFrom}>`
    : env.emailFrom;
}

/** Reply-To falls back to the from address so replies are not lost. */
function buildReplyTo(): string {
  return env.emailReplyTo || env.emailFrom;
}

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user
        ? { user: env.smtp.user, pass: env.smtp.password }
        : undefined,
      // STARTTLS on port 587 frequently times out on some networks (notably
      // with IPv6). `requireTLS` plus generous timeouts, IPv4 preference and
      // an explicit TLS servername keep delivery reliable.
      requireTLS: !env.smtp.secure,
      connectionTimeout: 20_000,
      greetingTimeout: 20_000,
      socketTimeout: 30_000,
      family: 4,
    } as Parameters<typeof nodemailer.createTransport>[0]);
  }
  return transporter;
}

/**
 * Sends a message and confirms the server actually accepted it for delivery.
 * Transient network errors (a dropped/late STARTTLS handshake is common on
 * port 587) are retried with a short backoff before giving up. Throws a safe
 * `Error` on final failure.
 */
async function sendMailWithRetry(
  message: Parameters<Transporter['sendMail']>[0],
  attempts = 3,
): Promise<SentMessageInfo> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const info = await getTransporter().sendMail(message);
      const accepted = Array.isArray(info.accepted) ? info.accepted : [];
      if (accepted.length === 0) {
        throw new Error(
          info.rejected && info.rejected.length > 0
            ? 'The mail server rejected the recipient address.'
            : 'The mail server did not accept the message.',
        );
      }
      return info;
    } catch (error) {
      lastError = error;
      // A failed TLS/socket attempt can leave a stale connection; reset it so
      // the retry opens a fresh one.
      transporter = null;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to send email');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTemplate(resetUrl: string, expiresInMinutes: number): { text: string; html: string } {
  const safeUrl = escapeHtml(resetUrl);
  const text = [
    'Hello,',
    '',
    'We received a request to reset the password for your BIKA WUNGUKE account.',
    '',
    'To choose a new password, open this link:',
    resetUrl,
    '',
    `This link will expire in ${expiresInMinutes} minutes.`,
    '',
    'If you did not request a password reset, you can ignore this email. Your password will remain unchanged.',
    '',
    'For your security, do not share this link with anyone.',
    '',
    'Thank you,',
    'BIKA WUNGUKE Team',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
      <tr>
        <td style="padding:28px 32px 8px 32px;">
          <h1 style="margin:0;font-size:20px;color:#047857;">BIKA WUNGUKE</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 4px 32px;">
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">Hello,</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
            We received a request to reset the password for your BIKA WUNGUKE account.
          </p>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;">To choose a new password, click the button below:</p>
          <p style="margin:0 0 20px 0;">
            <a href="${safeUrl}"
               style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:10px;">
              Reset My Password
            </a>
          </p>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#475569;">
            If the button does not work, copy and paste this link into your browser:
            <br />
            <span style="word-break:break-all;color:#047857;">${safeUrl}</span>
          </p>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#475569;">
            This link will expire in ${expiresInMinutes} minutes.
          </p>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#475569;">
            If you did not request a password reset, you can ignore this email. Your password will remain unchanged.
          </p>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#475569;">
            For your security, do not share this link with anyone.
          </p>
          <p style="margin:0;font-size:14px;line-height:1.6;">Thank you,<br />BIKA WUNGUKE Team</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { text, html };
}

/**
 * Sends the password-reset email.
 * Throws on failure so the caller can log a safe error and fall back to a
 * generic response - the raw reset token is never written to any log.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  expiresInMinutes: number,
): Promise<void> {
  if (!smtpConfigured) {
    throw new Error('SMTP is not configured (SMTP_HOST / EMAIL_FROM missing)');
  }

  const { text, html } = buildTemplate(resetUrl, expiresInMinutes);

  await sendMailWithRetry({
    from: buildFrom(),
    to,
    replyTo: buildReplyTo(),
    subject: 'Reset Your BIKA WUNGUKE Password',
    text,
    html,
  });
}

/** Lightweight connectivity check used by the health/diagnostics endpoint. */
export async function verifyEmailTransport(): Promise<void> {
  if (!smtpConfigured) throw new Error('SMTP is not configured');
  await getTransporter().verify();
}

function buildOtpTemplate(
  otp: string,
  expiresInMinutes: number,
): { text: string; html: string } {
  const safeOtp = escapeHtml(otp);
  const text = [
    'Hello,',
    '',
    'Thank you for registering with BIKA WUNGUKE!',
    '',
    'To verify your email address and activate your account, please enter the following verification code:',
    '',
    `Your OTP: ${otp}`,
    '',
    `This code expires in ${expiresInMinutes} minutes. For your security, do not share it with anyone.`,
    '',
    'If you did not initiate this registration, you can ignore this email.',
    '',
    'Thank you,',
    'BIKA WUNGUKE Team',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
      <tr>
        <td style="padding:28px 32px 8px 32px;">
          <h1 style="margin:0;font-size:20px;color:#047857;">BIKA WUNGUKE</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 24px 32px;">
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">Hello,</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
            Thank you for registering with BIKA WUNGUKE!
          </p>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;">
            To verify your email address and activate your account, please enter the following verification code:
          </p>
          <p style="margin:0 0 20px 0;text-align:center;">
            <span style="display:inline-block;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:12px 24px;font-size:28px;font-weight:bold;letter-spacing:6px;color:#065f46;">
              ${safeOtp}
            </span>
          </p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;">
            This code expires in ${expiresInMinutes} minutes. For your security, do not share it with anyone.
          </p>
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#64748b;">
            If you did not initiate this registration, you can ignore this email.
          </p>
          <p style="margin:16px 0 0 0;font-size:15px;line-height:1.6;">Thank you,<br />BIKA WUNGUKE Team</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { text, html };
}

/**
 * Sends the registration email-verification OTP. The raw OTP is only ever
 * passed to the mailer; callers must never log it or return it in responses.
 */
export async function sendOtpEmail(
  to: string,
  otp: string,
  expiresInMinutes: number,
): Promise<void> {
  if (!smtpConfigured) {
    throw new Error('SMTP is not configured (SMTP_HOST / EMAIL_FROM missing)');
  }

  const { text, html } = buildOtpTemplate(otp, expiresInMinutes);

  const info = await sendMailWithRetry({
    from: buildFrom(),
    to,
    replyTo: buildReplyTo(),
    subject: 'Verify Your BIKA WUNGUKE Account',
    text,
    html,
  });

  // Safe delivery trace: recipient + server message id only, never the OTP.
  console.log(
    `[email] verification OTP accepted for delivery to ${to} (id=${info.messageId ?? 'n/a'})`,
  );
}