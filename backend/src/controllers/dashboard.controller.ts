import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import * as summaryService from '../services/summary.service';
import * as authService from '../services/auth.service';
import { ok } from '../utils/response';
import { ApiError } from '../utils/api-error';

function parseOptionalDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !isISODate(value)) {
    throw ApiError.badRequest(`"${field}" must use the YYYY-MM-DD format`);
  }
  return value;
}

function parseRange(req: Request): dashboardService.DashboardRange {
  const from = parseOptionalDate(req.query.from, 'from');
  const to = parseOptionalDate(req.query.to, 'to');
  if (from && to && from > to) {
    throw ApiError.badRequest('"from" must be on or before "to"');
  }
  return { from, to };
}

/** Parses a query parameter into a clamped integer, falling back on garbage. */
function toInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function firstOfMonthISO(): string {
  const d = new Date();
  return localISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

function todayISO(): string {
  return localISO(new Date());
}

function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Reads and validates the `from`/`to` range used by period summaries.
 * Omitting both falls back to the current month; anything else must be
 * a well-formed ISO range with `from` on or before `to`.
 */
function parseRequiredRange(req: Request): summaryService.PeriodRange {
  const rawFrom = req.query.from as string | undefined;
  const rawTo = req.query.to as string | undefined;

  if (!rawFrom && !rawTo) {
    return { from: firstOfMonthISO(), to: todayISO() };
  }
  if (!rawFrom || !rawTo) {
    throw ApiError.badRequest('Provide both "from" and "to" dates, or neither');
  }
  if (!isISODate(rawFrom) || !isISODate(rawTo)) {
    throw ApiError.badRequest('Dates must use the YYYY-MM-DD format');
  }
  if (rawFrom > rawTo) {
    throw ApiError.badRequest('"from" must be on or before "to"');
  }
  return { from: rawFrom, to: rawTo };
}

export async function summary(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await dashboardService.summary(req.user.id, parseRange(req));
  return ok(res, result);
}

export async function trend(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const days = toInt(req.query.days, 30, 1, 365);
  const result = await dashboardService.trend(req.user.id, days, parseRange(req));
  return ok(res, result);
}

export async function monthly(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const months = toInt(req.query.months, 6, 1, 24);
  const result = await dashboardService.monthly(req.user.id, months);
  return ok(res, result);
}

export async function categoryBreakdown(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const rawType = req.query.type;
  if (rawType !== undefined && rawType !== 'income' && rawType !== 'expense') {
    throw ApiError.badRequest('"type" must be either "income" or "expense"');
  }
  const type = (rawType as 'income' | 'expense') ?? 'expense';
  const { from, to } = parseRange(req);
  const result = await dashboardService.categoryBreakdown(req.user.id, type, from, to);
  return ok(res, result);
}

export async function recent(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const limit = toInt(req.query.limit, 5, 1, 50);
  const result = await dashboardService.recentTransactions(req.user.id, limit);
  return ok(res, result);
}

export async function savingsGoals(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await dashboardService.savingsGoals(req.user.id);
  return ok(res, result);
}

export async function periodSummary(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await summaryService.periodSummary(req.user.id, parseRequiredRange(req));
  return ok(res, result);
}

export async function observations(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getProfile(req.user.id);
  const result = await summaryService.observations(
    req.user.id,
    parseRequiredRange(req),
    user.currency,
  );
  return ok(res, result);
}
