import React, { useState, useEffect } from 'react';
import { Card, Table, Tabs, Space, Typography } from 'antd';
import { Pie } from '@ant-design/charts';
import dayjs from 'dayjs';
import PageContainer from '@/components/PageContainer';
import { getCategoryReport } from '@/api/report';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';
import ReportDateRangePicker from './components/ReportDateRangePicker';
import ReportExportButton from './components/ReportExportButton';

const { Text } = Typography;

interface CategoryItem {
  key: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

const CategoryReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().startOf('month').format('YYYY-MM-DD'),
    dayjs().endOf('month').format('YYYY-MM-DD'),
  ]);
  const [activeTab, setActiveTab] = useState<string>('expense');
  const [expenseData, setExpenseData] = useState<CategoryItem[]>([]);
  const [incomeData, setIncomeData] = useState<CategoryItem[]>([]);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [incomeTotal, setIncomeTotal] = useState(0);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [expRes, incRes] = await Promise.all([
          getCategoryReport({ startDate: dateRange[0], endDate: dateRange[1], type: 'expense' }),
          getCategoryReport({ startDate: dateRange[0], endDate: dateRange[1], type: 'income' }),
        ]);
        const mapItems = (cats: { categoryId: string; categoryName: string; amount: number; percentage: number }[]) => cats.map((c) => ({
          key: c.categoryId || c.categoryName,
          categoryName: c.categoryName,
          amount: c.amount,
          percentage: c.percentage,
        }));
        setExpenseData(mapItems(expRes.data?.categories ?? []));
        setExpenseTotal(expRes.data?.total ?? 0);
        setIncomeData(mapItems(incRes.data?.categories ?? []));
        setIncomeTotal(incRes.data?.total ?? 0);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [dateRange]);

  const currentData = activeTab === 'expense' ? expenseData : incomeData;
  const currentTotal = activeTab === 'expense' ? expenseTotal : incomeTotal;
  const currentColor = activeTab === 'expense' ? semanticColors.expense : semanticColors.income;

  const pieConfig = {
    data: currentData.map((d) => ({ type: d.categoryName, value: d.amount })),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.5,
    height: 380,
    label: { type: 'outer' as const, content: '{name} {percentage}' },
    interactions: [{ type: 'element-active' }],
    statistic: {
      title: { content: activeTab === 'expense' ? '总支出' : '总收入', style: { fontSize: '14px' } },
      content: {
        style: { fontSize: '18px', fontWeight: 'bold', color: currentColor },
        formatter: () => `¥${formatAmount(currentTotal)}`,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({ name: datum.type, value: `¥${formatAmount(datum.value)}` }),
    },
  };

  const columns = [
    { title: '分类', dataIndex: 'categoryName', key: 'categoryName', render: (text: string) => <Text strong>{text}</Text> },
    {
      title: '金额（元）', dataIndex: 'amount', key: 'amount', align: 'right' as const,
      sorter: (a: CategoryItem, b: CategoryItem) => a.amount - b.amount,
      render: (val: number) => <Text style={{ color: currentColor }}>¥{formatAmount(val)}</Text>,
    },
    {
      title: '占比', dataIndex: 'percentage', key: 'percentage', align: 'right' as const, width: 100,
      sorter: (a: CategoryItem, b: CategoryItem) => a.percentage - b.percentage,
      render: (val: number) => `${val.toFixed(1)}%`,
    },
  ];

  const renderTab = (data: CategoryItem[], total: number, color: string) => (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card><Pie {...pieConfig} /></Card>
      <Card>
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          size="middle"
          loading={loading}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><Text strong>合计</Text></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <Text strong style={{ color }}>¥{formatAmount(total)}</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><Text strong>100.0%</Text></Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>
    </Space>
  );

  const tabItems = [
    { key: 'expense', label: '支出分析', children: renderTab(expenseData, expenseTotal, semanticColors.expense) },
    { key: 'income', label: '收入分析', children: renderTab(incomeData, incomeTotal, semanticColors.income) },
  ];

  return (
    <PageContainer
      title="分类汇总报表"
      extra={<ReportExportButton title="分类汇总报表" data={currentData} />}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card size="small">
          <Space>
            <Text strong>报表期间：</Text>
            <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          </Space>
        </Card>
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </Card>
      </Space>
    </PageContainer>
  );
};

export default CategoryReport;
