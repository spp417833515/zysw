import React, { useState } from 'react';
import { Modal, Form, DatePicker, InputNumber, message } from 'antd';
import { useReimbursementStore } from '@/store/useReimbursementStore';
import AccountSelect from '@/components/AccountSelect';
import { formatAmount } from '@/utils/format';
import type { ReimbursementBatch } from '@/types/reimbursement';
import dayjs from 'dayjs';

interface Props {
  batch: ReimbursementBatch | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CompleteBatchModal: React.FC<Props> = ({ batch, onClose, onSuccess }) => {
  const completeBatch = useReimbursementStore((s) => s.completeBatch);
  const [form] = Form.useForm();
  const completeFee = Form.useWatch('fee', form);
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = () => {
    if (batch) {
      form.setFieldsValue({ completedDate: dayjs(), actualAmount: batch.totalAmount, fee: 0 });
    }
  };

  const handleOk = async () => {
    if (!batch) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      await completeBatch(batch.id, {
        completedDate: values.completedDate.format('YYYY-MM-DD'),
        actualAmount: values.actualAmount,
        fee: values.fee || 0,
        feeAccountId: values.feeAccountId,
      });
      message.success('报销完成');
      onClose();
      onSuccess();
    } catch {
      message.error('操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="确认报销" open={!!batch} afterOpenChange={(open) => open && handleOpen()}
      onCancel={onClose} onOk={handleOk} confirmLoading={submitting} okText="确认报销">
      {batch && (
        <div style={{ marginBottom: 16, color: '#666' }}>
          批次 {batch.batchNo}，共 {batch.transactionIds.length} 笔，
          支出合计 ¥{formatAmount(batch.totalAmount)}
        </div>
      )}
      <Form form={form} layout="vertical">
        <Form.Item name="completedDate" label="转账日期" rules={[{ required: true, message: '请选择日期' }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="actualAmount" label="报销金额" rules={[{ required: true, message: '请输入金额' }]}>
          <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
        </Form.Item>
        <Form.Item name="fee" label="手续费（自动生成独立支出记录）">
          <InputNumber style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
        </Form.Item>
        {completeFee > 0 && (
          <Form.Item name="feeAccountId" label="手续费记账账户" rules={[{ required: true, message: '请选择手续费记账账户' }]}>
            <AccountSelect placeholder="请选择账户" style={{ width: '100%' }} />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default CompleteBatchModal;
