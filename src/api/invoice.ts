import request from './request';
import type { Invoice } from '@/types/invoice';
import type { ApiResponse, PaginatedResponse } from '@/types/common';

export interface InvoiceListParams {
  page?: number;
  page_size?: number;
  direction?: string;
  type?: string;
  status?: string;
  keyword?: string;
  start_date?: string;
  end_date?: string;
}

export interface InvoiceStats {
  total: number;
  pending: number;
  received: { count: number; totalAmount: number; taxAmount: number };
  issued: { count: number; totalAmount: number; taxAmount: number };
  monthReceived: { count: number; totalAmount: number };
  monthIssued: { count: number; totalAmount: number };
}

export function getInvoices(params?: InvoiceListParams) {
  return request.get<ApiResponse<PaginatedResponse<Invoice>>>('/invoices', { params });
}

export function getInvoiceStats() {
  return request.get<ApiResponse<InvoiceStats>>('/invoices/stats');
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

export function verifyInvoice(id: string) {
  return request.put<ApiResponse<Invoice>>(`/invoices/${id}/verify`);
}

export function voidInvoice(id: string) {
  return request.put<ApiResponse<Invoice>>(`/invoices/${id}/void`);
}

export function deleteInvoice(id: string) {
  return request.delete<ApiResponse<null>>(`/invoices/${id}`);
}
