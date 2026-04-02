import request from './request';
import type { ApiResponse } from '@/types/common';

interface ProfitLossReport {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeByCategory: { categoryId: string; categoryName: string; amount: number }[];
  expenseByCategory: { categoryId: string; categoryName: string; amount: number }[];
}

interface CashFlowReport {
  inflow: number;
  outflow: number;
  netFlow: number;
  byAccount: { accountId: string; accountName: string; inflow: number; outflow: number; net: number }[];
  byMonth: { month: string; inflow: number; outflow: number; net: number }[];
}

interface CategoryReport {
  categories: { categoryId: string; categoryName: string; icon: string; color: string; amount: number; percentage: number }[];
  total: number;
}

interface TrendReport {
  months: { month: string; income: number; expense: number; profit: number }[];
}

interface ReceivablePayableReport {
  items: { contactId: string; contactName: string; amount: number; count: number; earliestDate: string }[];
  total: number;
}

interface AgingReport {
  type: string;
  buckets: { range: string; amount: number }[];
  total: number;
}

export function getProfitLossReport(params: { startDate: string; endDate: string }) {
  return request.get<ApiResponse<ProfitLossReport>>('/reports/profit-loss', { params });
}

export function getCashFlowReport(params: { startDate: string; endDate: string }) {
  return request.get<ApiResponse<CashFlowReport>>('/reports/cash-flow', { params });
}

export function getCategoryReport(params: { startDate: string; endDate: string; type?: string }) {
  return request.get<ApiResponse<CategoryReport>>('/reports/category', { params });
}

export function getTrendReport(params: { startDate: string; endDate: string }) {
  return request.get<ApiResponse<TrendReport>>('/reports/trend', { params });
}

export function getReceivables() {
  return request.get<ApiResponse<ReceivablePayableReport>>('/reports/receivables');
}

export function getPayables() {
  return request.get<ApiResponse<ReceivablePayableReport>>('/reports/payables');
}

export function getAgingAnalysis(type: string = 'receivable') {
  return request.get<ApiResponse<AgingReport>>('/reports/aging', { params: { type } });
}

// ======== 报税报表 ========

export interface TaxReportFile {
  filename: string;
  size: number;
  createdAt: string;
}

export function generateTaxReport(params: { reportType: string; startDate: string; endDate: string }) {
  return request.post<ApiResponse<{ filename: string; path: string }>>('/reports/tax-report/generate', null, { params });
}

export function listTaxReports() {
  return request.get<ApiResponse<TaxReportFile[]>>('/reports/tax-report/list');
}

export function deleteTaxReport(filename: string) {
  return request.delete<ApiResponse<null>>(`/reports/tax-report/${encodeURIComponent(filename)}`);
}

export function getTaxReportDownloadUrl(filename: string) {
  return `/api/reports/tax-report/download?filename=${encodeURIComponent(filename)}`;
}
