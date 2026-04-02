export interface Employee {
  id: string;
  name: string;
  phone: string;
  idNumber: string;
  department: string;
  position: string;
  entryDate: string;
  status: 'active' | 'departed';
  baseSalary: number;
  payDay: number;
  socialInsuranceRate: number;
  housingFundRate: number;
  specialDeduction: number;
  notes: string;
  taxInfo: TaxInfo;
  createdAt: string;
  updatedAt: string;
}

export interface TaxInfo {
  salary: number;
  socialInsurance: number;
  housingFund: number;
  specialDeduction: number;
  taxableIncome: number;
  tax: number;
  netSalary: number;
}

export interface EmployeeReminder {
  employeeId: string;
  employeeName: string;
  type: 'pay_day' | 'anniversary';
  label: string;
  daysUntil: number;
  amount?: number;
  taxInfo?: TaxInfo;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  baseSalary: number;
  tax: number;
  netSalary: number;
  actualPaid?: number;
  difference?: number;
  status: string;
  transactionId?: string;
  confirmedAt: string;
}

export interface UnpaidSalaryItem {
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  baseSalary: number;
  netSalary: number;
}

export interface UnpaidSalaries {
  count: number;
  totalAmount: number;
  items: UnpaidSalaryItem[];
}

export interface SalaryDifferenceItem {
  id: string;
  employeeId: string;
  employeeName: string;
  year: number;
  month: number;
  baseSalary: number;
  tax: number;
  netSalary: number;
  actualPaid: number;
  difference: number;
  type: 'underpaid' | 'overpaid';
  label: string;
  confirmedAt: string;
}
