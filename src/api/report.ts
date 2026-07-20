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

// ======== 报表预览（与生成 XLS 完全同源的数据） ========

export interface TaxReportSnapshot {
  cash: number;
  receivables: number;
  payables: number;
  unpaid_salary: number;
}

export interface TaxReportPnl {
  revenue: number;
  cost: number;
  tax_add: number;
  sales: number;
  admin: number;
  finance: number;
  interest_net: number;
  non_op: number;
  operating_profit: number;
  profit_total: number;
  income_tax: number;
  net_profit: number;
}

export interface TaxReportCashSide {
  income: number;
  interest: number;
  expenses: Record<string, number>;
  salary: number;
  salary_tax: number;
}

export interface TaxReportFiling {
  profitYtd: number;
  taxableIncome: number;
  statutoryTax: number;
  reliefAmount: number;
  accruedTax: number;
  prepaidTax: number;
  currentDue: number;
  creditCarryover: number;
  assetsTotalWan: number;
  isSmallMicro: boolean;
  salaryAccruedYtd: number;
  salaryPaidYtd: number;
}

export interface TaxReportPreview {
  common: {
    company: { tax_number: string; company_name: string };
    period: { start: string; end: string };
    snapshot_end: TaxReportSnapshot;
    snapshot_year_start: TaxReportSnapshot;
    tax_payable: number;
    tax_payable_year_start: number;
    tax_prepaid: number;
    tax_prepaid_year_start: number;
    pnl_period: TaxReportPnl;
    pnl_ytd: TaxReportPnl;
  };
  cash_flow: {
    income_period: number;
    interest_period: number;
    expenses_period: Record<string, number>;
    salary_period: number;
    salary_tax_period: number;
    opening_period: number;
    income_ytd: number;
    interest_ytd: number;
    expenses_ytd: Record<string, number>;
    salary_ytd: number;
    salary_tax_ytd: number;
    opening_ytd: number;
  };
  filing: TaxReportFiling;
}

export function getTaxReportPreview(params: { startDate: string; endDate: string }) {
  return request.get<ApiResponse<TaxReportPreview>>('/reports/tax-report/preview', { params });
}
