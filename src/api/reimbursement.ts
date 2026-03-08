import request from './request';
import type { ReimbursementBatch } from '@/types/reimbursement';
import type { ApiResponse } from '@/types/common';

export const getReimbursements = () =>
  request.get<ApiResponse<ReimbursementBatch[]>>('/reimbursements');

export const createReimbursement = (data: {
  employeeName: string;
  transactionIds: string[];
  note?: string;
}) => request.post<ApiResponse<ReimbursementBatch>>('/reimbursements', data);

export const completeReimbursement = (id: string, data: {
  completedDate: string;
  actualAmount?: number;
  fee?: number;
  feeAccountId?: string;
}) => request.put<ApiResponse<ReimbursementBatch>>(`/reimbursements/${id}/complete`, data);

export const deleteReimbursement = (id: string) =>
  request.delete<ApiResponse<null>>(`/reimbursements/${id}`);

export const getPendingReimbursementCount = () =>
  request.get<ApiResponse<number>>('/reimbursements/pending/count');

export const getUnpaidReimbursements = () =>
  request.get<ApiResponse<{ count: number; totalAmount: number }>>('/reimbursements/unpaid');

export const confirmReimbursementPayment = (id: string, data: { accountId?: string }) =>
  request.put<ApiResponse<ReimbursementBatch>>(`/reimbursements/${id}/confirm-payment`, data);
