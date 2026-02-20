import dayjs from 'dayjs';
import { TaxSettings } from '@/api/settings';

/**
 * 企业所得税税率（有限责任公司）
 */
const CORPORATE_TAX_RATE = 0.25; // 标准税率25%

/**
 * 计算企业所得税（有限责任公司）
 */
export const calculateCorporateTax = (profit: number, isSmallEnterprise: boolean = true): number => {
  if (profit <= 0) return 0;

  if (isSmallEnterprise) {
    if (profit <= 1000000) {
      return profit * 0.05;
    } else if (profit <= 3000000) {
      return 1000000 * 0.05 + (profit - 1000000) * 0.10;
    }
  }

  return profit * CORPORATE_TAX_RATE;
};

/**
 * 计算季度应缴税款
 * @param quarterlyIncome 季度收入
 * @param quarterlyExpense 季度支出
 * @param taxSettings 税率设置
 * @returns 税款明细
 */
export interface QuarterlyTaxResult {
  income: number; // 总收入
  expense: number; // 支出
  profit: number; // 利润
  invoicedIncome: number; // 已开票收入
  uninvoicedIncome: number; // 未开票收入
  vat: number; // 增值税
  vatFromInvoiced: number; // 已开票增值税
  vatFromUninvoiced: number; // 未开票增值税
  additionalTax: number; // 附加税
  corporateTax: number; // 企业所得税
  totalTax: number; // 总税额
  vatExempted: boolean; // 是否免征增值税
}

export const calculateQuarterlyTax = (
  quarterlyIncome: number,
  invoicedIncome: number,
  quarterlyExpense: number,
  taxSettings: TaxSettings
): QuarterlyTaxResult => {
  const profit = quarterlyIncome - quarterlyExpense;
  const uninvoicedIncome = quarterlyIncome - invoicedIncome;

  // 计算增值税
  let vat = 0;
  let vatFromInvoiced = 0;
  let vatFromUninvoiced = 0;
  let vatExempted = false;

  if (taxSettings.taxpayerType === 'small' && quarterlyIncome <= taxSettings.vatThresholdQuarterly) {
    // 小规模纳税人季度收入低于免征额，免征增值税
    vatExempted = true;
    vat = 0;
    vatFromInvoiced = 0;
    vatFromUninvoiced = 0;
  } else {
    // 已开票部分：从含税金额中分离增值税
    vatFromInvoiced = (invoicedIncome / (1 + taxSettings.vatRate)) * taxSettings.vatRate;

    // 未开票部分：从含税金额中分离增值税
    vatFromUninvoiced = (uninvoicedIncome / (1 + taxSettings.vatRate)) * taxSettings.vatRate;

    vat = vatFromInvoiced + vatFromUninvoiced;
  }

  // 计算附加税（基于增值税）
  const additionalTax = vat * taxSettings.additionalTaxRate;

  // 计算企业所得税（基于年度利润）
  let corporateTax = 0;
  if (taxSettings.incomeTaxEnabled && profit > 0) {
    // 将季度利润换算成年度利润来计算企业所得税
    const annualProfit = profit * 4;
    // 判断是否为小微企业（年应纳税所得额≤300万）
    const isSmallEnterprise = annualProfit <= 3000000;
    const annualCorporateTax = calculateCorporateTax(annualProfit, isSmallEnterprise);
    // 季度应缴企业所得税 = 年度企业所得税 / 4
    corporateTax = annualCorporateTax / 4;
  }

  const totalTax = vat + additionalTax + corporateTax;

  return {
    income: quarterlyIncome,
    expense: quarterlyExpense,
    profit,
    invoicedIncome,
    uninvoicedIncome,
    vat,
    vatFromInvoiced,
    vatFromUninvoiced,
    additionalTax,
    corporateTax,
    totalTax,
    vatExempted,
  };
};

/**
 * 聚合季度交易数据
 */
export const aggregateQuarterTransactions = (
  transactions: Array<{ date: string; type: string; amount: number; invoiceIssued?: boolean; invoiceCompleted?: boolean }>,
  start: dayjs.Dayjs,
  end: dayjs.Dayjs
) => {
  let income = 0, invoicedIncome = 0, expense = 0;
  for (const t of transactions) {
    const d = dayjs(t.date);
    if (d.isBefore(start) || d.isAfter(end)) continue;
    if (t.type === 'income') {
      income += t.amount;
      if (t.invoiceIssued || t.invoiceCompleted) invoicedIncome += t.amount;
    } else if (t.type === 'expense') {
      expense += t.amount;
    }
  }
  return { income, invoicedIncome, expense };
};

/**
 * 格式化金额
 */
export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};
