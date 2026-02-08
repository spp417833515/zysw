import request from './request';
import type { Transaction, TransactionFilter } from '@/types/transaction';
import type { PaginationParams } from '@/types/common';

export function getTransactions(params?: PaginationParams & TransactionFilter) {
  return request.get('/transactions', { params });
}

export function getTransactionById(id: string) {
  return request.get(`/transactions/${id}`);
}

export function createTransaction(data: Partial<Transaction>) {
  return request.post('/transactions', data);
}

export function updateTransaction(id: string, data: Partial<Transaction>) {
  return request.put(`/transactions/${id}`, data);
}

export function deleteTransaction(id: string) {
  return request.delete(`/transactions/${id}`);
}

// Workflow endpoints
export function confirmPayment(id: string, accountType: string) {
  return request.post(`/transactions/${id}/confirm-payment`, { accountType });
}

export function confirmInvoice(id: string, invoiceId?: string) {
  return request.post(`/transactions/${id}/confirm-invoice`, { invoiceId: invoiceId || null });
}

export function skipInvoice(id: string) {
  return request.post(`/transactions/${id}/skip-invoice`);
}

export function confirmTax(id: string, taxPeriod: string) {
  return request.post(`/transactions/${id}/confirm-tax`, { taxPeriod });
}

export function getPendingPayments() {
  return request.get('/transactions/pending/payments');
}

export function getPendingInvoices() {
  return request.get('/transactions/pending/invoices');
}

export function getPendingTaxes() {
  return request.get('/transactions/pending/taxes');
}
