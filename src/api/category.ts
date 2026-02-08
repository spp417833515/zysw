import request from './request';
import type { Category } from '@/types/category';

export function getCategories() {
  return request.get('/categories');
}

export function createCategory(data: Partial<Category>) {
  return request.post('/categories', data);
}

export function updateCategory(id: string, data: Partial<Category>) {
  return request.put(`/categories/${id}`, data);
}

export function deleteCategory(id: string) {
  return request.delete(`/categories/${id}`);
}
