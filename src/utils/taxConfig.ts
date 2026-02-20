import dayjs from 'dayjs';

/**
 * 税务征期配置
 */
export const TAX_CONFIG = {
  // 每月征期截止日（基准）
  MONTHLY_DEADLINE_DAY: 15,

  // 季度申报月份（1、4、7、10月）
  QUARTERLY_MONTHS: [1, 4, 7, 10],

  // 年度汇算清缴期限
  ANNUAL_DEADLINE: {
    START_MONTH: 1, // 1月1日开始
    END_MONTH: 5,   // 5月31日结束
    END_DAY: 31,
  },

  // 特殊征期规则（因长假期延长的征期）
  SPECIAL_DEADLINES: {
    // 格式: 'YYYY-MM': 截止日期
    '2026-02': 24, // 2月因春节假期延长至24日
    // 可以继续添加其他特殊月份
  } as Record<string, number>,
};

/**
 * 2026年法定节假日配置（需要每年更新）
 * 格式：'YYYY-MM-DD'
 */
export const HOLIDAYS_2026: string[] = [
  // 元旦：1月1日-3日
  '2026-01-01', '2026-01-02', '2026-01-03',

  // 春节：1月29日-2月4日（农历正月初一至初七）
  '2026-01-29', '2026-01-30', '2026-01-31',
  '2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04',

  // 清明节：4月4日-6日
  '2026-04-04', '2026-04-05', '2026-04-06',

  // 劳动节：5月1日-5日
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',

  // 端午节：6月25日-27日
  '2026-06-25', '2026-06-26', '2026-06-27',

  // 中秋节：9月26日-28日
  '2026-09-26', '2026-09-27', '2026-09-28',

  // 国庆节：10月1日-7日
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
  '2026-10-05', '2026-10-06', '2026-10-07',
];

/**
 * 判断是否为节假日
 */
export const isHoliday = (date: dayjs.Dayjs): boolean => {
  const dateStr = date.format('YYYY-MM-DD');
  return HOLIDAYS_2026.includes(dateStr);
};

/**
 * 判断是否为周末
 */
export const isWeekend = (date: dayjs.Dayjs): boolean => {
  const day = date.day();
  return day === 0 || day === 6; // 0=周日, 6=周六
};

/**
 * 判断是否为工作日
 */
export const isWorkday = (date: dayjs.Dayjs): boolean => {
  return !isWeekend(date) && !isHoliday(date);
};

/**
 * 计算征期截止日期（考虑周末、节假日和特殊规则）
 */
export const calculateTaxDeadline = (year: number, month: number): dayjs.Dayjs => {
  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  // 检查是否有特殊征期规则
  const specialDeadlineDay = TAX_CONFIG.SPECIAL_DEADLINES[yearMonth];
  const deadlineDay = specialDeadlineDay || TAX_CONFIG.MONTHLY_DEADLINE_DAY;

  // 基准日期
  let deadline = dayjs(new Date(year, month, deadlineDay));

  // 如果是周末或节假日，顺延到下一个工作日
  while (!isWorkday(deadline)) {
    deadline = deadline.add(1, 'day');
  }

  return deadline;
};

/**
 * 税务申报提醒事项
 */
export const TAX_REMINDERS = {
  MONTHLY: [
    '增值税纳税申报表',
    '个人所得税扣缴申报表',
    '印花税申报',
  ],
  QUARTERLY: [
    '增值税纳税申报表',
    '企业所得税预缴申报表',
    '个人所得税扣缴申报表',
    '财务报表（资产负债表、利润表）',
  ],
};

/**
 * 获取日期所在季度信息
 */
export const getQuarterInfo = (date: dayjs.Dayjs) => {
  const month = date.month(); // 0-11
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const quarterNum = Math.floor(month / 3) + 1;
  const start = dayjs(new Date(date.year(), quarterStartMonth, 1));
  const end = start.add(3, 'month').subtract(1, 'day');
  return { quarterNum, name: `Q${quarterNum}` as const, start, end };
};

/**
 * 获取当前应申报的事项
 */
export const getCurrentTaxReminders = (date: dayjs.Dayjs): string[] => {
  const month = date.month() + 1; // dayjs的月份是0-11

  // 判断是否为季度申报月
  const isQuarterlyMonth = TAX_CONFIG.QUARTERLY_MONTHS.includes(month);

  if (isQuarterlyMonth) {
    return TAX_REMINDERS.QUARTERLY;
  } else {
    return TAX_REMINDERS.MONTHLY;
  }
};
