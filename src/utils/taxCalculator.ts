import { TaxSettings } from '@/api/settings';

/**
 * 计算季度应缴增值税与附加税（试算）。
 *
 * 注意：企业所得税不在前端计算——它的计税基数（本年累计利润总额、
 * 权责口径调整）只有后端报税模块掌握，前端一律取
 * GET /reports/tax-report/preview 返回的 filing 数据，保证与报税口径一致。
 */
export interface QuarterlyTaxResult {
  income: number; // 总收入
  expense: number; // 支出
  profit: number; // 利润
  invoicedIncome: number; // 已开票收入
  uninvoicedIncome: number; // 未开票收入
  specialInvoicedIncome: number; // 专票收入（不享受免征）
  vat: number; // 增值税
  vatFromInvoiced: number; // 已开票增值税
  vatFromUninvoiced: number; // 未开票增值税
  vatFromSpecial: number; // 专票增值税（免征期内仍需缴纳）
  additionalTax: number; // 附加税
  vatExempted: boolean; // 普票及未开票部分是否免征增值税
}

/**
 * 小规模纳税人 3% 征收率的应税销售收入减按 1% 征收
 * （财政部税务总局公告 2023 年第 19 号，延续至 2027-12-31）
 */
export const getEffectiveVatRate = (taxSettings: TaxSettings): number =>
  taxSettings.taxpayerType === 'small' && taxSettings.vatRate === 0.03
    ? 0.01
    : taxSettings.vatRate;

export const calculateQuarterlyTax = (
  quarterlyIncome: number,
  invoicedIncome: number,
  quarterlyExpense: number,
  taxSettings: TaxSettings,
  specialInvoicedIncome: number = 0
): QuarterlyTaxResult => {
  const profit = quarterlyIncome - quarterlyExpense;
  const uninvoicedIncome = quarterlyIncome - invoicedIncome;

  const effectiveVatRate = getEffectiveVatRate(taxSettings);

  // 计算增值税
  // 专用发票（专票）不享受起征点免征：开出即须按征收率缴纳
  const vatFromSpecial = (specialInvoicedIncome / (1 + effectiveVatRate)) * effectiveVatRate;
  let vat = 0;
  let vatFromInvoiced = 0;
  let vatFromUninvoiced = 0;
  let vatExempted = false;

  if (taxSettings.taxpayerType === 'small' && quarterlyIncome <= taxSettings.vatThresholdQuarterly) {
    // 季度销售额低于起征点：普票及未开票部分免征，专票部分仍需缴纳
    vatExempted = true;
    vatFromInvoiced = vatFromSpecial;
    vatFromUninvoiced = 0;
    vat = vatFromSpecial;
  } else {
    // 超过起征点：全部销售额计税（专票已包含在已开票收入内，不重复计算）
    vatFromInvoiced = (invoicedIncome / (1 + effectiveVatRate)) * effectiveVatRate;
    vatFromUninvoiced = (uninvoicedIncome / (1 + effectiveVatRate)) * effectiveVatRate;
    vat = vatFromInvoiced + vatFromUninvoiced;
  }

  // 计算附加税（基于增值税）
  const additionalTax = vat * taxSettings.additionalTaxRate;

  return {
    income: quarterlyIncome,
    expense: quarterlyExpense,
    profit,
    invoicedIncome,
    uninvoicedIncome,
    specialInvoicedIncome,
    vat,
    vatFromInvoiced,
    vatFromUninvoiced,
    vatFromSpecial,
    additionalTax,
    vatExempted,
  };
};

/**
 * 格式化金额
 */
export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};
