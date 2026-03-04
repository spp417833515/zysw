import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Spin, Statistic, Space, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Line, Column } from '@ant-design/charts';
import dayjs from 'dayjs';
import PageContainer from '@/components/PageContainer';
import { getTrendReport } from '@/api/report';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';
import ReportDateRangePicker from './components/ReportDateRangePicker';
import ReportExportButton from './components/ReportExportButton';

const { Text } = Typography;

interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

const TrendReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(11, 'month').startOf('month').format('YYYY-MM-DD'),
    dayjs().endOf('month').format('YYYY-MM-DD'),
  ]);
  const [trendData, setTrendData] = useState<MonthlyTrendItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res: any = await getTrendReport({ startDate: dateRange[0], endDate: dateRange[1] });
        setTrendData(res.data?.months ?? []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [dateRange]);

  const lineChartData = useMemo(() => {
    const result: { month: string; type: string; value: number }[] = [];
    trendData.forEach((item) => {
      result.push({ month: item.month, type: '收入', value: item.income });
      result.push({ month: item.month, type: '支出', value: item.expense });
    });
    return result;
  }, [trendData]);

  const columnChartData = useMemo(() => {
    return trendData.map((item) => ({
      month: item.month,
      value: item.profit,
      type: item.profit >= 0 ? '盈利' : '亏损',
    }));
  }, [trendData]);

  const stats = useMemo(() => {
    if (trendData.length === 0) return { avgIncome: 0, avgExpense: 0, incomeGrowth: null, expenseGrowth: null };
    const totalIncome = trendData.reduce((s, d) => s + d.income, 0);
    const totalExpense = trendData.reduce((s, d) => s + d.expense, 0);
    const avgIncome = totalIncome / trendData.length;
    const avgExpense = totalExpense / trendData.length;
    const firstIncome = trendData[0]?.income ?? 0;
    const lastIncome = trendData[trendData.length - 1]?.income ?? 0;
    const incomeGrowth = firstIncome > 0 ? (lastIncome - firstIncome) / firstIncome : null;
    const firstExpense = trendData[0]?.expense ?? 0;
    const lastExpense = trendData[trendData.length - 1]?.expense ?? 0;
    const expenseGrowth = firstExpense > 0 ? (lastExpense - firstExpense) / firstExpense : null;
    return { avgIncome, avgExpense, incomeGrowth, expenseGrowth };
  }, [trendData]);

  const lineConfig = {
    data: lineChartData,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    height: 380,
    smooth: true,
    color: [semanticColors.income, semanticColors.expense],
    point: { size: 4, shape: 'circle' },
    yAxis: {
      label: { formatter: (v: string) => `¥${Number(v).toLocaleString()}` },
    },
    tooltip: {
      formatter: (datum: any) => ({ name: datum.type, value: `¥${formatAmount(datum.value)}` }),
    },
    legend: { position: 'top' as const },
  };

  const columnConfig = {
    data: columnChartData,
    xField: 'month',
    yField: 'value',
    seriesField: 'type',
    height: 320,
    color: (datum: any) => datum.type === '盈利' ? semanticColors.income : semanticColors.expense,
    yAxis: {
      label: { formatter: (v: string) => `¥${Number(v).toLocaleString()}` },
    },
    tooltip: {
      formatter: (datum: any) => ({ name: '净利润', value: `¥${formatAmount(datum.value)}` }),
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
        <Card size="small">
          <Space>
            <Text strong>报表期间：</Text>
            <ReportDateRangePicker value={dateRange} onChange={setDateRange} />
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="平均月收入" value={stats.avgIncome} precision={2} prefix="¥" valueStyle={{ color: semanticColors.income }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="平均月支出" value={stats.avgExpense} precision={2} prefix="¥" valueStyle={{ color: semanticColors.expense }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              {stats.incomeGrowth !== null ? (
                <Statistic
                  title="收入增长率"
                  value={Math.abs(stats.incomeGrowth * 100)}
                  precision={1}
                  suffix="%"
                  prefix={stats.incomeGrowth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  valueStyle={{ color: stats.incomeGrowth >= 0 ? semanticColors.income : semanticColors.expense }}
                />
              ) : (
                <Statistic title="收入增长率" value="N/A" />
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              {stats.expenseGrowth !== null ? (
                <Statistic
                  title="支出增长率"
                  value={Math.abs(stats.expenseGrowth * 100)}
                  precision={1}
                  suffix="%"
                  prefix={stats.expenseGrowth >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  valueStyle={{ color: stats.expenseGrowth <= 0 ? semanticColors.income : semanticColors.expense }}
                />
              ) : (
                <Statistic title="支出增长率" value="N/A" />
              )}
            </Card>
          </Col>
        </Row>

        <Spin spinning={loading}>
          <Card title="收支趋势">
            <Line {...lineConfig} />
          </Card>
        </Spin>

        <Spin spinning={loading}>
          <Card title="月度净利润">
            <Column {...columnConfig} />
          </Card>
        </Spin>
      </Space>
    </PageContainer>
  );
};

export default TrendReport;
