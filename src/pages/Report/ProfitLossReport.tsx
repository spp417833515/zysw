import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Statistic, Space, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import PageContainer from '@/components/PageContainer';
import { getProfitLossReport } from '@/api/report';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';
import ReportDateRangePicker from './components/ReportDateRangePicker';
import ReportExportButton from './components/ReportExportButton';

const { Text } = Typography;

interface CategoryItem {
  categoryId: string;
  categoryName: string;
  amount: number;
}

const ProfitLossReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().startOf('month').format('YYYY-MM-DD'),
    dayjs().endOf('month').format('YYYY-MM-DD'),
  ]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [incomeByCategory, setIncomeByCategory] = useState<CategoryItem[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res: any = await getProfitLossReport({ startDate: dateRange[0], endDate: dateRange[1] });
        const d = res.data;
        setTotalIncome(d.totalIncome ?? 0);
        setTotalExpense(d.totalExpense ?? 0);
        setNetProfit(d.netProfit ?? 0);
        setIncomeByCategory(d.incomeByCategory ?? []);
        setExpenseByCategory(d.expenseByCategory ?? []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [dateRange]);

  const tableData = (() => {
    const rows: { key: string; name: string; amount: number | null; isGroup: boolean; isTotal?: boolean }[] = [];

    rows.push({ key: 'g1', name: '一、营业收入', amount: null, isGroup: true });
    incomeByCategory.forEach((item, idx) => {
      rows.push({ key: `i-${idx}`, name: `    ${item.categoryName}`, amount: item.amount, isGroup: false });
    });
    rows.push({ key: 't1', name: '营业收入合计', amount: totalIncome, isGroup: false, isTotal: true });

    rows.push({ key: 'g2', name: '二、营业支出', amount: null, isGroup: true });
    expenseByCategory.forEach((item, idx) => {
      rows.push({ key: `e-${idx}`, name: `    ${item.categoryName}`, amount: item.amount, isGroup: false });
    });
    rows.push({ key: 't2', name: '营业支出合计', amount: totalExpense, isGroup: false, isTotal: true });

    rows.push({ key: 'g3', name: '三、净利润', amount: netProfit, isGroup: true, isTotal: true });

    return rows;
  })();

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
          ? val >= 0 ? semanticColors.income : semanticColors.expense
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
        <Card size="small">
          <Space>
            <Text strong>报表期间：</Text>
            <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
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
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="营业支出"
                value={totalExpense}
                precision={2}
                prefix="¥"
                valueStyle={{ color: semanticColors.expense }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="净利润"
                value={netProfit}
                precision={2}
                prefix="¥"
                valueStyle={{ color: netProfit >= 0 ? semanticColors.income : semanticColors.expense }}
                suffix={netProfit >= 0 ? <ArrowUpOutlined style={{ fontSize: 14 }} /> : <ArrowDownOutlined style={{ fontSize: 14 }} />}
              />
            </Card>
          </Col>
        </Row>

        <Card title="利润表明细">
          <Table
            columns={columns}
            dataSource={tableData}
            pagination={false}
            size="middle"
            bordered
            loading={loading}
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
