import React, { useState, useMemo } from 'react';
import { Card, Table, Tabs, Space, Typography } from 'antd';
import { Pie } from '@ant-design/charts';
import dayjs from 'dayjs';
import PageContainer from '@/components/PageContainer';
import { mockTransactions } from '@/mock/data';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';
import ReportDateRangePicker from './components/ReportDateRangePicker';
import ReportExportButton from './components/ReportExportButton';

const { Text } = Typography;

interface CategorySummary {
  key: string;
  categoryName: string;
  amount: number;
  percent: number;
  count: number;
}

const CategoryReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().startOf('month').format('YYYY-MM-DD'),
    dayjs().endOf('month').format('YYYY-MM-DD'),
  ]);
  const [activeTab, setActiveTab] = useState<string>('expense');

  /** Filter transactions by date range */
  const filteredTransactions = useMemo(() => {
    const [start, end] = dateRange;
    return mockTransactions.filter((t) => {
      const d = dayjs(t.date);
      return (
        d.isAfter(dayjs(start).subtract(1, 'day')) &&
        d.isBefore(dayjs(end).add(1, 'day'))
      );
    });
  }, [dateRange]);

  /** Aggregate by category for a given type */
  const aggregateByCategory = (type: 'income' | 'expense'): CategorySummary[] => {
    const items = filteredTransactions.filter((t) => t.type === type);
    const map: Record<string, { amount: number; count: number }> = {};

    items.forEach((t) => {
      const cat = t.categoryName || '未分类';
      if (!map[cat]) {
        map[cat] = { amount: 0, count: 0 };
      }
      map[cat].amount += t.amount;
      map[cat].count += 1;
    });

    const total = Object.values(map).reduce((s, v) => s + v.amount, 0);

    return Object.entries(map)
      .map(([name, data]) => ({
        key: name,
        categoryName: name,
        amount: data.amount,
        percent: total > 0 ? data.amount / total : 0,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount);
  };

  const expenseData = useMemo(() => aggregateByCategory('expense'), [filteredTransactions]);
  const incomeData = useMemo(() => aggregateByCategory('income'), [filteredTransactions]);

  const currentData = activeTab === 'expense' ? expenseData : incomeData;
  const currentColor =
    activeTab === 'expense' ? semanticColors.expense : semanticColors.income;

  /** Pie chart config */
  const pieConfig = {
    data: currentData.map((d) => ({
      type: d.categoryName,
      value: d.amount,
    })),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.5,
    height: 380,
    label: {
      type: 'outer' as const,
      content: '{name} {percentage}',
    },
    interactions: [{ type: 'element-active' }],
    statistic: {
      title: {
        content: activeTab === 'expense' ? '总支出' : '总收入',
        style: { fontSize: '14px' },
      },
      content: {
        style: { fontSize: '18px', fontWeight: 'bold', color: currentColor },
        formatter: () => {
          const total = currentData.reduce((s, d) => s + d.amount, 0);
          return `¥${formatAmount(total)}`;
        },
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.type,
        value: `¥${formatAmount(datum.value)}`,
      }),
    },
  };

  /** Table columns */
  const columns = [
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '金额（元）',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      sorter: (a: CategorySummary, b: CategorySummary) => a.amount - b.amount,
      render: (val: number) => (
        <Text style={{ color: currentColor }}>¥{formatAmount(val)}</Text>
      ),
    },
    {
      title: '占比',
      dataIndex: 'percent',
      key: 'percent',
      align: 'right' as const,
      width: 100,
      sorter: (a: CategorySummary, b: CategorySummary) => a.percent - b.percent,
      render: (val: number) => `${(val * 100).toFixed(1)}%`,
    },
    {
      title: '笔数',
      dataIndex: 'count',
      key: 'count',
      align: 'right' as const,
      width: 80,
      sorter: (a: CategorySummary, b: CategorySummary) => a.count - b.count,
    },
  ];

  const tabItems = [
    {
      key: 'expense',
      label: '支出分析',
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card>
            <Pie {...pieConfig} />
          </Card>
          <Card>
            <Table
              columns={columns}
              dataSource={expenseData}
              pagination={false}
              size="middle"
              summary={() => {
                const total = expenseData.reduce((s, d) => s + d.amount, 0);
                const totalCount = expenseData.reduce((s, d) => s + d.count, 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>合计</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ color: semanticColors.expense }}>
                        ¥{formatAmount(total)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text strong>100.0%</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <Text strong>{totalCount}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </Card>
        </Space>
      ),
    },
    {
      key: 'income',
      label: '收入分析',
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card>
            <Pie {...pieConfig} />
          </Card>
          <Card>
            <Table
              columns={columns}
              dataSource={incomeData}
              pagination={false}
              size="middle"
              summary={() => {
                const total = incomeData.reduce((s, d) => s + d.amount, 0);
                const totalCount = incomeData.reduce((s, d) => s + d.count, 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>合计</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      <Text strong style={{ color: semanticColors.income }}>
                        ¥{formatAmount(total)}
                      </Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <Text strong>100.0%</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <Text strong>{totalCount}</Text>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </Card>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="分类汇总报表"
      extra={<ReportExportButton title="分类汇总报表" data={currentData} />}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Date range picker */}
        <Card size="small">
          <Space>
            <Text strong>报表期间：</Text>
            <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          </Space>
        </Card>

        {/* Tabs: expense / income */}
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
        </Card>
      </Space>
    </PageContainer>
  );
};

export default CategoryReport;
