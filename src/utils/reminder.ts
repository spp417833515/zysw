import type { Transaction } from '@/types/transaction';
import type { RecurringExpense } from '@/types/recurringExpense';

export type ReminderType =
  | 'payment_overdue'
  | 'invoice_overdue'
  | 'company_account_overdue'
  | 'recurring_upcoming'
  | 'recurring_overdue';

export type ReminderLevel = 'info' | 'warning' | 'danger';

export interface ReminderItem {
  transactionId: string;
  type: ReminderType;
  label: string;
  daysPassed: number;
  level: ReminderLevel;
  transaction: Transaction;
}

export interface RecurringReminderItem {
  recurringExpenseId: string;
  type: 'recurring_upcoming' | 'recurring_overdue';
  label: string;
  daysUntil: number;
  level: ReminderLevel;
  recurringExpense: RecurringExpense;
}

const THRESHOLDS = { warning: 3, danger: 7 };

const LABELS: Record<string, string> = {
  payment_overdue: '到账未确认',
  invoice_overdue: '发票未开具',
  company_account_overdue: '公户未到账',
  recurring_upcoming: '固定开销即将到期',
  recurring_overdue: '固定开销已到扣款日',
};

export { LABELS as REMINDER_TYPE_LABELS };

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getLevel(days: number): ReminderLevel | null {
  if (days >= THRESHOLDS.danger) return 'danger';
  if (days >= THRESHOLDS.warning) return 'warning';
  return null;
}

export function computeReminders(transactions: Transaction[]): ReminderItem[] {
  const reminders: ReminderItem[] = [];

  for (const tx of transactions) {
    const days = daysSince(tx.date);

    // 1. 到账未确认超时
    if (!tx.paymentConfirmed) {
      const level = getLevel(days);
      if (level) {
        reminders.push({
          transactionId: tx.id,
          type: 'payment_overdue',
          label: LABELS.payment_overdue,
          daysPassed: days,
          level,
          transaction: tx,
        });
      }
    }

    // 2. 发票未开具超时（非转账、需要开票、未完成）
    if (tx.type !== 'transfer' && tx.invoiceNeeded && !tx.invoiceCompleted) {
      const level = getLevel(days);
      if (level) {
        reminders.push({
          transactionId: tx.id,
          type: 'invoice_overdue',
          label: LABELS.invoice_overdue,
          daysPassed: days,
          level,
          transaction: tx,
        });
      }
    }

    // 3. 公户未到账超时（收入类型、无公户到账日期）
    if (
      tx.type === 'income' &&
      (!tx.companyAccountDate) &&
      (!tx.paymentAccountType || tx.paymentAccountType === 'personal')
    ) {
      const level = getLevel(days);
      if (level) {
        reminders.push({
          transactionId: tx.id,
          type: 'company_account_overdue',
          label: LABELS.company_account_overdue,
          daysPassed: days,
          level,
          transaction: tx,
        });
      }
    }
  }

  // Sort by daysPassed descending (most overdue first)
  reminders.sort((a, b) => b.daysPassed - a.daysPassed);
  return reminders;
}

/**
 * Compute reminders for recurring expenses.
 * - "upcoming": within 3 days before the payment day
 * - "overdue": payment day has passed this month but no transaction recorded
 */
export function computeRecurringReminders(items: RecurringExpense[]): RecurringReminderItem[] {
  const reminders: RecurringReminderItem[] = [];
  const now = new Date();
  const today = now.getDate();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (const item of items) {
    if (!item.enabled) continue;

    // Check if expired
    if (item.endDate && new Date(item.endDate) < now) continue;
    if (item.durationMonths) {
      const start = new Date(item.startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + item.durationMonths);
      if (end < now) continue;
    }

    // Check if start date is in the future
    if (new Date(item.startDate) > now) continue;

    const dayOfMonth = item.dayOfMonth;
    const diff = dayOfMonth - today; // positive = upcoming, negative = overdue

    if (diff > 0 && diff <= 3) {
      // Upcoming in 1-3 days
      reminders.push({
        recurringExpenseId: item.id,
        type: 'recurring_upcoming',
        label: `${item.name} - ${currentMonth}-${String(dayOfMonth).padStart(2, '0')}`,
        daysUntil: diff,
        level: diff <= 1 ? 'warning' : 'info',
        recurringExpense: item,
      });
    } else if (diff <= 0 && diff >= -7) {
      // Overdue: payment day passed within last 7 days
      reminders.push({
        recurringExpenseId: item.id,
        type: 'recurring_overdue',
        label: `${item.name} - ${currentMonth}-${String(dayOfMonth).padStart(2, '0')}`,
        daysUntil: diff,
        level: diff <= -3 ? 'danger' : 'warning',
        recurringExpense: item,
      });
    }
  }

  // Sort: overdue first (most negative daysUntil), then upcoming
  reminders.sort((a, b) => a.daysUntil - b.daysUntil);
  return reminders;
}
