import { Request, Response } from 'express';
import * as savingsService from '../services/savings.service';
import { ok } from '../utils/response';
import { ApiError } from '../utils/api-error';
import {
  CreateSavingsInput,
  ListSavingsQuery,
  UpdateSavingsInput,
} from '../validators/savings.validator';
import { CreateGoalInput, UpdateGoalInput } from '../validators/goal.validator';

export async function list(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const query = req.query as unknown as ListSavingsQuery;
  const result = await savingsService.list(req.user.id, query);
  return ok(res, result);
}

export async function summary(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await savingsService.summary(req.user.id);
  return ok(res, result);
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await savingsService.create(req.user.id, req.body as CreateSavingsInput);
  return ok(res, result, 'Savings record saved', 201);
}

export async function update(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await savingsService.update(
    req.user.id,
    Number(req.params.id),
    req.body as UpdateSavingsInput,
  );
  return ok(res, result, 'Savings record updated');
}

export async function remove(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  await savingsService.remove(req.user.id, Number(req.params.id));
  return ok(res, null, 'Savings record deleted');
}

export async function listGoals(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await savingsService.listGoals(req.user.id);
  return ok(res, result);
}

export async function getGoal(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await savingsService.getGoal(req.user.id, Number(req.params.id));
  return ok(res, result);
}

export async function createGoal(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await savingsService.createGoal(req.user.id, req.body as CreateGoalInput);
  return ok(res, result, 'Savings goal created', 201);
}

export async function updateGoal(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await savingsService.updateGoal(
    req.user.id,
    Number(req.params.id),
    req.body as UpdateGoalInput,
  );
  return ok(res, result, 'Savings goal updated');
}

export async function removeGoal(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  await savingsService.removeGoal(req.user.id, Number(req.params.id));
  return ok(res, null, 'Savings goal deleted');
}
