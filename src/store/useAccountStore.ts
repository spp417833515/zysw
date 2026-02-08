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
  fetchAccounts: () => Promise<void>;
  addAccount: (a: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAccount: (id: string, a: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
}

export const useAccountStore = create<AccountState>((set) => ({
  accounts: [],
  loading: false,
  fetchAccounts: async () => {
    set({ loading: true });
    try {
      const res: any = await getAccounts();
      set({ accounts: res.data ?? [], loading: false });
    } catch {
      set({ loading: false });
    }
  },
  addAccount: async (a) => {
    const res: any = await createAccount(a as any);
    if (res.code === 0) {
      set((s) => ({ accounts: [...s.accounts, res.data] }));
    }
  },
  updateAccount: async (id, updates) => {
    const res: any = await apiUpdateAccount(id, updates as any);
    if (res.code === 0) {
      set((s) => ({
        accounts: s.accounts.map((a) => (a.id === id ? res.data : a)),
      }));
    }
  },
  deleteAccount: async (id) => {
    const res: any = await apiDeleteAccount(id);
    if (res.code === 0) {
      set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
    } else {
      throw new Error(res.message || '删除失败');
    }
  },
}));
