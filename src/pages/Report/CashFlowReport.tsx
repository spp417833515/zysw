import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Table, Statistic, Space, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Area } from '@ant-design/charts';
import dayjs from 'dayjs';
import PageContainer from '@/components/PageContainer';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';
import ReportDateRangePicker from './components/ReportDateRangePicker';
import ReportExportButton from './components/ReportExportButton';

const { Text } = Typography;

/** Generate 6 months of mock cash flow data */
function generateCashFlowData() {
  const data: { month: string; type: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const month = dayjs().subtract(i, 'month').format('YYYY-MM');
    const operatingIn = Math.round(30000 + Math.random() * 20000);
    const operatingOut = Math.round(20000 + Math.random() * 15000);
    const investingIn = Math.round(2000 + Math.random() * 5000);
    const investingOut = Math.round(5000 + Math.random() * 8000);
    const financingIn = Math.round(5000 + Math.random() * 10000);
    const financingOut = Math.round(3000 + Math.random() * 6000);

    data.push({ month, type: '经营活动流入', value: operatingIn });
    data.push({ month, type: '经营活动流出', value: -operatingOut });
    data.push({ month, type: '投资活动流入', value: investingIn });
    data.push({ month, type: '投资活动流出', value: -investingOut });
    data.push({ month, type: '筹资活动流入', value: financingIn });
    data.push({ month, type: '筹资活动流出', value: -financingOut });
  }
  return data;
}

/** Generate area chart data: net cash flow per month */
function generateAreaChartData() {
  const data: { month: string; category: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const month = dayjs().subtract(i, 'month').format('YYYY-MM');
    data.push({
      month,
      category: '经营活动',
      value: Math.round(8000 + Math.random() * 12000),
    });
    data.push({
      month,
      category: '投资活动',
      value: Math.round(-5000 + Math.random() * 4000),
    });
    data.push({
      month,
      category: '筹资活动',
      value: Math.round(1000 + Math.random() * 6000),
    });
  }
  return data;
}

const CashFlowReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().startOf('month').format('YYYY-MM-DD'),
    dayjs().endOf('month').format('YYYY-MM-DD'),
  ]);

  const cashFlowRawData = useMemo(() => generateCashFlowData(), []);
  const areaChartData = useMemo(() => generateAreaChartData(), []);

  /** Summarize by activity type */
  const summaries = useMemo(() => {
    const operating = cashFlowRawData
      .filter((d) => d.type.startsWith('经营'))
      .reduce((s, d) => s + d.value, 0);
    const investing = cashFlowRawData
      .filter((d) => d.type.startsWith('投资'))
      .reduce((s, d) => s + d.value, 0);
    const financing = cashFlowRawData
      .filter((d) => d.type.startsWith('筹资'))
      .reduce((s, d) => s + d.value, 0);
    const netCash = operating + investing + financing;
    return { operating, investing, financing, netCash };
  }, [cashFlowRawData]);

  /** Table data: breakdown of inflows and outflows */
  const tableData = useMemo(() => {
    const groups = ['经营活动', '投资活动', '筹资活动'];
    const rows: { key: string; name: string; inflow: number; outflow: number; net: number; isGroup: boolean }[] = [];

    groups.forEach((group, gi) => {
      const inItems = cashFlowRawData.filter(
        (d) => d.type.startsWith(group.slice(0, 2)) && d.value > 0,
      );
      const outItems = cashFlowRawData.filter(
        (d) => d.type.startsWith(group.slice(0, 2)) && d.value < 0,
      );
      const inflow = inItems.reduce((s, d) => s + d.value, 0);
      const outflow = Math.abs(outItems.reduce((s, d) => s + d.value, 0));
      rows.push({
        key: `g-${gi}`,
        name: group,
        inflow,
        outflow,
        net: inflow - outflow,
        isGroup: true,
      });
    });

    const totalInflow = rows.reduce((s, r) => s + r.inflow, 0);
    const totalOutflow = rows.reduce((s, r) => s + r.outflow, 0);
    rows.push({
      key: 'total',
      name: '合计',
      inflow: totalInflow,
      outflow: totalOutflow,
      net: totalInflow - totalOutflow,
      isGroup: true,
    });

    return rows;
  }, [cashFlowRawData]);

  const areaConfig = {
    data: areaChartData,
    xField: 'month',
    yField: 'value',
    seriesField: 'category',
    smooth: true,
    height: 350,
    areaStyle: { fillOpacity: 0.3 },
    color: [semanticColors.income, semanticColors.expense, semanticColors.transfer],
    yAxis: {
      label: {
        formatter: (v: string) => `¥${Number(v).toLocaleString()}`,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.category,
        value: `¥${formatAmount(datum.value)}`,
      }),
    },
    legend: { position: 'top' as const },
  };

  const tableColumns = [
    {
      title: '项目',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Text strong={record.isGroup}>{text}</Text>
      ),
    },
    {
      title: '流入（元）',
      dataIndex: 'inflow',
      key: 'inflow',
      align: 'right' as const,
      render: (val: number) => (
        <Text style={{ color: semanticColors.income }}>¥{formatAmount(val)}</Text>
      ),
    },
    {
      title: '流出（元）',
      dataIndex: 'outflow',
      key: 'outflow',
      align: 'right' as const,
      render: (val: number) => (
        <Text style={{ color: semanticColors.expense }}>¥{formatAmount(val)}</Text>
      ),
    },
    {
      title: '净额（元）',
      dataIndex: 'net',
      key: 'net',
      align: 'right' as const,
      render: (val: number) => (
        <Text strong style={{ color: val >= 0 ? semanticColors.income : semanticColors.expense }}>
          ¥{formatAmount(val)}
        </Text>
      ),
    },
  ];

  return (
    <PageContainer
      title="现金流量表"
      extra={<ReportExportButton title="现金流量表" data={tableData} />}
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
                title="经营活动现金流"
                value={summaries.operating}
                precision={2}
                prefix="¥"
                valueStyle={{
                  color: summaries.operating >= 0 ? semanticColors.income : semanticColors.expense,
                }}
                suffix={
                  summaries.operating >= 0 ? (
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
                title="投资活动现金流"
                value={summaries.investing}
                precision={2}
                prefix="¥"
                valueStyle={{
                  color: summaries.investing >= 0 ? semanticColors.income : semanticColors.expense,
                }}
                suffix={
                  summaries.investing >= 0 ? (
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
                title="筹资活动现金流"
                value={summaries.financing}
                precision={2}
                prefix="¥"
                valueStyle={{
                  color: summaries.financing >= 0 ? semanticColors.income : semanticColors.expense,
                }}
                suffix={
                  summaries.financing >= 0 ? (
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
                title="现金净增加额"
                value={summaries.netCash}
                precision={2}
                prefix="¥"
                valueStyle={{
                  color: summaries.netCash >= 0 ? semanticColors.income : semanticColors.expense,
                }}
                suffix={
                  summaries.netCash >= 0 ? (
                    <ArrowUpOutlined style={{ fontSize: 14 }} />
                  ) : (
                    <ArrowDownOutlined style={{ fontSize: 14 }} />
                  )
                }
              />
            </Card>
          </Col>
        </Row>

        {/* Area chart */}
        <Card title="现金流量趋势">
          <Area {...areaConfig} />
        </Card>

        {/* Breakdown table */}
        <Card title="现金流量明细">
          <Table
            columns={tableColumns}
            dataSource={tableData}
            pagination={false}
            size="middle"
            bordered
          />
        </Card>
      </Space>
    </PageContainer>
  );
};

export default CashFlowReport;
