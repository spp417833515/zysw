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
  fetchContacts: (type?: string) => Promise<void>;
  addContact: (data: Partial<Contact>) => Promise<void>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
}

export const useContactStore = create<ContactState>((set) => ({
  contacts: [],
  loading: false,
  fetchContacts: async (type?: string) => {
    set({ loading: true });
    try {
      const res: any = await getAllContacts(type);
      set({ contacts: res.data ?? [], loading: false });
    } catch {
      set({ loading: false });
    }
  },
  addContact: async (data) => {
    const res: any = await createContact(data);
    if (res.code === 0) {
      set((s) => ({ contacts: [...s.contacts, res.data] }));
    }
  },
  updateContact: async (id, data) => {
    const res: any = await apiUpdateContact(id, data);
    if (res.code === 0) {
      set((s) => ({
        contacts: s.contacts.map((c) => (c.id === id ? res.data : c)),
      }));
    }
  },
  deleteContact: async (id) => {
    const res: any = await apiDeleteContact(id);
    if (res.code === 0) {
      set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) }));
    } else {
      throw new Error(res.message || '删除失败');
    }
  },
}));
