import React, { useState, useMemo } from 'react';
import { Modal, Form, Input, Table, Select, message } from 'antd';
import { useReimbursementStore } from '@/store/useReimbursementStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { formatAmount } from '@/utils/format';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateBatchModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const createBatch = useReimbursementStore((s) => s.createBatch);
  const transactions = useTransactionStore((s) => s.transactions);

  const [form] = Form.useForm();
  const [selectedTxnIds, setSelectedTxnIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [filterEmployee, setFilterEmployee] = useState<string | undefined>(undefined);

  const availableTxns = transactions.filter(
    (t) => t.paymentAccountType === 'personal' && !t.reimbursementBatchId
  );

  const employeeNames = useMemo(() => {
    const names = new Set(availableTxns.map((t) => t.payerName).filter(Boolean));
    return Array.from(names) as string[];
  }, [availableTxns]);

  const filteredTxns = filterEmployee
    ? availableTxns.filter((t) => t.payerName === filterEmployee)
    : availableTxns;

  const selectedTotal = availableTxns
    .filter((t) => selectedTxnIds.includes(t.id))
    .reduce((sum, t) => sum + t.amount, 0);

  const handleSelectEmployee = (name: string | undefined) => {
    setFilterEmployee(name);
    if (name) {
      setSelectedTxnIds(availableTxns.filter((t) => t.payerName === name).map((t) => t.id));
      form.setFieldValue('employeeName', name);
    } else {
      setSelectedTxnIds([]);
    }
  };

  const handleCancel = () => {
    onClose();
    setFilterEmployee(undefined);
    setSelectedTxnIds([]);
    form.resetFields();
  };

  const handleOk = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    if (selectedTxnIds.length === 0) {
      message.warning('请至少选择一笔交易');
      return;
    }
    setSubmitting(true);
    try {
      await createBatch({ employeeName: values.employeeName, transactionIds: selectedTxnIds, note: values.note });
      message.success('报销单创建成功');
      handleCancel();
      onSuccess();
    } catch {
      message.error('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110 },
    { title: '代付人', dataIndex: 'payerName', key: 'payerName', width: 90 },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, render: (v: number) => `¥${formatAmount(v)}` },
  ];

  return (
    <Modal title="创建报销单" open={open} onCancel={handleCancel}
      onOk={handleOk} confirmLoading={submitting} width={700} okText="创建">
      <Form form={form} layout="vertical">
        <Form.Item name="employeeName" label="员工姓名" rules={[{ required: true, message: '请输入员工姓名' }]}>
          <Input placeholder="请输入员工姓名" />
        </Form.Item>
        <Form.Item name="note" label="备注">
          <Input.TextArea rows={2} placeholder="可选备注" />
        </Form.Item>
      </Form>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500 }}>
          选择待报销交易（已选 {selectedTxnIds.length} 笔，合计 ¥{formatAmount(selectedTotal)}）
        </span>
        <Select allowClear placeholder="按员工筛选" style={{ width: 160 }}
          value={filterEmployee} onChange={handleSelectEmployee}
          options={employeeNames.map((n) => ({ label: n, value: n }))} />
      </div>
      <Table size="small" rowKey="id" dataSource={filteredTxns} columns={columns}
        pagination={{ pageSize: 5 }}
        rowSelection={{ selectedRowKeys: selectedTxnIds, onChange: (keys) => setSelectedTxnIds(keys as string[]) }} />
    </Modal>
  );
};

export default CreateBatchModal;
