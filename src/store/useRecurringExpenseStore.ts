import { create } from 'zustand';
import type { RecurringExpense } from '@/types/recurringExpense';
import {
  getRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense as apiUpdate,
  deleteRecurringExpense as apiDelete,
} from '@/api/recurringExpense';

interface RecurringExpenseState {
  items: RecurringExpense[];
  loading: boolean;
  fetchItems: () => Promise<void>;
  addItem: (data: Partial<RecurringExpense>) => Promise<void>;
  updateItem: (id: string, data: Partial<RecurringExpense>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useRecurringExpenseStore = create<RecurringExpenseState>((set) => ({
  items: [],
  loading: false,
  fetchItems: async () => {
    set({ loading: true });
    try {
      const res: any = await getRecurringExpenses();
      set({ items: res.data ?? [], loading: false });
    } catch {
      set({ loading: false });
    }
  },
  addItem: async (data) => {
    const res: any = await createRecurringExpense(data);
    if (res.code === 0) {
      set((s) => ({ items: [...s.items, res.data] }));
    }
  },
  updateItem: async (id, data) => {
    const res: any = await apiUpdate(id, data);
    if (res.code === 0) {
      set((s) => ({
        items: s.items.map((item) => (item.id === id ? res.data : item)),
      }));
    }
  },
  deleteItem: async (id) => {
    const res: any = await apiDelete(id);
    if (res.code === 0) {
      set((s) => ({ items: s.items.filter((item) => item.id !== id) }));
    }
  },
}));
