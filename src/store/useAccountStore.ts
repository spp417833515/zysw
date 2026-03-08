import { create } from 'zustand';
import type { Account } from '@/types/account';
import {
  getAccounts,
  createAccount,
  updateAccount as apiUpdateAccount,
  deleteAccount as apiDeleteAccount,
} from '@/api/account';

interface AccountState {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  fetchAccounts: () => Promise<void>;
  addAccount: (a: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAccount: (id: string, a: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
}

export const useAccountStore = create<AccountState>((set) => ({
  accounts: [],
  loading: false,
  error: null,
  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await getAccounts();
      set({ accounts: res.data ?? [], loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载账户失败' });
    }
  },
  addAccount: async (a) => {
    const res = await createAccount(a);
    if (res.code === 0) {
      set((s) => ({ accounts: [...s.accounts, res.data] }));
    }
  },
  updateAccount: async (id, updates) => {
    const res = await apiUpdateAccount(id, updates);
    if (res.code === 0) {
      set((s) => ({
        accounts: s.accounts.map((a) => (a.id === id ? res.data : a)),
      }));
    }
  },
  deleteAccount: async (id) => {
    const res = await apiDeleteAccount(id);
    if (res.code === 0) {
      set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
    } else {
      throw new Error(res.message || '删除失败');
    }
  },
}));
