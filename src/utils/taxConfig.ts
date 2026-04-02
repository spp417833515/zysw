import dayjs from 'dayjs';

/**
 * 税务征期配置
 *
 * 申报规则：
 * - 工资/个税（月报）：每月 1-14 日，申报上月
 * - 增值税/企业所得税等（季报）：每季度首月 1-14 日（1/4/7/10月），申报上季度
 * - 年度汇算清缴：次年 1月1日 ～ 5月31日
 */
export const TAX_CONFIG = {
  // 征期截止日（国家税务标准为15日，实际纳税申报截止14日，15日为缴税截止日）
  MONTHLY_DEADLINE_DAY: 14,

  // 季度申报月份（1、4、7、10月）
  QUARTERLY_MONTHS: [1, 4, 7, 10] as readonly number[],

  // 年度汇算清缴期限
  ANNUAL_DEADLINE: {
    START_MONTH: 1,
    END_MONTH: 5,
    END_DAY: 31,
  },

  // 特殊征期规则（因长假期延长的征期）
  SPECIAL_DEADLINES: {
    // 格式: 'YYYY-MM': 截止日期
    '2026-02': 24, // 2月因春节假期延长至24日
  } as Record<string, number>,
};

/**
 * 2026年法定节假日配置（需要每年更新）
 */
export const HOLIDAYS_2026: string[] = [
  // 元旦
  '2026-01-01', '2026-01-02', '2026-01-03',
  // 春节
  '2026-01-29', '2026-01-30', '2026-01-31',
  '2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04',
  // 清明节
  '2026-04-04', '2026-04-05', '2026-04-06',
  // 劳动节
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
  // 端午节
  '2026-06-25', '2026-06-26', '2026-06-27',
  // 中秋节
  '2026-09-26', '2026-09-27', '2026-09-28',
  // 国庆节
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04',
  '2026-10-05', '2026-10-06', '2026-10-07',
];

/**
 * 判断是否为节假日
 */
export const isHoliday = (date: dayjs.Dayjs): boolean => {
  return HOLIDAYS_2026.includes(date.format('YYYY-MM-DD'));
};

/**
 * 判断是否为周末
 */
export const isWeekend = (date: dayjs.Dayjs): boolean => {
  const day = date.day();
  return day === 0 || day === 6;
};

/**
 * 判断是否为工作日
 */
export const isWorkday = (date: dayjs.Dayjs): boolean => {
  return !isWeekend(date) && !isHoliday(date);
};

/**
 * 计算征期截止日期（考虑周末、节假日和特殊规则顺延）
 * @param year 年份
 * @param month 月份（0-11，dayjs 格式）
 */
export const calculateTaxDeadline = (year: number, month: number): dayjs.Dayjs => {
  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  const specialDeadlineDay = TAX_CONFIG.SPECIAL_DEADLINES[yearMonth];
  const deadlineDay = specialDeadlineDay || TAX_CONFIG.MONTHLY_DEADLINE_DAY;

  let deadline = dayjs(new Date(year, month, deadlineDay));

  // 如果截止日是周末或节假日，顺延到下一个工作日
  while (!isWorkday(deadline)) {
    deadline = deadline.add(1, 'day');
  }

  return deadline;
};

// ============================================================
// 申报事项定义
// ============================================================

/** 单项申报事项 */
export interface TaxDeclarationItem {
  /** 申报事项名称 */
  name: string;
  /** 频率：monthly=月报, quarterly=季报, annual=年报 */
  frequency: 'monthly' | 'quarterly' | 'annual';
  /** 申报的所属期描述（自动计算） */
  periodLabel: string;
  /** 申报的所属期范围 */
  periodStart: string;
  periodEnd: string;
}

/**
 * 月报事项（每月1-14日申报上月）
 */
const MONTHLY_ITEMS = [
  '个人所得税扣缴申报',
  '印花税申报',
];

/**
 * 季报事项（季度首月1-14日申报上季度）
 * 在季度申报月，月报事项也需要同时申报
 */
