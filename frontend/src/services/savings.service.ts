import { api, unwrap } from './api';
import {
  Paginated,
  Savings,
  SavingsGoalProgress,
  SavingsGoalStatus,
  SavingsSummary,
  SavingsType,
} from '../types';

export interface SavingsPayload {
  type: SavingsType;
  amount: number;
  goal?: string;
  goal_id?: number | null;
  note?: string;
  saving_date: string;
}

export interface SavingsQuery {
  type?: SavingsType;
  goal?: string;
  goal_id?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface SavingsGoalPayload {
  name: string;
  target_amount: number;
  target_date?: string | null;
  status?: SavingsGoalStatus;
}

export function listSavings(query: SavingsQuery = {}): Promise<Paginated<Savings>> {
  return unwrap(api.get('/savings', { params: query }));
}

export function getSavingsSummary(): Promise<SavingsSummary> {
  return unwrap(api.get('/savings/summary'));
}

export function createSavings(payload: SavingsPayload): Promise<Savings> {
  return unwrap(api.post('/savings', payload));
}

export function updateSavings(id: number, payload: Partial<SavingsPayload>): Promise<Savings> {
  return unwrap(api.put(`/savings/${id}`, payload));
}

export function deleteSavings(id: number): Promise<null> {
  return unwrap(api.delete(`/savings/${id}`));
}

// --- Savings goals ---

export function listGoals(): Promise<SavingsGoalProgress[]> {
  return unwrap(api.get('/savings/goals'));
}

export function createGoal(payload: SavingsGoalPayload): Promise<SavingsGoalProgress> {
  return unwrap(api.post('/savings/goals', payload));
}

export function updateGoal(
  id: number,
  payload: Partial<SavingsGoalPayload>,
): Promise<SavingsGoalProgress> {
  return unwrap(api.put(`/savings/goals/${id}`, payload));
}

export function deleteGoal(id: number): Promise<null> {
  return unwrap(api.delete(`/savings/goals/${id}`));
}
