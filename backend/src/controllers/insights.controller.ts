import { Request, Response } from 'express';
import * as insightsService from '../services/insights.service';
import { ok } from '../utils/response';
import { ApiError } from '../utils/api-error';

export async function summary(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const from = req.query.from as string;
  const to = req.query.to as string;
  const result = await insightsService.generateFullInsights(req.user.id, from, to);
  return ok(res, result);
}

export async function expenses(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const from = req.query.from as string;
  const to = req.query.to as string;
  const summary = await insightsService.getPeriodSummary(req.user.id, from, to);
  const expenseInsights = await insightsService.getExpenseInsights(req.user.id, from, to);
  const comparison = await insightsService.getComparison(req.user.id, from, to);
  return ok(res, { summary, expenseInsights, comparison });
}

export async function savings(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const savingsInsights = await insightsService.getSavingsInsights(req.user.id);
  return ok(res, savingsInsights);
}

export async function loanReadiness(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const from = req.query.from as string;
  const to = req.query.to as string;
  const summary = await insightsService.getPeriodSummary(req.user.id, from, to);
  const savingsInsights = await insightsService.getSavingsInsights(req.user.id);
  const history = await insightsService.getHistoryLength(req.user.id);
  const result = await insightsService.generateLoanReadiness(req.user.id, from, to, summary, savingsInsights, history);
  return ok(res, result);
}
