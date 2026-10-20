import { Request, Response } from 'express';
import * as transactionService from '../services/transaction.service';
import { ok } from '../utils/response';
import { ApiError } from '../utils/api-error';
import {
  CreateTransactionInput,
  ListTransactionQuery,
  UpdateTransactionInput,
} from '../validators/transaction.validator';

export async function list(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const query = req.query as unknown as ListTransactionQuery;
  const result = await transactionService.list(req.user.id, query);
  return ok(res, result);
}

export async function getOne(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await transactionService.getById(req.user.id, Number(req.params.id));
  return ok(res, result);
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await transactionService.create(req.user.id, req.body as CreateTransactionInput);
  return ok(res, result, 'Record saved', 201);
}

export async function update(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await transactionService.update(
    req.user.id,
    Number(req.params.id),
    req.body as UpdateTransactionInput,
  );
  return ok(res, result, 'Record updated');
}

export async function remove(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  await transactionService.remove(req.user.id, Number(req.params.id));
  return ok(res, null, 'Record deleted');
}
