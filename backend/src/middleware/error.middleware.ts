import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/api-error';
import { env } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // MySQL duplicate-key error
  const anyErr = err as {
    code?: string;
    errno?: number;
    type?: string;
    message?: string;
  };
  if (anyErr?.code === 'ER_DUP_ENTRY') {
    res.status(409).json({ success: false, message: 'A record with that value already exists.' });
    return;
  }

  // Foreign-key reference missing (e.g. a category that no longer exists)
  if (anyErr?.code === 'ER_NO_REFERENCED_ROW_2') {
    res.status(409).json({
      success: false,
      message: 'A record this item refers to no longer exists.',
    });
    return;
  }

  // Malformed JSON body (body-parser raises a SyntaxError with a `type`)
  if (anyErr?.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'Invalid JSON in request body.' });
    return;
  }

  // Request body above the configured limit
  if (anyErr?.type === 'entity.too.large') {
    res.status(413).json({ success: false, message: 'Request body is too large.' });
    return;
  }

  if (anyErr?.type === 'encoding.unsupported') {
    res.status(415).json({ success: false, message: 'Unsupported request encoding.' });
    return;
  }

  // Database unreachable - the API is up but cannot serve data
  const dbDown =
    anyErr?.code === 'ECONNREFUSED' ||
    anyErr?.code === 'PROTOCOL_CONNECTION_LOST' ||
    anyErr?.code === 'ETIMEDOUT' ||
    anyErr?.code === 'ER_CON_COUNT_ERROR' ||
    anyErr?.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR';
  if (dbDown) {
    console.error('[error] database unavailable', err);
    res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Please try again shortly.',
    });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(env.isProd ? {} : { error: anyErr?.message }),
  });
}
