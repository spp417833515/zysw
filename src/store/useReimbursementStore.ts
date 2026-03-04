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

interface ReimbursementState {
  batches: ReimbursementBatch[];
  loading: boolean;
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
  pendingCount: 0,
  unpaidCount: 0,
  unpaidAmount: 0,

  fetchBatches: async () => {
    set({ loading: true });
    try {
      const res: any = await getReimbursements();
      set({ batches: res.data ?? [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchPendingCount: async () => {
    try {
      const res: any = await getPendingReimbursementCount();
      set({ pendingCount: res.data ?? 0 });
    } catch {}
  },

  fetchUnpaidInfo: async () => {
    try {
      const res: any = await getUnpaidReimbursements();
      set({ unpaidCount: res.data?.count ?? 0, unpaidAmount: res.data?.totalAmount ?? 0 });
    } catch {}
  },

  createBatch: async (data) => {
    await createReimbursement(data);
    const res: any = await getReimbursements();
    set({ batches: res.data ?? [] });
  },

  completeBatch: async (id, data) => {
    await completeReimbursement(id, data);
    const res: any = await getReimbursements();
    set({ batches: res.data ?? [] });
  },

  confirmPayment: async (id, accountId) => {
    await confirmReimbursementPayment(id, { accountId });
    const res: any = await getReimbursements();
    set({ batches: res.data ?? [] });
  },

  deleteBatch: async (id) => {
    await deleteReimbursement(id);
    const res: any = await getReimbursements();
    set({ batches: res.data ?? [] });
  },
}));
