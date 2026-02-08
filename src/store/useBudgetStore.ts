import { create } from 'zustand';
import type { Budget } from '@/types/budget';
import {
  getBudgets,
  createBudget,
  updateBudget as apiUpdateBudget,
  deleteBudget as apiDeleteBudget,
} from '@/api/budget';

interface BudgetState {
  budgets: Budget[];
  loading: boolean;
  fetchBudgets: () => Promise<void>;
  addBudget: (b: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBudget: (id: string, b: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  loading: false,
  fetchBudgets: async () => {
    set({ loading: true });
    try {
      const res: any = await getBudgets();
      set({ budgets: res.data ?? [], loading: false });
    } catch {
      set({ loading: false });
    }
  },
  addBudget: async (b) => {
    const res: any = await createBudget(b as any);
    if (res.code === 0) {
      set((s) => ({ budgets: [...s.budgets, res.data] }));
    }
  },
  updateBudget: async (id, updates) => {
    const res: any = await apiUpdateBudget(id, updates as any);
    if (res.code === 0) {
      set((s) => ({
        budgets: s.budgets.map((b) => (b.id === id ? res.data : b)),
      }));
    }
  },
  deleteBudget: async (id) => {
    const res: any = await apiDeleteBudget(id);
    if (res.code === 0) {
      set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
    }
  },
}));
