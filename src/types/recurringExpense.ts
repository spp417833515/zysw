export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  dayOfMonth: number;
  categoryId?: string;
  categoryName?: string;
  accountId?: string;
  accountName?: string;
  note?: string;
  startDate: string;
  endDate?: string;
  durationMonths?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
