import React, { useEffect, useState } from 'react';
import { Button, Table, Tag, Popconfirm, Space, Descriptions, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import { useReimbursementStore } from '@/store/useReimbursementStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { formatAmount } from '@/utils/format';
import type { ReimbursementBatch } from '@/types/reimbursement';
import CreateBatchModal from './components/CreateBatchModal';
import CompleteBatchModal from './components/CompleteBatchModal';

const ReimbursementPage: React.FC = () => {
  const { batches, loading, fetchBatches, deleteBatch } = useReimbursementStore();
  const transactions = useTransactionStore((s) => s.transactions);
  const fetchTransactions = useTransactionStore((s) => s.fetchTransactions);

  const [createOpen, setCreateOpen] = useState(false);
  const [completingBatch, setCompletingBatch] = useState<ReimbursementBatch | null>(null);

  useEffect(() => {
    fetchBatches();
    fetchTransactions();
  }, []);

  const refreshTxns = () => { fetchTransactions(); };

  const handleDelete = async (id: string) => {
    try {
      await deleteBatch(id);
      message.success('已删除');
      fetchTransactions();
    } catch {
      message.error('删除失败');
    }
  };

  const batchColumns = [
    { title: '批次号', dataIndex: 'batchNo', key: 'batchNo' },
    { title: '员工', dataIndex: 'employeeName', key: 'employeeName' },
    { title: '支出合计', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: number) => `¥${formatAmount(v)}` },
    { title: '笔数', dataIndex: 'transactionIds', key: 'count', render: (ids: string[]) => ids.length },
    { title: '报销金额', key: 'actualAmount', render: (_: unknown, r: ReimbursementBatch) => r.actualAmount != null ? `¥${formatAmount(r.actualAmount)}` : '-' },
    { title: '手续费', dataIndex: 'fee', key: 'fee', render: (v: number) => (v > 0 ? `¥${formatAmount(v)}` : '-') },
    { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => s === 'completed' ? <Tag color="green">已报销</Tag> : <Tag color="orange">待报销</Tag> },
    { title: '报销日期', dataIndex: 'completedDate', key: 'completedDate', render: (v: string) => v || '-' },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: ReimbursementBatch) =>
        record.status === 'pending' ? (
          <Space>
            <a onClick={() => setCompletingBatch(record)}>确认报销</a>
            <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Space>
        ) : <Tag>已完成</Tag>,
    },
  ];

  const expandedRowRender = (record: ReimbursementBatch) => {
    const relatedTxns = transactions.filter((t) => record.transactionIds.includes(t.id));
    return (
      <div>
        <Table size="small" dataSource={relatedTxns} rowKey="id" pagination={false}
          columns={[
            { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
            { title: '描述', dataIndex: 'description', key: 'description' },
            { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${formatAmount(v)}` },
          ]}
        />
        {record.status === 'completed' && (
          <Descriptions size="small" column={4} style={{ marginTop: 8 }}>
            <Descriptions.Item label="报销给">{record.employeeName}</Descriptions.Item>
            <Descriptions.Item label="报销金额">¥{formatAmount(record.actualAmount ?? record.totalAmount)}</Descriptions.Item>
            <Descriptions.Item label="手续费">¥{formatAmount(record.fee)}</Descriptions.Item>
            <Descriptions.Item label="实际转出">¥{formatAmount((record.actualAmount ?? record.totalAmount) + record.fee)}</Descriptions.Item>
          </Descriptions>
        )}
      </div>
    );
  };

  return (
    <PageContainer title="报销管理" extra={
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>创建报销单</Button>
    }>
      <Table rowKey="id" loading={loading} dataSource={batches} columns={batchColumns}
        expandable={{ expandedRowRender }} pagination={{ pageSize: 10 }} />

      <CreateBatchModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={refreshTxns} />
      <CompleteBatchModal batch={completingBatch} onClose={() => setCompletingBatch(null)} onSuccess={refreshTxns} />
    </PageContainer>
  );
};

export default ReimbursementPage;
