import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Transaction, TransactionFilter, PaymentAccountType } from '@/types/transaction';
import {
  getTransactions,
  createTransaction,
  updateTransaction as apiUpdateTransaction,
  deleteTransaction as apiDeleteTransaction,
  confirmPayment as apiConfirmPayment,
  confirmInvoice as apiConfirmInvoice,
  skipInvoice as apiSkipInvoice,
  confirmTax as apiConfirmTax,
} from '@/api/transaction';
import { useAccountStore } from '@/store/useAccountStore';

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  filter: TransactionFilter;
  setFilter: (filter: Partial<TransactionFilter>) => void;
  resetFilter: () => void;
  fetchTransactions: () => Promise<void>;
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Workflow actions
  confirmPayment: (id: string, accountType: PaymentAccountType) => Promise<void>;
  confirmInvoice: (id: string, invoiceId?: string) => Promise<void>;
  skipInvoice: (id: string) => Promise<void>;
  confirmTaxDeclare: (id: string, taxPeriod: string) => Promise<void>;
}

const defaultFilter: TransactionFilter = {};

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  loading: false,
  filter: defaultFilter,
  setFilter: (filter) => set((s) => ({ filter: { ...s.filter, ...filter } })),
  resetFilter: () => set({ filter: defaultFilter }),

  fetchTransactions: async () => {
    set({ loading: true });
    try {
      const res: any = await getTransactions();
      const data = res.data;
      // Backend may return paginated { data, total } or plain array
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      set({ transactions: list, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addTransaction: async (t) => {
    const res: any = await createTransaction(t as any);
    if (res.code === 0) {
      set((s) => ({ transactions: [res.data, ...s.transactions] }));
      useAccountStore.getState().fetchAccounts();
    }
    return res.data;
  },

  updateTransaction: async (id, updates) => {
    const res: any = await apiUpdateTransaction(id, updates as any);
    if (res.code === 0) {
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
      }));
      useAccountStore.getState().fetchAccounts();
    }
  },

  deleteTransaction: async (id) => {
    const res: any = await apiDeleteTransaction(id);
    if (res.code === 0) {
      set((s) => ({
        transactions: s.transactions.filter((t) => t.id !== id),
      }));
      useAccountStore.getState().fetchAccounts();
    }
  },

  confirmPayment: async (id, accountType) => {
    const res: any = await apiConfirmPayment(id, accountType);
    if (res.code === 0) {
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
      }));
    }
  },

  confirmInvoice: async (id, invoiceId) => {
    const res: any = await apiConfirmInvoice(id, invoiceId);
    if (res.code === 0) {
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
      }));
    }
  },

  skipInvoice: async (id) => {
    const res: any = await apiSkipInvoice(id);
    if (res.code === 0) {
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
      }));
    }
  },

  confirmTaxDeclare: async (id, taxPeriod) => {
    const res: any = await apiConfirmTax(id, taxPeriod);
    if (res.code === 0) {
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
      }));
    }
  },
}));

// Computed selectors (useShallow prevents infinite re-renders from .filter())
export const usePendingPayments = () =>
  useTransactionStore(
    useShallow((s) =>
      s.transactions.filter((t) => !t.paymentConfirmed),
    ),
  );

export const usePendingInvoices = () =>
  useTransactionStore(
    useShallow((s) =>
      s.transactions.filter(
        (t) => t.type !== 'transfer' && t.invoiceNeeded && !t.invoiceCompleted,
      ),
    ),
  );

export const usePendingTaxes = () =>
  useTransactionStore(
    useShallow((s) =>
      s.transactions.filter((t) => t.type !== 'transfer' && !t.taxDeclared),
    ),
  );
