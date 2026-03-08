import request from './request';
import type { Invoice } from '@/types/invoice';
import type { ApiResponse } from '@/types/common';

export function getInvoices() {
  return request.get<ApiResponse<Invoice[]>>('/invoices');
}

export function getInvoiceById(id: string) {
  return request.get<ApiResponse<Invoice>>(`/invoices/${id}`);
}

export function createInvoice(data: Partial<Invoice>) {
  return request.post<ApiResponse<Invoice>>('/invoices', data);
}

export function updateInvoice(id: string, data: Partial<Invoice>) {
  return request.put<ApiResponse<Invoice>>(`/invoices/${id}`, data);
}

export function deleteInvoice(id: string) {
  return request.delete<ApiResponse<null>>(`/invoices/${id}`);
}
