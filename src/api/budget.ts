import request from './request';
import type { Budget } from '@/types/budget';

export function getBudgets() {
  return request.get('/budgets');
}

export function createBudget(data: Partial<Budget>) {
  return request.post('/budgets', data);
}

export function updateBudget(id: string, data: Partial<Budget>) {
  return request.put(`/budgets/${id}`, data);
}

export function deleteBudget(id: string) {
  return request.delete(`/budgets/${id}`);
}
