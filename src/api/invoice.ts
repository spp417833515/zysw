import request from './request';
import type { Invoice } from '@/types/invoice';

export function getInvoices() {
  return request.get('/invoices');
}

export function getInvoiceById(id: string) {
  return request.get(`/invoices/${id}`);
}

export function createInvoice(data: Partial<Invoice>) {
  return request.post('/invoices', data);
}

export function updateInvoice(id: string, data: Partial<Invoice>) {
  return request.put(`/invoices/${id}`, data);
}

export function deleteInvoice(id: string) {
  return request.delete(`/invoices/${id}`);
}
