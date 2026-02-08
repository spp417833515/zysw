import React, { useState } from 'react';
import { Modal, Button, Space, Typography, Result } from 'antd';
import {
  CheckCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PaymentConfirmModal from '@/pages/Tasks/components/PaymentConfirmModal';

const { Text } = Typography;

interface IncomeFollowUpModalProps {
  open: boolean;
  transactionId: string;
  amount: number;
  invoiceIssued: boolean;
  onContinue: () => void;
  onClose: () => void;
}

const IncomeFollowUpModal: React.FC<IncomeFollowUpModalProps> = ({
  open,
  transactionId,
  amount,
  invoiceIssued,
  onContinue,
  onClose,
}) => {
  const navigate = useNavigate();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const handleViewList = () => {
    onClose();
    navigate('/transaction');
  };

  const handleInvoice = () => {
    onClose();
    navigate('/invoice');
  };

  const handleContinue = () => {
    onClose();
    onContinue();
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        destroyOnClose
        width={420}
      >
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="收入记录成功！"
          subTitle={
            <Text style={{ fontSize: 18 }}>
              ¥{amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })} 已记录
            </Text>
          }
        />
        <div style={{ padding: '0 24px 24px' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            接下来您可以：
          </Text>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button
              block
              icon={<CheckCircleOutlined />}
              onClick={() => setPaymentModalOpen(true)}
            >
              对账确认
            </Button>
            {!invoiceIssued && (
              <Button
                block
                icon={<FileTextOutlined />}
                onClick={handleInvoice}
              >
                开票管理
              </Button>
            )}
            <Button
              block
              icon={<PlusOutlined />}
              onClick={handleContinue}
            >
              继续记账
            </Button>
            <Button
              block
              icon={<UnorderedListOutlined />}
              onClick={handleViewList}
            >
              查看列表
            </Button>
          </Space>
        </div>
      </Modal>

      <PaymentConfirmModal
        open={paymentModalOpen}
        transactionId={transactionId}
        onClose={() => setPaymentModalOpen(false)}
      />
    </>
  );
};

export default IncomeFollowUpModal;
