import React, { useEffect, useState } from 'react';
import { Tabs, Card, Table, Statistic, Row, Col } from 'antd';
import PageContainer from '@/components/PageContainer';
import AgingChart from './components/AgingChart';
import { getReceivables, getPayables, getAgingAnalysis } from '@/api/report';
import { formatAmount } from '@/utils/format';

interface SummaryItem {
  contactId: string;
  contactName: string;
  amount: number;
  count: number;
  earliestDate: string;
}

interface AgingBucket {
  range: string;
  amount: number;
}

const columns = [
  { title: '客户/供应商', dataIndex: 'contactName', key: 'contactName' },
  {
    title: '金额', dataIndex: 'amount', key: 'amount',
    render: (v: number) => `¥${formatAmount(v)}`,
    sorter: (a: SummaryItem, b: SummaryItem) => a.amount - b.amount,
  },
  { title: '笔数', dataIndex: 'count', key: 'count' },
  { title: '最早日期', dataIndex: 'earliestDate', key: 'earliestDate' },
];

const ReceivablePayable: React.FC = () => {
  const [tab, setTab] = useState('receivable');
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [aging, setAging] = useState<AgingBucket[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async (type: string) => {
    setLoading(true);
    try {
      const fn = type === 'receivable' ? getReceivables : getPayables;
      const res = await fn();
      setItems(res.data?.items ?? []);
      setTotal(res.data?.total ?? 0);
      const agingRes = await getAgingAnalysis(type);
      setAging(agingRes.data?.buckets ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(tab); }, [tab]);

  return (
    <PageContainer title="应收应付分析">
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'receivable', label: '应收账款' },
        { key: 'payable', label: '应付账款' },
      ]} />
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title={tab === 'receivable' ? '应收总额' : '应付总额'}
              value={total}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="涉及数量" value={items.length} suffix="家" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="总笔数"
              value={items.reduce((s, i) => s + i.count, 0)}
              suffix="笔"
            />
          </Card>
        </Col>
      </Row>
      <Card title={tab === 'receivable' ? '客户应收明细' : '供应商应付明细'} style={{ marginBottom: 24 }}>
        <Table
          rowKey="contactId"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={false}
        />
      </Card>
      <Card title="账龄分析">
        <AgingChart data={aging} />
      </Card>
    </PageContainer>
  );
};

export default ReceivablePayable;
