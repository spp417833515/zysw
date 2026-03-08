import request from './request';
import type { Contact } from '@/types/contact';
import type { ApiResponse, PaginatedResponse } from '@/types/common';

export function getContacts(params?: Record<string, unknown>) {
  return request.get<ApiResponse<PaginatedResponse<Contact>>>('/contacts', { params });
}

export function getAllContacts(type?: string) {
  return request.get<ApiResponse<Contact[]>>('/contacts/all', { params: type ? { type } : {} });
}

export function getContactById(id: string) {
  return request.get<ApiResponse<Contact>>(`/contacts/${id}`);
}

export function createContact(data: Partial<Contact>) {
  return request.post<ApiResponse<Contact>>('/contacts', data);
}

export function updateContact(id: string, data: Partial<Contact>) {
  return request.put<ApiResponse<Contact>>(`/contacts/${id}`, data);
}

export function deleteContact(id: string) {
  return request.delete<ApiResponse<null>>(`/contacts/${id}`);
}
