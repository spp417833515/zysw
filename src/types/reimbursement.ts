export interface ReimbursementBatch {
  id: string;
  batchNo: string;
  employeeName: string;
  transactionIds: string[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'paid';
  note: string;
  actualAmount?: number;
  fee: number;
  feeTransactionId?: string;
  completedDate?: string;
  createdAt: string;
  completedAt?: string;
  paidAt?: string;
  paymentAccountId?: string;
  transactions?: { id: string; date: string; description: string; amount: number }[];
}
