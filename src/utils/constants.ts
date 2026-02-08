export const TRANSACTION_TYPE_MAP = {
  income: { label: '收入', color: '#52C41A' },
  expense: { label: '支出', color: '#F5222D' },
  transfer: { label: '转账', color: '#722ED1' },
} as const;

export const ACCOUNT_TYPE_ICONS: Record<string, string> = {
  cash: 'MoneyCollectOutlined',
  bank: 'BankOutlined',
  alipay: 'AlipayCircleOutlined',
  wechat: 'WechatOutlined',
  credit: 'CreditCardOutlined',
  other: 'WalletOutlined',
};

export const BUDGET_PERIOD_MAP = {
  monthly: '月度',
  quarterly: '季度',
  yearly: '年度',
} as const;

export const PAGE_SIZE = 20;

export const DATE_FORMAT = 'YYYY-MM-DD';
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const MONTH_FORMAT = 'YYYY-MM';
