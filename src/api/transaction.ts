import request from './request';
import type { Transaction } from '@/types/transaction';
import type { ApiResponse, PaginatedResponse } from '@/types/common';

export function getTransactions(params?: Record<string, unknown>) {
  return request.get<ApiResponse<PaginatedResponse<Transaction>>>('/transactions', { params });
}

export function getTransactionById(id: string) {
  return request.get<ApiResponse<Transaction>>(`/transactions/${id}`);
}

export function createTransaction(data: Partial<Transaction>) {
  return request.post<ApiResponse<Transaction>>('/transactions', data);
}

export function updateTransaction(id: string, data: Partial<Transaction>) {
  return request.put<ApiResponse<Transaction>>(`/transactions/${id}`, data);
}

export function deleteTransaction(id: string) {
  return request.delete<ApiResponse<null>>(`/transactions/${id}`);
}

// Workflow endpoints
export function confirmPayment(id: string, accountType: string) {
  return request.post<ApiResponse<Transaction>>(`/transactions/${id}/confirm-payment`, { accountType });
}

export function confirmInvoice(id: string, invoiceId?: string) {
  return request.post<ApiResponse<Transaction>>(`/transactions/${id}/confirm-invoice`, { invoiceId: invoiceId || null });
}

export function skipInvoice(id: string) {
  return request.post<ApiResponse<Transaction>>(`/transactions/${id}/skip-invoice`);
}

export function confirmTax(id: string, taxPeriod: string) {
  return request.post<ApiResponse<Transaction>>(`/transactions/${id}/confirm-tax`, { taxPeriod });
}

export function getPendingPayments() {
  return request.get<ApiResponse<Transaction[]>>('/transactions/pending/payments');
}

export function getPendingInvoices() {
  return request.get<ApiResponse<Transaction[]>>('/transactions/pending/invoices');
}

export function getPendingTaxes() {
  return request.get<ApiResponse<Transaction[]>>('/transactions/pending/taxes');
}

export function batchCreateTransactions(items: Partial<Transaction>[]) {
  return request.post<ApiResponse<{ created: number; errors: { index: number; error: string }[] }>>('/transactions/batch', { items });
}
