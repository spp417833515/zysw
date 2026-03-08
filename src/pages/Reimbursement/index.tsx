import React, { useEffect, useState } from 'react';
import { Button, Table, Tag, Popconfirm, Space, Descriptions, message, Modal, Form } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import AccountSelect from '@/components/AccountSelect';
import { useReimbursementStore } from '@/store/useReimbursementStore';
import { formatAmount } from '@/utils/format';
import type { ReimbursementBatch } from '@/types/reimbursement';
import CreateBatchModal from './components/CreateBatchModal';
import CompleteBatchModal from './components/CompleteBatchModal';

const ReimbursementPage: React.FC = () => {
  const { batches, loading, fetchBatches, deleteBatch, confirmPayment } = useReimbursementStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [completingBatch, setCompletingBatch] = useState<ReimbursementBatch | null>(null);
  const [payingBatch, setPayingBatch] = useState<ReimbursementBatch | null>(null);
  const [payForm] = Form.useForm();
  const [paySubmitting, setPaySubmitting] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteBatch(id);
      message.success('已删除');
    } catch {
      message.error('删除失败');
    }
  };

  const handleConfirmPayment = async () => {
    if (!payingBatch) return;
    const values = await payForm.validateFields().catch(() => null);
    if (!values) return;
    setPaySubmitting(true);
    try {
      await confirmPayment(payingBatch.id, values.accountId);
      message.success('已确认打款，支出流水已生成');
      setPayingBatch(null);
      payForm.resetFields();
    } catch {
      message.error('操作失败');
    } finally {
      setPaySubmitting(false);
    }
  };

  const batchColumns = [
    { title: '批次号', dataIndex: 'batchNo', key: 'batchNo' },
    { title: '员工', dataIndex: 'employeeName', key: 'employeeName' },
    { title: '支出合计', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: number) => `¥${formatAmount(v)}` },
    { title: '笔数', dataIndex: 'transactionIds', key: 'count', render: (ids: string[]) => ids.length },
    { title: '报销金额', key: 'actualAmount', render: (_: unknown, r: ReimbursementBatch) => r.actualAmount != null ? `¥${formatAmount(r.actualAmount)}` : '-' },
    { title: '手续费', dataIndex: 'fee', key: 'fee', render: (v: number) => (v > 0 ? `¥${formatAmount(v)}` : '-') },
    {
      title: '状态', key: 'status',
      render: (_: unknown, r: ReimbursementBatch) => {
        if (r.status === 'pending') return <Tag color="orange">待确认</Tag>;
        if (r.status === 'confirmed') return <Tag color="blue">待打款</Tag>;
        return <Tag color="green">已打款</Tag>;
      },
    },
    { title: '报销日期', dataIndex: 'completedDate', key: 'completedDate', render: (v: string) => v || '-' },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: ReimbursementBatch) => {
        if (record.status === 'pending') {
          return (
            <Space>
              <a onClick={() => setCompletingBatch(record)}>确认金额</a>
              <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
                <a style={{ color: '#ff4d4f' }}>删除</a>
              </Popconfirm>
            </Space>
          );
        }
        if (record.status === 'confirmed') {
          return <a onClick={() => setPayingBatch(record)} style={{ color: '#f5222d', fontWeight: 500 }}>确认打款</a>;
        }
        return <Tag>已打款</Tag>;
      },
    },
  ];

  const expandedRowRender = (record: ReimbursementBatch) => {
    return (
      <div>
        <Table size="small" dataSource={record.transactions || []} rowKey="id" pagination={false}
          columns={[
            { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
            { title: '描述', dataIndex: 'description', key: 'description' },
            { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => `¥${formatAmount(v)}` },
          ]}
        />
        {record.status !== 'pending' && (
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

      <CreateBatchModal open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={() => fetchBatches()} />
      <CompleteBatchModal batch={completingBatch} onClose={() => setCompletingBatch(null)} onSuccess={() => fetchBatches()} />

      <Modal
        title="确认打款"
        open={!!payingBatch}
        onCancel={() => { setPayingBatch(null); payForm.resetFields(); }}
        onOk={handleConfirmPayment}
        confirmLoading={paySubmitting}
        okText="确认打款"
        okButtonProps={{ danger: true }}
      >
        {payingBatch && (
          <div style={{ marginBottom: 16 }}>
            <p>批次 {payingBatch.batchNo}，报销给 {payingBatch.employeeName}</p>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#f5222d' }}>
              打款金额：¥{formatAmount(payingBatch.actualAmount ?? payingBatch.totalAmount)}
            </p>
            <p style={{ color: '#999' }}>确认后将自动生成一笔支出流水</p>
          </div>
        )}
        <Form form={payForm} layout="vertical">
          <Form.Item name="accountId" label="打款账户">
            <AccountSelect placeholder="请选择打款账户（可选）" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default ReimbursementPage;
