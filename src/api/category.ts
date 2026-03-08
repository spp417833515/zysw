import request from './request';
import type { Category } from '@/types/category';
import type { ApiResponse } from '@/types/common';

export function getCategories() {
  return request.get<ApiResponse<Category[]>>('/categories');
}

export function createCategory(data: Partial<Category>) {
  return request.post<ApiResponse<Category>>('/categories', data);
}

export function updateCategory(id: string, data: Partial<Category>) {
  return request.put<ApiResponse<Category>>(`/categories/${id}`, data);
}

export function deleteCategory(id: string) {
  return request.delete<ApiResponse<null>>(`/categories/${id}`);
}
