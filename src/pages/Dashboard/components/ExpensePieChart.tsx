import React, { useMemo } from 'react';
import { Card, Empty } from 'antd';
import { Pie } from '@ant-design/charts';
import { useTransactionStore } from '@/store/useTransactionStore';

const COLORS = [
  '#5B8FF9',
  '#5AD8A6',
  '#F6BD16',
  '#E86452',
  '#6DC8EC',
  '#945FB9',
  '#FF9845',
  '#1E9493',
  '#FF99C3',
  '#6295F8',
];

interface PieDataItem {
  categoryName: string;
  value: number;
}

const ExpensePieChart: React.FC = () => {
  const transactions = useTransactionStore((s) => s.transactions);

  const data: PieDataItem[] = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const map = new Map<string, number>();

    transactions.forEach((t) => {
      if (t.type === 'expense') {
        const d = new Date(t.date);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          const name = t.categoryName ?? '未分类';
          map.set(name, (map.get(name) ?? 0) + t.amount);
        }
      }
    });

    return Array.from(map.entries())
      .map(([categoryName, value]) => ({ categoryName, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const config = {
    data,
    angleField: 'value',
    colorField: 'categoryName',
    radius: 0.8,
    innerRadius: 0.5,
    color: COLORS,
    label: {
      text: (datum: PieDataItem) => {
        const total = data.reduce((sum, d) => sum + d.value, 0);
        const percent = total > 0 ? ((datum.value / total) * 100).toFixed(1) : '0.0';
        return `${datum.categoryName} ${percent}%`;
      },
      style: {
        fontSize: 12,
      },
    },
    legend: {
      position: 'bottom' as const,
    },
    tooltip: {
      title: 'categoryName',
    },
    interaction: {
      elementHighlight: true,
    },
  };

  if (data.length === 0) {
    return (
      <Card title="支出分类占比（本月）">
        <Empty description="本月暂无支出数据" />
      </Card>
    );
  }

  return (
    <Card title="支出分类占比（本月）">
      <Pie {...config} />
    </Card>
  );
};

export default ExpensePieChart;
