import { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export function ok<T>(
  res: Response,
  data: T,
  message?: string,
  status = 200,
): Response {
  const body: ApiSuccess<T> = { success: true, data };
  if (message) body.message = message;
  return res.status(status).json(body);
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
