import React, { useState } from 'react';
import { Modal, Radio, Space, message } from 'antd';
import type { PaymentAccountType } from '@/types/transaction';
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
  const [accountType, setAccountType] = useState<PaymentAccountType>('company');
  const [loading, setLoading] = useState(false);
  const confirmPayment = useTransactionStore((s) => s.confirmPayment);

  const handleOk = async () => {
    setLoading(true);
    try {
      await confirmPayment(transactionId, accountType);
      message.success('到账确认成功');
      onClose();
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="确认到账"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="确认"
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
        <div>请确认该笔款项的到账类型：</div>
        <Radio.Group
          value={accountType}
          onChange={(e) => setAccountType(e.target.value)}
        >
          <Space direction="vertical">
            <Radio value="company">公户（对公账户）</Radio>
            <Radio value="personal">私户（个人账户）</Radio>
          </Space>
        </Radio.Group>
      </Space>
    </Modal>
  );
};

export default PaymentConfirmModal;
