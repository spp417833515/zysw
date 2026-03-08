import request from './request';
import type { ApiResponse } from '@/types/common';

export interface DashboardSummary {
  quarterlyIncome: number;
  quarterlyExpense: number;
  quarterlyInvoicedIncome: number;
  pendingPaymentsCount: number;
  pendingInvoicesCount: number;
  pendingTaxesCount: number;
  quarterName: string;
}

export function getDashboardSummary() {
  return request.get<ApiResponse<DashboardSummary>>('/dashboard/summary');
}
