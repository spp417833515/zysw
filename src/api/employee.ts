import request from './request';

export function getEmployees(params?: Record<string, any>) {
  return request.get('/employees', { params });
}

export function getAllEmployees(status?: string) {
  return request.get('/employees/all', { params: status ? { status } : {} });
}

export function getEmployeeById(id: string) {
  return request.get(`/employees/${id}`);
}

export function createEmployee(data: Record<string, any>) {
  return request.post('/employees', data);
}

export function updateEmployee(id: string, data: Record<string, any>) {
  return request.put(`/employees/${id}`, data);
}

export function deleteEmployee(id: string) {
  return request.delete(`/employees/${id}`);
}

export function getEmployeeReminders() {
  return request.get('/employees/reminders');
}

export function calcTax(params: { salary: number; socialInsuranceRate?: number; housingFundRate?: number; specialDeduction?: number }) {
  return request.get('/employees/calc-tax', { params });
}

export function getSalaryRecords(params?: { employeeId?: string; year?: number }) {
  return request.get('/employees/salary-records', { params });
}

export function getUnpaidSalaries() {
  return request.get('/employees/unpaid-salaries');
}

export function confirmSalary(params: { employeeId: string; year: number; month: number; accountId?: string }) {
  return request.post('/employees/salary-records/confirm', null, { params });
}
