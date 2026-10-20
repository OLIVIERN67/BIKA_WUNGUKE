import { api, unwrap } from './api';
import { Category, Paginated, Transaction, TransactionType } from '../types';

export interface TransactionPayload {
  type: TransactionType;
  amount: number;
  category_id?: number | null;
  description?: string;
  payment_method?: string;
  txn_date: string;
}

export interface TransactionQuery {
  type?: TransactionType;
  category_id?: number;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: 'txn_date' | 'amount' | 'created_at';
  order?: 'asc' | 'desc';
}

export function listTransactions(query: TransactionQuery = {}): Promise<Paginated<Transaction>> {
  return unwrap(api.get('/transactions', { params: query }));
}

export function getTransaction(id: number): Promise<Transaction> {
  return unwrap(api.get(`/transactions/${id}`));
}

export function createTransaction(payload: TransactionPayload): Promise<Transaction> {
  return unwrap(api.post('/transactions', payload));
}

export function updateTransaction(id: number, payload: Partial<TransactionPayload>): Promise<Transaction> {
  return unwrap(api.put(`/transactions/${id}`, payload));
}

export function deleteTransaction(id: number): Promise<null> {
  return unwrap(api.delete(`/transactions/${id}`));
}

export function listCategories(type?: TransactionType): Promise<Category[]> {
  return unwrap(api.get('/categories', { params: type ? { type } : {} }));
}