const QUARTERLY_ITEMS = [
  '增值税纳税申报',
  '企业所得税预缴申报',
  '附加税（城建税、教育费附加）申报',
  '财务报表报送（资产负债表、利润表）',
];

/**
 * 获取上一个月的描述
 */
const getPrevMonthLabel = (date: dayjs.Dayjs): { label: string; start: string; end: string } => {
  const prev = date.subtract(1, 'month');
  return {
    label: `${prev.year()}年${prev.month() + 1}月`,
    start: prev.startOf('month').format('YYYY-MM-DD'),
    end: prev.endOf('month').format('YYYY-MM-DD'),
  };
};

/**
 * 获取上一个季度的描述
 */
const getPrevQuarterLabel = (date: dayjs.Dayjs): { label: string; start: string; end: string } => {
  const month = date.month() + 1; // 1-12
  // 当月属于哪个季度申报月 → 上一季度
  let prevQ: number;
  let prevYear = date.year();

  if (month >= 1 && month <= 3) {
    // 1-3月 → Q1，申报的是上年Q4
    prevQ = 4;
    prevYear -= 1;
  } else if (month >= 4 && month <= 6) {
    prevQ = 1;
  } else if (month >= 7 && month <= 9) {
    prevQ = 2;
  } else {
    prevQ = 3;
  }

  const startMonth = (prevQ - 1) * 3 + 1;
  const endMonth = prevQ * 3;

  return {
    label: `${prevYear}年第${prevQ}季度（${startMonth}-${endMonth}月）`,
    start: `${prevYear}-${String(startMonth).padStart(2, '0')}-01`,
    end: dayjs(`${prevYear}-${String(endMonth).padStart(2, '0')}-01`).endOf('month').format('YYYY-MM-DD'),
  };
};

/**
 * 判断当前月是否为季度申报月
 */
export const isQuarterlyMonth = (date: dayjs.Dayjs): boolean => {
  const month = date.month() + 1;
  return TAX_CONFIG.QUARTERLY_MONTHS.includes(month);
};

/**
 * 获取当前月份应申报的全部事项
 */
export const getCurrentDeclarationItems = (date: dayjs.Dayjs): TaxDeclarationItem[] => {
  const items: TaxDeclarationItem[] = [];
  const prevMonth = getPrevMonthLabel(date);

  // 月报事项（每月都有）
  for (const name of MONTHLY_ITEMS) {
    items.push({
      name,
      frequency: 'monthly',
      periodLabel: prevMonth.label,
      periodStart: prevMonth.start,
      periodEnd: prevMonth.end,
    });
  }

  // 季报事项（仅在季度申报月）
  if (isQuarterlyMonth(date)) {
    const prevQuarter = getPrevQuarterLabel(date);
    for (const name of QUARTERLY_ITEMS) {
      items.push({
        name,
        frequency: 'quarterly',
        periodLabel: prevQuarter.label,
        periodStart: prevQuarter.start,
        periodEnd: prevQuarter.end,
      });
    }
  }

  return items;
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
 * 判断当前是否在征期内（1日至截止日之间）
 */
export const isInFilingPeriod = (date: dayjs.Dayjs): boolean => {
  const day = date.date();
  const deadline = calculateTaxDeadline(date.year(), date.month());
  return day >= 1 && date.isBefore(deadline.add(1, 'day'), 'day');
};

/**
 * 获取兼容旧接口的提醒列表（纯字符串）
 */
export const getCurrentTaxReminders = (date: dayjs.Dayjs): string[] => {
  return getCurrentDeclarationItems(date).map((item) => {
    return `${item.name}（所属期：${item.periodLabel}）`;
  });
};

// 保留旧常量兼容
export const TAX_REMINDERS = {
  MONTHLY: MONTHLY_ITEMS,
  QUARTERLY: [...MONTHLY_ITEMS, ...QUARTERLY_ITEMS],
};
