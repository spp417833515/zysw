export type ContactType = 'customer' | 'vendor' | 'both';

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  contactPerson: string;
  phone: string;
  email: string;
  taxNumber: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
