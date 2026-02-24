import request from './request';
import type { Contact } from '@/types/contact';

export function getContacts(params?: Record<string, any>) {
  return request.get('/contacts', { params });
}

export function getAllContacts(type?: string) {
  return request.get('/contacts/all', { params: type ? { type } : {} });
}

export function getContactById(id: string) {
  return request.get(`/contacts/${id}`);
}

export function createContact(data: Partial<Contact>) {
  return request.post('/contacts', data);
}

export function updateContact(id: string, data: Partial<Contact>) {
  return request.put(`/contacts/${id}`, data);
}

export function deleteContact(id: string) {
  return request.delete(`/contacts/${id}`);
}
