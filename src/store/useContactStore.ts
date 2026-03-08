import { create } from 'zustand';
import type { Contact } from '@/types/contact';
import {
  getAllContacts,
  createContact,
  updateContact as apiUpdateContact,
  deleteContact as apiDeleteContact,
} from '@/api/contact';

interface ContactState {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  fetchContacts: (type?: string) => Promise<void>;
  addContact: (data: Partial<Contact>) => Promise<void>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
}

export const useContactStore = create<ContactState>((set) => ({
  contacts: [],
  loading: false,
  error: null,
  fetchContacts: async (type?: string) => {
    set({ loading: true, error: null });
    try {
      const res = await getAllContacts(type);
      set({ contacts: res.data ?? [], loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : '加载联系人失败' });
    }
  },
  addContact: async (data) => {
    const res = await createContact(data);
    if (res.code === 0) {
      set((s) => ({ contacts: [...s.contacts, res.data] }));
    }
  },
  updateContact: async (id, data) => {
    const res = await apiUpdateContact(id, data);
    if (res.code === 0) {
      set((s) => ({
        contacts: s.contacts.map((c) => (c.id === id ? res.data : c)),
      }));
    }
  },
  deleteContact: async (id) => {
    const res = await apiDeleteContact(id);
    if (res.code === 0) {
      set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }));
    } else {
      throw new Error(res.message || '删除失败');
    }
  },
}));
