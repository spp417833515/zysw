export type TransactionType = 'income' | 'expense' | 'transfer';

export type PaymentAccountType = 'company' | 'personal';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  categoryId: string;
  categoryName?: string;
  accountId: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  description: string;
  tags: string[];
  attachments: Attachment[];
  invoiceId?: string;
  bookId: string;
  createdAt: string;
  updatedAt: string;

  // Workflow fields
  paymentConfirmed: boolean;
  paymentAccountType: PaymentAccountType | null;
  paymentConfirmedAt?: string;

  invoiceNeeded: boolean;
  invoiceCompleted: boolean;
  invoiceConfirmedAt?: string;

  taxDeclared: boolean;
  taxDeclaredAt?: string;
  taxPeriod?: string;

  // Income record fields
  invoiceIssued?: boolean;
  invoiceImages?: Attachment[];
  companyAccountDate?: string;
  companyAccountImages?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface TransactionFilter {
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  dateRange?: [string, string];
  keyword?: string;
  tags?: string[];
  amountMin?: number;
  amountMax?: number;
}
