export interface ReimbursementBatch {
  id: string;
  batchNo: string;
  employeeName: string;
  transactionIds: string[];
  totalAmount: number;
  status: 'pending' | 'completed';
  note: string;
  actualAmount?: number;
  fee: number;
  feeTransactionId?: string;
  completedDate?: string;
  createdAt: string;
  completedAt?: string;
  paymentConfirmed: boolean;
  paymentConfirmedAt?: string;
  transactions?: { id: string; date: string; description: string; amount: number }[];
}
