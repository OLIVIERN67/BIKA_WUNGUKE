import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RowDataPacket } from 'mysql2';
import { z } from 'zod';
import { pool } from '../config/database';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';

const tokenPayloadSchema = z.object({
  sub: z.union([z.number(), z.string()]),
  phone: z.string().optional(),
  tv: z.number().optional(),
});

/**
 * Verifies the JWT and confirms it was issued for the current
 * users.token_version. Bumping token_version (password change/reset)
 * therefore invalidates every previously issued token.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(ApiError.unauthorized('Missing or invalid authorization token'));
    return;
  }

  const token = header.slice(7);

  let payload: unknown;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
    return;
  }

  const parsed = tokenPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    next(ApiError.unauthorized('Invalid or expired token'));
    return;
  }

  const userId = Number(parsed.data.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    next(ApiError.unauthorized('Invalid or expired token'));
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT token_version, email_verified FROM users WHERE id = ? LIMIT 1',
      [userId],
    );
    const user = rows[0] as { token_version?: number; email_verified?: number } | undefined;

    if (!user || (parsed.data.tv ?? -1) !== (user.token_version ?? 0)) {
      next(ApiError.unauthorized('Session expired. Please log in again.'));
      return;
    }

    // Defence in depth: an unverified account must never reach protected
    // features, even if it somehow obtained a token.
    if (!user.email_verified) {
      next(
        new ApiError(403, 'Please verify your email address to continue.', {
          code: 'EMAIL_NOT_VERIFIED',
        }),
      );
      return;
    }

    req.user = { id: userId, phone: parsed.data.phone ?? '' };
    next();
  } catch (error) {
    next(error);
  }
}
