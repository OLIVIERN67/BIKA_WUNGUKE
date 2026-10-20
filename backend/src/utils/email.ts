/**
 * Canonical email handling: trimmed and lower-cased so lookups and the
 * `uq_users_email` constraint behave consistently everywhere.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Masks an email for display, e.g. `alice@example.com` -> `al***@example.com`. */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}
