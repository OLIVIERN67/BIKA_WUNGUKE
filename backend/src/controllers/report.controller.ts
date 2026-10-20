import { Request, Response } from 'express';
import * as reportService from '../services/report.service';
import * as authService from '../services/auth.service';
import * as savingsService from '../services/savings.service';
import * as dashboardService from '../services/dashboard.service';
import { ok } from '../utils/response';
import { ApiError } from '../utils/api-error';

function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseOptionalDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !isISODate(value)) {
    throw ApiError.badRequest(`"${field}" must use the YYYY-MM-DD format`);
  }
  return value;
}

function parseRange(req: Request): reportService.ReportRange {
  const from = parseOptionalDate(req.query.from, 'from');
  const to = parseOptionalDate(req.query.to, 'to');
  if (from && to && from > to) {
    throw ApiError.badRequest('"from" must be on or before "to"');
  }

  const rawType = req.query.type;
  if (rawType !== undefined && rawType !== 'income' && rawType !== 'expense') {
    throw ApiError.badRequest('"type" must be either "income" or "expense"');
  }

  return { from, to, type: rawType as 'income' | 'expense' | undefined };
}

export async function json(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const rows = await reportService.fetchTransactions(req.user.id, parseRange(req));
  const totals = reportService.computeTotals(rows);
  return ok(res, { rows, totals });
}

export async function csv(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const rows = await reportService.fetchTransactions(req.user.id, parseRange(req));
  const csv = reportService.toCsv(rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bika-wunguke-report.csv"');
  res.send(csv);
}

export async function pdf(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const range = parseRange(req);
  const [user, rows, savings, incomeCats, expenseCats] = await Promise.all([
    authService.getProfile(req.user.id),
    reportService.fetchTransactions(req.user.id, range),
    savingsService.summary(req.user.id),
    dashboardService.categoryBreakdown(req.user.id, 'income', range.from, range.to),
    dashboardService.categoryBreakdown(req.user.id, 'expense', range.from, range.to),
  ]);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="bika-wunguke-report.pdf"');

  reportService.streamPdf(res, rows, {
    traderName: user.full_name,
    businessName: user.business_name,
    businessType: user.business_type,
    businessLocation: user.business_location,
    businessDescription: user.business_description,
    currency: user.currency,
    from: range.from,
    to: range.to,
    savings: {
      deposits: savings.total_deposits,
      withdrawals: savings.total_withdrawals,
      balance: savings.balance,
    },
    incomeByCategory: incomeCats,
    expenseByCategory: expenseCats,
  });
}
