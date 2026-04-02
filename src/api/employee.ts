import request from './request';
import type { Employee, SalaryRecord, UnpaidSalaries, EmployeeReminder, TaxInfo, SalaryDifferenceItem } from '@/types/employee';
import type { ApiResponse, PaginatedResponse } from '@/types/common';

export function getEmployees(params?: Record<string, unknown>) {
  return request.get<ApiResponse<PaginatedResponse<Employee>>>('/employees', { params });
}

export function getAllEmployees(status?: string) {
  return request.get<ApiResponse<Employee[]>>('/employees/all', { params: status ? { status } : {} });
}

export function getEmployeeById(id: string) {
  return request.get<ApiResponse<Employee>>(`/employees/${id}`);
}

export function createEmployee(data: Partial<Employee>) {
  return request.post<ApiResponse<Employee>>('/employees', data);
}

export function updateEmployee(id: string, data: Partial<Employee>) {
  return request.put<ApiResponse<Employee>>(`/employees/${id}`, data);
}

export function deleteEmployee(id: string) {
  return request.delete<ApiResponse<null>>(`/employees/${id}`);
}

export function getEmployeeReminders() {
  return request.get<ApiResponse<EmployeeReminder[]>>('/employees/reminders');
}

export function calcTax(params: { salary: number; socialInsuranceRate?: number; housingFundRate?: number; specialDeduction?: number }) {
  return request.get<ApiResponse<TaxInfo>>('/employees/calc-tax', { params });
}

export function getSalaryRecords(params?: { employeeId?: string; year?: number }) {
  return request.get<ApiResponse<SalaryRecord[]>>('/employees/salary-records', { params });
}

export function getUnpaidSalaries() {
  return request.get<ApiResponse<UnpaidSalaries>>('/employees/unpaid-salaries');
}

export function confirmSalary(data: { employeeId: string; year: number; month: number; accountId?: string; transferFee?: number; manualTax?: number; actualPaid?: number; voucher?: { id: string; name: string; url: string; type: string; size: number }[] }) {
  return request.post<ApiResponse<SalaryRecord>>('/employees/salary-records/confirm', data);
}

export function updateSalaryRecord(id: string, data: { tax?: number; actualPaid?: number }) {
  return request.put<ApiResponse<SalaryRecord>>(`/employees/salary-records/${id}`, data);
}

export function getSalaryDifferences() {
  return request.get<ApiResponse<SalaryDifferenceItem[]>>('/employees/salary-differences');
}
