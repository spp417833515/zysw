import { create } from 'zustand';
import type { ReimbursementBatch } from '@/types/reimbursement';
import {
  getReimbursements,
  createReimbursement,
  completeReimbursement,
  deleteReimbursement,
  getPendingReimbursementCount,
  getUnpaidReimbursements,
  confirmReimbursementPayment,
} from '@/api/reimbursement';
import { ensureOk } from '@/api/request';
import { useAccountStore } from '@/store/useAccountStore';
import { useTransactionStore } from '@/store/useTransactionStore';

interface ReimbursementState {
  batches: ReimbursementBatch[];
  loading: boolean;
  error: string | null;
  pendingCount: number;
  unpaidCount: number;
  unpaidAmount: number;
  fetchBatches: () => Promise<void>;
  fetchPendingCount: () => Promise<void>;
  fetchUnpaidInfo: () => Promise<void>;
  createBatch: (data: { employeeName: string; transactionIds: string[]; note?: string }) => Promise<void>;
  completeBatch: (id: string, data: { completedDate: string; actualAmount?: number; fee?: number; feeAccountId?: string }) => Promise<void>;
  confirmPayment: (id: string, accountId?: string) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
}

export const useReimbursementStore = create<ReimbursementState>((set) => ({
  batches: [],
  loading: false,
  error: null,
  pendingCount: 0,
  unpaidCount: 0,
  unpaidAmount: 0,

  fetchBatches: async () => {
    set({ loading: true, error: null });
    try {
      const res = await getReimbursements();
      set({ batches: res.data ?? [], loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载报销失败' });
    }
  },

  fetchPendingCount: async () => {
    try {
      const res = await getPendingReimbursementCount();
      set({ pendingCount: res.data ?? 0 });
    } catch { /* ignore */ }
  },

  fetchUnpaidInfo: async () => {
    try {
      const res = await getUnpaidReimbursements();
      set({ unpaidCount: res.data?.count ?? 0, unpaidAmount: res.data?.totalAmount ?? 0 });
    } catch { /* ignore */ }
  },

  createBatch: async (data) => {
    ensureOk(await createReimbursement(data), '创建报销单失败');
    const res = await getReimbursements();
    set({ batches: res.data ?? [] });
    useTransactionStore.getState().fetchPendingData();
  },

  completeBatch: async (id, data) => {
    ensureOk(await completeReimbursement(id, data), '确认报销失败');
    const res = await getReimbursements();
    set({ batches: res.data ?? [] });
    // 手续费会扣账户余额
    useAccountStore.getState().fetchAccounts();
  },

  confirmPayment: async (id, accountId) => {
    ensureOk(await confirmReimbursementPayment(id, { accountId }), '确认打款失败');
    const res = await getReimbursements();
    set({ batches: res.data ?? [] });
    // 打款扣余额并生成 [RB:] 支出流水
    useAccountStore.getState().fetchAccounts();
    useTransactionStore.getState().fetchPendingData();
    useTransactionStore.getState().fetchTransactions();
  },

  deleteBatch: async (id) => {
    ensureOk(await deleteReimbursement(id), '删除报销单失败');
    const res = await getReimbursements();
    set({ batches: res.data ?? [] });
    useTransactionStore.getState().fetchPendingData();
  },
}));
