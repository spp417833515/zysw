import request from './request';
import type { RecurringExpense } from '@/types/recurringExpense';
import type { ApiResponse } from '@/types/common';

export function getRecurringExpenses() {
  return request.get<ApiResponse<RecurringExpense[]>>('/recurring-expenses');
}

export function createRecurringExpense(data: Partial<RecurringExpense>) {
  return request.post<ApiResponse<RecurringExpense>>('/recurring-expenses', data);
}

export function updateRecurringExpense(id: string, data: Partial<RecurringExpense>) {
  return request.put<ApiResponse<RecurringExpense>>(`/recurring-expenses/${id}`, data);
}

export function deleteRecurringExpense(id: string) {
  return request.delete<ApiResponse<null>>(`/recurring-expenses/${id}`);
}
