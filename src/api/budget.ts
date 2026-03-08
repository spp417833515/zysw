import request from './request';
import type { Budget } from '@/types/budget';
import type { ApiResponse } from '@/types/common';

export function getBudgets() {
  return request.get<ApiResponse<Budget[]>>('/budgets');
}

export function createBudget(data: Partial<Budget>) {
  return request.post<ApiResponse<Budget>>('/budgets', data);
}

export function updateBudget(id: string, data: Partial<Budget>) {
  return request.put<ApiResponse<Budget>>(`/budgets/${id}`, data);
}

export function deleteBudget(id: string) {
  return request.delete<ApiResponse<null>>(`/budgets/${id}`);
}
