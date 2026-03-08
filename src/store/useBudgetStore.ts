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
  error: string | null;
  fetchBudgets: () => Promise<void>;
  addBudget: (b: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBudget: (id: string, b: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
}

export const useBudgetStore = create<BudgetState>((set) => ({
  budgets: [],
  loading: false,
  error: null,
  fetchBudgets: async () => {
    set({ loading: true, error: null });
    try {
      const res = await getBudgets();
      set({ budgets: res.data ?? [], loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载预算失败' });
    }
  },
  addBudget: async (b) => {
    const res = await createBudget(b);
    if (res.code === 0) {
      set((s) => ({ budgets: [...s.budgets, res.data] }));
    }
  },
  updateBudget: async (id, updates) => {
    const res = await apiUpdateBudget(id, updates);
    if (res.code === 0) {
      set((s) => ({
        budgets: s.budgets.map((b) => (b.id === id ? res.data : b)),
      }));
    }
  },
  deleteBudget: async (id) => {
    const res = await apiDeleteBudget(id);
    if (res.code === 0) {
      set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
    }
  },
}));
