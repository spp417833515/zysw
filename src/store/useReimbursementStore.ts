import { create } from 'zustand';
import type { ReimbursementBatch } from '@/types/reimbursement';
import {
  getReimbursements,
  createReimbursement,
  completeReimbursement,
  deleteReimbursement,
  getPendingReimbursementCount,
} from '@/api/reimbursement';

interface ReimbursementState {
  batches: ReimbursementBatch[];
  loading: boolean;
  pendingCount: number;
  fetchBatches: () => Promise<void>;
  fetchPendingCount: () => Promise<void>;
  createBatch: (data: { employeeName: string; transactionIds: string[]; note?: string }) => Promise<void>;
  completeBatch: (id: string, data: { completedDate: string; actualAmount?: number; fee?: number; feeAccountId?: string }) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;
}

export const useReimbursementStore = create<ReimbursementState>((set) => ({
  batches: [],
  loading: false,
  pendingCount: 0,

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

  deleteBatch: async (id) => {
    await deleteReimbursement(id);
    const res: any = await getReimbursements();
    set({ batches: res.data ?? [] });
  },
}));
