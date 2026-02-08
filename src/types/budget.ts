export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';

export interface Budget {
  id: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  amount: number;
  spent: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  alertThreshold: number; // 0-1, e.g. 0.8 means alert at 80%
  createdAt: string;
  updatedAt: string;
}
