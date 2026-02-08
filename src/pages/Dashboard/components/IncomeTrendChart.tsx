import React, { useMemo } from 'react';
import { Card, Empty } from 'antd';
import { Column } from '@ant-design/charts';
import { semanticColors } from '@/theme/tokens/colors';
import { useTransactionStore } from '@/store/useTransactionStore';

interface TrendDataItem {
  month: string;
  type: string;
  value: number;
}

const IncomeTrendChart: React.FC = () => {
  const transactions = useTransactionStore((s) => s.transactions);

  const data: TrendDataItem[] = useMemo(() => {
    const now = new Date();
    const items: TrendDataItem[] = [];

    // Build last 6 months labels
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    // Aggregate income/expense per month
    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();
    const monthSet = new Set(months);

    transactions.forEach((t) => {
      const monthKey = t.date.slice(0, 7); // "YYYY-MM"
      if (!monthSet.has(monthKey)) return;
      if (t.type === 'income') {
        incomeMap.set(monthKey, (incomeMap.get(monthKey) ?? 0) + t.amount);
      } else if (t.type === 'expense') {
        expenseMap.set(monthKey, (expenseMap.get(monthKey) ?? 0) + t.amount);
      }
    });

    months.forEach((m) => {
      items.push({ month: m, type: '收入', value: incomeMap.get(m) ?? 0 });
      items.push({ month: m, type: '支出', value: expenseMap.get(m) ?? 0 });
    });

    return items;
  }, [transactions]);

  const config = {
    data,
    xField: 'month',
    yField: 'value',
    colorField: 'type',
    group: true,
    color: [semanticColors.income, semanticColors.expense],
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    label: {
      position: 'top' as const,
      style: {
        fontSize: 11,
      },
    },
    legend: {
      position: 'top-right' as const,
    },
    tooltip: {
      shared: true,
    },
    yAxis: {
      label: {
        formatter: (v: string) => `¥${Number(v).toLocaleString()}`,
      },
    },
  };

  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <Card title="收支趋势">
        <Empty description="暂无收支数据" />
      </Card>
    );
  }

  return (
    <Card title="收支趋势">
      <Column {...config} />
    </Card>
  );
};

export default IncomeTrendChart;
