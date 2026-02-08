import React, { useState } from 'react';
import { Modal, Radio, Input, Space, message } from 'antd';
import { useTransactionStore } from '@/store/useTransactionStore';

interface InvoiceConfirmModalProps {
  open: boolean;
  transactionId: string;
  onClose: () => void;
}

const InvoiceConfirmModal: React.FC<InvoiceConfirmModalProps> = ({
  open,
  transactionId,
  onClose,
}) => {
  const [action, setAction] = useState<'completed' | 'skip'>('completed');
  const [invoiceId, setInvoiceId] = useState('');
  const [loading, setLoading] = useState(false);
  const confirmInvoice = useTransactionStore((s) => s.confirmInvoice);
  const skipInvoice = useTransactionStore((s) => s.skipInvoice);

  const handleOk = async () => {
    setLoading(true);
    try {
      if (action === 'completed') {
        await confirmInvoice(transactionId, invoiceId || undefined);
        message.success('开票确认成功');
      } else {
        await skipInvoice(transactionId);
        message.success('已标记为无需开票');
      }
      setAction('completed');
      setInvoiceId('');
      onClose();
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="开票确认"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="确认"
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
        <Radio.Group value={action} onChange={(e) => setAction(e.target.value)}>
          <Space direction="vertical">
            <Radio value="completed">已开票</Radio>
            <Radio value="skip">不需要开票</Radio>
          </Space>
        </Radio.Group>
        {action === 'completed' && (
          <Input
            placeholder="关联发票编号（可选）"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
          />
        )}
      </Space>
    </Modal>
  );
};

export default InvoiceConfirmModal;
