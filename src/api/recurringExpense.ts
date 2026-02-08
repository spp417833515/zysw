import request from './request';
import type { RecurringExpense } from '@/types/recurringExpense';

export function getRecurringExpenses() {
  return request.get('/recurring-expenses');
}

export function createRecurringExpense(data: Partial<RecurringExpense>) {
  return request.post('/recurring-expenses', data);
}

export function updateRecurringExpense(id: string, data: Partial<RecurringExpense>) {
  return request.put(`/recurring-expenses/${id}`, data);
}

export function deleteRecurringExpense(id: string) {
  return request.delete(`/recurring-expenses/${id}`);
}
