import React, { useState } from 'react';
import { Modal, DatePicker, Space, message } from 'antd';
import { useTransactionStore } from '@/store/useTransactionStore';
import dayjs from 'dayjs';

interface TaxDeclareModalProps {
  open: boolean;
  transactionId: string;
  transactionDate: string;
  onClose: () => void;
}

const TaxDeclareModal: React.FC<TaxDeclareModalProps> = ({
  open,
  transactionId,
  transactionDate,
  onClose,
}) => {
  const [period, setPeriod] = useState<dayjs.Dayjs | null>(
    dayjs(transactionDate).startOf('month'),
  );
  const [loading, setLoading] = useState(false);
  const confirmTaxDeclare = useTransactionStore((s) => s.confirmTaxDeclare);

  const handleOk = async () => {
    if (!period) {
      message.warning('请选择申报所属期');
      return;
    }
    setLoading(true);
    try {
      await confirmTaxDeclare(transactionId, period.format('YYYY-MM'));
      message.success('申报确认成功');
      onClose();
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="确认申报"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="确认"
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
        <div>请选择该笔交易的申报所属期：</div>
        <DatePicker
          picker="month"
          value={period}
          onChange={(val) => setPeriod(val)}
          placeholder="选择申报所属期"
          style={{ width: '100%' }}
        />
      </Space>
    </Modal>
  );
};

export default TaxDeclareModal;
