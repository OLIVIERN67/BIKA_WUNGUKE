import { Request, Response } from 'express';
import * as categoryService from '../services/category.service';
import { ok } from '../utils/response';
import { ApiError } from '../utils/api-error';
import {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../validators/category.validator';

export async function list(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const rawType = req.query.type;
  if (rawType !== undefined && rawType !== 'income' && rawType !== 'expense') {
    throw ApiError.badRequest('"type" must be either "income" or "expense"');
  }
  const type = rawType as 'income' | 'expense' | undefined;
  const result = await categoryService.list(req.user.id, type);
  return ok(res, result);
}

export async function create(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await categoryService.create(req.user.id, req.body as CreateCategoryInput);
  return ok(res, result, 'Category created', 201);
}

export async function update(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const result = await categoryService.update(
    req.user.id,
    Number(req.params.id),
    req.body as UpdateCategoryInput,
  );
  return ok(res, result, 'Category updated');
}

export async function remove(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  await categoryService.remove(req.user.id, Number(req.params.id));
  return ok(res, null, 'Category deleted');
}
