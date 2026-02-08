import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Table, Statistic, Space, Typography } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageContainer from '@/components/PageContainer';
import { mockTransactions } from '@/mock/data';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';
import ReportDateRangePicker from './components/ReportDateRangePicker';
import ReportExportButton from './components/ReportExportButton';

const { Text } = Typography;

/** Category grouping for profit & loss statement */
const COST_CATEGORIES = ['采购成本'];
const EXPENSE_CATEGORIES = ['人力成本', '办公费用', '营销费用'];
const TAX_CATEGORIES = ['税费'];

const ProfitLossReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().startOf('month').format('YYYY-MM-DD'),
    dayjs().endOf('month').format('YYYY-MM-DD'),
  ]);

  /** Filter transactions by date range */
  const filteredTransactions = useMemo(() => {
    const [start, end] = dateRange;
    return mockTransactions.filter((t) => {
      const d = dayjs(t.date);
      return d.isAfter(dayjs(start).subtract(1, 'day')) && d.isBefore(dayjs(end).add(1, 'day'));
    });
  }, [dateRange]);

  /** Aggregate income by category */
  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        const cat = t.categoryName || '其他收入';
        map[cat] = (map[cat] || 0) + t.amount;
      });
    return Object.entries(map).map(([name, amount]) => ({ name, amount }));
  }, [filteredTransactions]);

  /** Aggregate expense by category groups */
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.categoryName || '其他费用';
        map[cat] = (map[cat] || 0) + t.amount;
      });
    return map;
  }, [filteredTransactions]);

  const totalIncome = useMemo(
    () => incomeByCategory.reduce((sum, item) => sum + item.amount, 0),
    [incomeByCategory],
  );

  const totalCost = useMemo(
    () =>
      COST_CATEGORIES.reduce((sum, cat) => sum + (expenseByCategory[cat] || 0), 0),
    [expenseByCategory],
  );

  const totalExpense = useMemo(
    () =>
      EXPENSE_CATEGORIES.reduce((sum, cat) => sum + (expenseByCategory[cat] || 0), 0),
    [expenseByCategory],
  );

  const totalTax = useMemo(
    () =>
      TAX_CATEGORIES.reduce((sum, cat) => sum + (expenseByCategory[cat] || 0), 0),
    [expenseByCategory],
  );

  const operatingProfit = totalIncome - totalCost - totalExpense - totalTax;
  const netProfit = operatingProfit; // Simplified: net = operating for this mock

  /** Build table data source */
  const tableData = useMemo(() => {
    const rows: {
      key: string;
      name: string;
      amount: number | null;
      isGroup: boolean;
      isTotal?: boolean;
    }[] = [];

    // Section 1: Revenue
    rows.push({ key: 'g1', name: '一、营业收入', amount: null, isGroup: true });
    incomeByCategory.forEach((item, idx) => {
      rows.push({ key: `i-${idx}`, name: `    ${item.name}`, amount: item.amount, isGroup: false });
    });
    rows.push({ key: 't1', name: '营业收入合计', amount: totalIncome, isGroup: false, isTotal: true });

    // Section 2: Cost
    rows.push({ key: 'g2', name: '二、营业成本', amount: null, isGroup: true });
    COST_CATEGORIES.forEach((cat, idx) => {
      rows.push({
        key: `c-${idx}`,
        name: `    ${cat}`,
        amount: expenseByCategory[cat] || 0,
        isGroup: false,
      });
    });
    rows.push({ key: 't2', name: '营业成本合计', amount: totalCost, isGroup: false, isTotal: true });

    // Section 3: Operating expenses
    rows.push({ key: 'g3', name: '三、营业费用', amount: null, isGroup: true });
    EXPENSE_CATEGORIES.forEach((cat, idx) => {
      rows.push({
        key: `e-${idx}`,
        name: `    ${cat}`,
        amount: expenseByCategory[cat] || 0,
        isGroup: false,
      });
    });
    rows.push({ key: 't3', name: '营业费用合计', amount: totalExpense, isGroup: false, isTotal: true });

    // Section 4: Tax
    rows.push({ key: 'g4', name: '四、税费', amount: null, isGroup: true });
    TAX_CATEGORIES.forEach((cat, idx) => {
      rows.push({
        key: `tx-${idx}`,
        name: `    ${cat}`,
        amount: expenseByCategory[cat] || 0,
        isGroup: false,
      });
    });
    rows.push({ key: 't4', name: '税费合计', amount: totalTax, isGroup: false, isTotal: true });

    // Section 5: Operating profit
    rows.push({
      key: 'g5',
      name: '五、营业利润',
      amount: operatingProfit,
      isGroup: true,
      isTotal: true,
    });

    return rows;
  }, [incomeByCategory, expenseByCategory, totalIncome, totalCost, totalExpense, totalTax, operatingProfit]);

  const columns = [
    {
      title: '项目',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Text strong={record.isGroup || record.isTotal}>{text}</Text>
      ),
    },
    {
      title: '金额（元）',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      width: 200,
      render: (val: number | null, record: any) => {
        if (val === null) return '-';
        const color = record.isTotal && record.isGroup
          ? val >= 0
            ? semanticColors.income
            : semanticColors.expense
          : undefined;
        return (
          <Text strong={record.isTotal} style={{ color }}>
            ¥{formatAmount(val)}
          </Text>
        );
      },
    },
  ];

  return (
    <PageContainer
      title="利润表"
      extra={<ReportExportButton title="利润表" data={tableData} />}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Date range picker */}
        <Card size="small">
          <Space>
            <Text strong>报表期间：</Text>
            <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          </Space>
        </Card>

        {/* Summary cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="营业收入"
                value={totalIncome}
                precision={2}
                prefix="¥"
                valueStyle={{ color: semanticColors.income }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="营业成本"
                value={totalCost}
                precision={2}
                prefix="¥"
                valueStyle={{ color: semanticColors.expense }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="营业利润"
                value={operatingProfit}
                precision={2}
                prefix="¥"
                valueStyle={{ color: operatingProfit >= 0 ? semanticColors.income : semanticColors.expense }}
                suffix={
                  operatingProfit >= 0 ? (
                    <ArrowUpOutlined style={{ fontSize: 14 }} />
                  ) : (
                    <ArrowDownOutlined style={{ fontSize: 14 }} />
                  )
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="净利润"
                value={netProfit}
                precision={2}
                prefix="¥"
                valueStyle={{ color: netProfit >= 0 ? semanticColors.income : semanticColors.expense }}
                suffix={
                  netProfit >= 0 ? (
                    <ArrowUpOutlined style={{ fontSize: 14 }} />
                  ) : (
                    <ArrowDownOutlined style={{ fontSize: 14 }} />
                  )
                }
              />
            </Card>
          </Col>
        </Row>

        {/* Detailed table */}
        <Card title="利润表明细">
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            size="middle"
            bordered
            rowClassName={(record) =>
              record.isGroup ? 'report-group-row' : record.isTotal ? 'report-total-row' : ''
            }
          />
        </Card>
      </Space>
    </PageContainer>
  );
};

export default ProfitLossReport;
