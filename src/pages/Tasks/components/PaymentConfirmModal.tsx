import React, { useState } from 'react';
import { Modal, message } from 'antd';
import { useTransactionStore } from '@/store/useTransactionStore';

interface PaymentConfirmModalProps {
  open: boolean;
  transactionId: string;
  onClose: () => void;
}

const PaymentConfirmModal: React.FC<PaymentConfirmModalProps> = ({
  open,
  transactionId,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const confirmPayment = useTransactionStore((s) => s.confirmPayment);

  const handleOk = async () => {
    setLoading(true);
    try {
      await confirmPayment(transactionId, 'company');
      message.success('确认成功');
      onClose();
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="确认"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="确认"
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
    >
      <div style={{ padding: '16px 0' }}>
        确认后该笔将进入「收支流水」并影响账户余额。是否继续？
      </div>
    </Modal>
  );
};

export default PaymentConfirmModal;
