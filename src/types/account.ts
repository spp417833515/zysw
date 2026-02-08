export type AccountType = 'cash' | 'bank' | 'alipay' | 'wechat' | 'credit' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  icon: string;
  color: string;
  description: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const accountTypeLabels: Record<AccountType, string> = {
  cash: '现金',
  bank: '银行卡',
  alipay: '支付宝',
  wechat: '微信',
  credit: '信用卡',
  other: '其他',
};
