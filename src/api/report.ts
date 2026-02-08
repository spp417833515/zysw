import request from './request';

export function getProfitLossReport(params: { startDate: string; endDate: string }) {
  return request.get('/reports/profit-loss', { params });
}

export function getCashFlowReport(params: { startDate: string; endDate: string }) {
  return request.get('/reports/cash-flow', { params });
}

export function getCategoryReport(params: { startDate: string; endDate: string; type?: string }) {
  return request.get('/reports/category', { params });
}

export function getTrendReport(params: { startDate: string; endDate: string }) {
  return request.get('/reports/trend', { params });
}
