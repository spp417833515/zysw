import dayjs from 'dayjs';
import { DATE_FORMAT, DATE_TIME_FORMAT } from './constants';

/**
 * 格式化金额：千分位 + 两位小数
 */
export function formatAmount(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * 格式化金额带符号
 */
export function formatAmountWithSign(value: number, type?: 'income' | 'expense' | 'transfer'): string {
  const formatted = formatAmount(Math.abs(value));
  if (type === 'income') return `+${formatted}`;
  if (type === 'expense') return `-${formatted}`;
  return formatted;
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date, format: string = DATE_FORMAT): string {
  return dayjs(date).format(format);
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: string | Date): string {
  return dayjs(date).format(DATE_TIME_FORMAT);
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number, digits: number = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

/**
 * 将存储路径转为可访问的显示 URL（添加 /api 前缀走 Vite 代理）
 */
export function toDisplayUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return `/api${url}`;
  return url;
}
