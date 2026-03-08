import request from './request';
import type { Account } from '@/types/account';
import type { ApiResponse } from '@/types/common';

export function getAccounts() {
  return request.get<ApiResponse<Account[]>>('/accounts');
}

export function getAccountById(id: string) {
  return request.get<ApiResponse<Account>>(`/accounts/${id}`);
}

export function createAccount(data: Partial<Account>) {
  return request.post<ApiResponse<Account>>('/accounts', data);
}

export function updateAccount(id: string, data: Partial<Account>) {
  return request.put<ApiResponse<Account>>(`/accounts/${id}`, data);
}

export function deleteAccount(id: string) {
  return request.delete<ApiResponse<null>>(`/accounts/${id}`);
}
