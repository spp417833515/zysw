export type InvoiceType = 'normal' | 'special' | 'electronic';
export type InvoiceDirection = 'in' | 'out';

export interface Invoice {
  id: string;
  code: string;
  number: string;
  type: InvoiceType;
  direction: InvoiceDirection;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  issueDate: string;
  buyerName: string;
  buyerTaxNumber: string;
  sellerName: string;
  sellerTaxNumber: string;
  items: InvoiceItem[];
  transactionId?: string;
  imageUrl?: string;
  status: 'pending' | 'verified' | 'void';
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
}

export const invoiceTypeLabels: Record<InvoiceType, string> = {
  normal: '增值税普通发票',
  special: '增值税专用发票',
  electronic: '电子发票',
};

export const invoiceDirectionLabels: Record<InvoiceDirection, string> = {
  in: '收到发票',
  out: '开出发票',
};
