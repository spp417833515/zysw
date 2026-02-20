import request from './request';
import type { ReimbursementBatch } from '@/types/reimbursement';

export const getReimbursements = () => request.get<ReimbursementBatch[]>('/reimbursements');

export const createReimbursement = (data: {
  employeeName: string;
  transactionIds: string[];
  note?: string;
}) => request.post<ReimbursementBatch>('/reimbursements', data);

export const completeReimbursement = (id: string, data: {
  completedDate: string;
  actualAmount?: number;
  fee?: number;
  feeAccountId?: string;
}) => request.put<ReimbursementBatch>(`/reimbursements/${id}/complete`, data);

export const deleteReimbursement = (id: string) =>
  request.delete(`/reimbursements/${id}`);

export const getPendingReimbursementCount = () =>
  request.get<number>('/reimbursements/pending/count');
