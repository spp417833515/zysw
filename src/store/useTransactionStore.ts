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
  batchConfirmTax as apiBatchConfirmTax,
  getPendingPayments,
  getPendingInvoices,
  getPendingTaxes,
} from '@/api/transaction';
import { useAccountStore } from '@/store/useAccountStore';

interface TransactionState {
  transactions: Transaction[];
  total: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  filter: TransactionFilter;
  setFilter: (filter: Partial<TransactionFilter>) => void;
  resetFilter: () => void;
  fetchTransactions: (params?: { page?: number; pageSize?: number }) => Promise<void>;
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Pending data (full dataset from dedicated APIs)
  pendingPayments: Transaction[];
  pendingInvoicesList: Transaction[];
  pendingTaxesList: Transaction[];
  fetchPendingData: () => Promise<void>;

  // Workflow actions
  confirmPayment: (id: string, accountType: PaymentAccountType) => Promise<void>;
  confirmInvoice: (id: string, invoiceId?: string) => Promise<void>;
  skipInvoice: (id: string) => Promise<void>;
  confirmTaxDeclare: (id: string, taxPeriod: string) => Promise<void>;
  batchConfirmTaxDeclare: (taxPeriod: string) => Promise<{ count: number; declaredAt: string }>;
}

const defaultFilter: TransactionFilter = {};

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  total: 0,
  loading: false,
  error: null,
  page: 1,
  pageSize: 20,
  filter: defaultFilter,
  setFilter: (filter) => {
    set((s) => ({ filter: { ...s.filter, ...filter }, page: 1 }));
    get().fetchTransactions({ page: 1 });
  },
  resetFilter: () => {
    set({ filter: defaultFilter, page: 1 });
    get().fetchTransactions({ page: 1 });
  },

  fetchTransactions: async (params) => {
    const s = get();
    const page = params?.page ?? s.page;
    const pageSize = params?.pageSize ?? s.pageSize;
    const f = s.filter;
    set({ loading: true, error: null, page });
    try {
      const res = await getTransactions({
        page,
        pageSize,
        type: f.type,
        categoryId: f.categoryId,
        accountId: f.accountId,
        contactId: f.contactId,
        dateStart: f.dateRange?.[0],
        dateEnd: f.dateRange?.[1],
        keyword: f.keyword,
        amountMin: f.amountMin,
        amountMax: f.amountMax,
      });
      const data = res.data;
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      const total = Array.isArray(data) ? data.length : (data?.total ?? 0);
      set({ transactions: list, total, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载交易失败' });
    }
  },

  // Pending data from dedicated APIs
  pendingPayments: [],
  pendingInvoicesList: [],
  pendingTaxesList: [],
  fetchPendingData: async () => {
    try {
      const [paymentsRes, invoicesRes, taxesRes] = await Promise.all([
        getPendingPayments(),
        getPendingInvoices(),
        getPendingTaxes(),
      ]);
      set({
        pendingPayments: paymentsRes.data ?? [],
        pendingInvoicesList: invoicesRes.data ?? [],
        pendingTaxesList: taxesRes.data ?? [],
      });
    } catch { /* ignore */ }
  },

  addTransaction: async (t) => {
    const res = await createTransaction(t as Partial<Transaction>);
    if (res.code === 0) {
      useAccountStore.getState().fetchAccounts();
      get().fetchTransactions();
      get().fetchPendingData();
    }
    return res.data;
  },

  updateTransaction: async (id, updates) => {
    const res = await apiUpdateTransaction(id, updates);
    if (res.code !== 0) {
      throw new Error(res.message || '更新失败');
    }
    set((s) => ({
      transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
    }));
    useAccountStore.getState().fetchAccounts();
  },

  deleteTransaction: async (id) => {
    const res = await apiDeleteTransaction(id);
    if (res.code === 0) {
      useAccountStore.getState().fetchAccounts();
      get().fetchTransactions();
      get().fetchPendingData();
    }
  },

  confirmPayment: async (id, accountType) => {
    const res = await apiConfirmPayment(id, accountType);
    if (res.code === 0) {
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
      }));
      get().fetchPendingData();
    }
  },

  confirmInvoice: async (id, invoiceId) => {
    const res = await apiConfirmInvoice(id, invoiceId);
    if (res.code === 0) {
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
      }));
      get().fetchPendingData();
    }
  },

  skipInvoice: async (id) => {
    const res = await apiSkipInvoice(id);
    if (res.code === 0) {
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
      }));
      get().fetchPendingData();
    }
  },

  confirmTaxDeclare: async (id, taxPeriod) => {
    const res = await apiConfirmTax(id, taxPeriod);
    if (res.code === 0) {
      set((s) => ({
        transactions: s.transactions.map((t) => (t.id === id ? res.data : t)),
      }));
      get().fetchPendingData();
    }
  },

  batchConfirmTaxDeclare: async (taxPeriod) => {
    const res = await apiBatchConfirmTax(taxPeriod);
    if (res.code === 0) {
      get().fetchPendingData();
      return res.data;
    }
    throw new Error('批量申报失败');
  },
}));

// Selectors — now from dedicated pending data (full dataset)
export const usePendingIncomePayments = () =>
  useTransactionStore(
    useShallow((s) =>
      s.pendingPayments.filter((t) => t.type === 'income'),
    ),
  );

export const usePendingExpensePayments = () =>
  useTransactionStore(
    useShallow((s) =>
      s.pendingPayments.filter((t) => t.type === 'expense'),
    ),
  );

export const usePendingPayments = () =>
  useTransactionStore(
    useShallow((s) =>
      s.pendingPayments.filter(
        (t) => t.type !== 'transfer' && t.paymentAccountType !== 'personal',
      ),
    ),
  );

export const usePendingInvoices = () =>
  useTransactionStore(
    useShallow((s) => s.pendingInvoicesList),
  );

export const usePendingTaxes = () =>
  useTransactionStore(
    useShallow((s) => s.pendingTaxesList),
  );
