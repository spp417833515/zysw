import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Statistic, Space, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { Column } from '@ant-design/charts';
import dayjs from 'dayjs';
import PageContainer from '@/components/PageContainer';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';
import ReportDateRangePicker from './components/ReportDateRangePicker';
import ReportExportButton from './components/ReportExportButton';

const { Text } = Typography;

interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
  netProfit: number;
}

/** Generate 12 months of mock trend data */
function generateTrendData(): MonthlyTrendItem[] {
  const data: MonthlyTrendItem[] = [];
  for (let i = 11; i >= 0; i--) {
    const month = dayjs().subtract(i, 'month').format('YYYY-MM');
    const baseIncome = 35000 + i * 800;
    const baseExpense = 25000 + i * 500;
    const income = Math.round(baseIncome + (Math.random() - 0.3) * 10000);
    const expense = Math.round(baseExpense + (Math.random() - 0.3) * 8000);
    data.push({
      month,
      income,
      expense,
      netProfit: income - expense,
    });
  }
  return data;
}

const TrendReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(11, 'month').startOf('month').format('YYYY-MM-DD'),
    dayjs().endOf('month').format('YYYY-MM-DD'),
  ]);

  const trendData = useMemo(() => generateTrendData(), []);

  /** Line chart data: income and expense series */
  const lineChartData = useMemo(() => {
    const result: { month: string; type: string; value: number }[] = [];
    trendData.forEach((item) => {
      result.push({ month: item.month, type: '收入', value: item.income });
      result.push({ month: item.month, type: '支出', value: item.expense });
    });
    return result;
  }, [trendData]);

  /** Column chart data: net profit per month */
  const columnChartData = useMemo(() => {
    return trendData.map((item) => ({
      month: item.month,
      value: item.netProfit,
      type: item.netProfit >= 0 ? '盈利' : '亏损',
    }));
  }, [trendData]);

  /** Summary statistics */
  const stats = useMemo(() => {
    const totalIncome = trendData.reduce((s, d) => s + d.income, 0);
    const totalExpense = trendData.reduce((s, d) => s + d.expense, 0);
    const avgIncome = totalIncome / trendData.length;
    const avgExpense = totalExpense / trendData.length;

    // Growth rate: compare last month to first month
    const firstIncome = trendData[0]?.income || 1;
    const lastIncome = trendData[trendData.length - 1]?.income || 0;
    const incomeGrowth = (lastIncome - firstIncome) / firstIncome;

    const firstExpense = trendData[0]?.expense || 1;
    const lastExpense = trendData[trendData.length - 1]?.expense || 0;
    const expenseGrowth = (lastExpense - firstExpense) / firstExpense;

    return { avgIncome, avgExpense, incomeGrowth, expenseGrowth };
  }, [trendData]);

  /** Line chart config */
  const lineConfig = {
    data: lineChartData,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    height: 380,
    smooth: true,
    color: [semanticColors.income, semanticColors.expense],
    point: {
      size: 4,
      shape: 'circle',
    },
    yAxis: {
      label: {
        formatter: (v: string) => `¥${Number(v).toLocaleString()}`,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.type,
        value: `¥${formatAmount(datum.value)}`,
      }),
    },
    legend: { position: 'top' as const },
  };

  /** Column chart config */
  const columnConfig = {
    data: columnChartData,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    height: 320,
    color: (datum: any) => {
      return datum.type === '盈利' ? semanticColors.income : semanticColors.expense;
    },
    yAxis: {
      label: {
        formatter: (v: string) => `¥${Number(v).toLocaleString()}`,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: '净利润',
        value: `¥${formatAmount(datum.value)}`,
      }),
    },
    legend: { position: 'top' as const },
    label: {
      position: 'top' as const,
      formatter: (datum: any) => `¥${formatAmount(datum.value)}`,
      style: { fontSize: 10 },
    },
  };

  return (
    <PageContainer
      title="趋势分析报表"
      extra={<ReportExportButton title="趋势分析报表" data={trendData} />}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Date range picker */}
        <Card size="small">
          <Space>
            <Text strong>报表期间：</Text>
            <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          </Space>
        </Card>

        {/* Summary statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="平均月收入"
                value={stats.avgIncome}
                precision={2}
                prefix="¥"
                valueStyle={{ color: semanticColors.income }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="平均月支出"
                value={stats.avgExpense}
                precision={2}
                prefix="¥"
                valueStyle={{ color: semanticColors.expense }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="收入增长率"
                value={Math.abs(stats.incomeGrowth * 100)}
                precision={1}
                suffix="%"
                prefix={stats.incomeGrowth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                valueStyle={{
                  color: stats.incomeGrowth >= 0 ? semanticColors.income : semanticColors.expense,
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="支出增长率"
                value={Math.abs(stats.expenseGrowth * 100)}
                precision={1}
                suffix="%"
                prefix={stats.expenseGrowth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                valueStyle={{
                  color: stats.expenseGrowth <= 0 ? semanticColors.income : semanticColors.expense,
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Line chart: income & expense trends */}
        <Card title="收支趋势">
          <Line {...lineConfig} />
        </Card>

        {/* Column chart: monthly net profit */}
        <Card title="月度净利润">
          <Column {...columnConfig} />
        </Card>
      </Space>
    </PageContainer>
  );
};

export default TrendReport;
