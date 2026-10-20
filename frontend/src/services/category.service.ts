import { api, unwrap } from './api';
import { Category, TransactionType } from '../types';

export interface CategoryPayload {
  name: string;
  type: TransactionType;
  color?: string;
}

export function listCategories(type?: TransactionType): Promise<Category[]> {
  return unwrap(api.get('/categories', { params: type ? { type } : {} }));
}

export function createCategory(payload: CategoryPayload): Promise<Category> {
  return unwrap(api.post('/categories', payload));
}

export function updateCategory(id: number, payload: Partial<CategoryPayload>): Promise<Category> {
  return unwrap(api.put(`/categories/${id}`, payload));
}

export function deleteCategory(id: number): Promise<null> {
  return unwrap(api.delete(`/categories/${id}`));
}
