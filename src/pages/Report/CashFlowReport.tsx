import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Statistic, Space, Typography } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Area } from '@ant-design/charts';
import dayjs from 'dayjs';
import PageContainer from '@/components/PageContainer';
import { getCashFlowReport } from '@/api/report';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';
import ReportDateRangePicker from './components/ReportDateRangePicker';
import ReportExportButton from './components/ReportExportButton';

const { Text } = Typography;

interface ByAccountItem {
  accountId: string;
  accountName: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface ByMonthItem {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

const CashFlowReport: React.FC = () => {
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(5, 'month').startOf('month').format('YYYY-MM-DD'),
    dayjs().endOf('month').format('YYYY-MM-DD'),
  ]);
  const [inflow, setInflow] = useState(0);
  const [outflow, setOutflow] = useState(0);
  const [netFlow, setNetFlow] = useState(0);
  const [byAccount, setByAccount] = useState<ByAccountItem[]>([]);
  const [byMonth, setByMonth] = useState<ByMonthItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res: any = await getCashFlowReport({ startDate: dateRange[0], endDate: dateRange[1] });
        const d = res.data;
        setInflow(d.inflow ?? 0);
        setOutflow(d.outflow ?? 0);
        setNetFlow(d.netFlow ?? 0);
        setByAccount(d.byAccount ?? []);
        setByMonth(d.byMonth ?? []);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [dateRange]);

  const areaChartData = byMonth.flatMap((m) => [
    { month: m.month, category: '流入', value: m.inflow },
    { month: m.month, category: '流出', value: m.outflow },
    { month: m.month, category: '净额', value: m.net },
  ]);

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
      label: { formatter: (v: string) => `¥${Number(v).toLocaleString()}` },
    },
    tooltip: {
      formatter: (datum: any) => ({ name: datum.category, value: `¥${formatAmount(datum.value)}` }),
    },
    legend: { position: 'top' as const },
  };

  const tableData = [
    ...byAccount.map((a, i) => ({ key: `a-${i}`, name: a.accountName, inflow: a.inflow, outflow: a.outflow, net: a.net, isGroup: false })),
    { key: 'total', name: '合计', inflow, outflow, net: netFlow, isGroup: true },
  ];

  const tableColumns = [
    {
      title: '账户',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => <Text strong={record.isGroup}>{text}</Text>,
    },
    {
      title: '流入（元）',
      dataIndex: 'inflow',
      key: 'inflow',
      align: 'right' as const,
      render: (val: number) => <Text style={{ color: semanticColors.income }}>¥{formatAmount(val)}</Text>,
    },
    {
      title: '流出（元）',
      dataIndex: 'outflow',
      key: 'outflow',
      align: 'right' as const,
      render: (val: number) => <Text style={{ color: semanticColors.expense }}>¥{formatAmount(val)}</Text>,
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

  const ArrowIcon = ({ value }: { value: number }) =>
    value >= 0 ? <ArrowUpOutlined style={{ fontSize: 14 }} /> : <ArrowDownOutlined style={{ fontSize: 14 }} />;

  return (
    <PageContainer
      title="现金流量表"
      extra={<ReportExportButton title="现金流量表" data={tableData} />}
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
                title="现金流入"
                value={inflow}
                precision={2}
                prefix="¥"
                valueStyle={{ color: semanticColors.income }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="现金流出"
                value={outflow}
                precision={2}
                prefix="¥"
                valueStyle={{ color: semanticColors.expense }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="现金净额"
                value={netFlow}
                precision={2}
                prefix="¥"
                valueStyle={{ color: netFlow >= 0 ? semanticColors.income : semanticColors.expense }}
                suffix={<ArrowIcon value={netFlow} />}
              />
            </Card>
          </Col>
        </Row>

        <Card title="现金流量趋势">
          <Area {...areaConfig} />
        </Card>

        <Card title="按账户明细">
          <Table
            columns={tableColumns}
            dataSource={tableData}
            pagination={false}
            size="middle"
            bordered
            loading={loading}
          />
        </Card>
      </Space>
    </PageContainer>
  );
};

export default CashFlowReport;
