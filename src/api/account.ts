import request from './request';
import type { Account } from '@/types/account';

export function getAccounts() {
  return request.get('/accounts');
}

export function getAccountById(id: string) {
  return request.get(`/accounts/${id}`);
}

export function createAccount(data: Partial<Account>) {
  return request.post('/accounts', data);
}

export function updateAccount(id: string, data: Partial<Account>) {
  return request.put(`/accounts/${id}`, data);
}

export function deleteAccount(id: string) {
  return request.delete(`/accounts/${id}`);
}
