import React, { useMemo } from 'react';
import { Modal, Button, Popconfirm, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useTransactionStore } from '@/store/useTransactionStore';
import WorkflowProgress from './WorkflowProgress';
import TransactionForm from './TransactionForm';

interface TransactionDetailModalProps {
  open: boolean;
  transactionId: string | null;
  onClose: () => void;
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  open,
  transactionId,
  onClose,
}) => {
  const { transactions, updateTransaction, deleteTransaction } = useTransactionStore();

  const transaction = useMemo(() => {
    if (!transactionId) return undefined;
    return transactions.find((t) => t.id === transactionId);
  }, [transactions, transactionId]);

  const handleSubmit = async (values: any) => {
    if (!transactionId) return;
    try {
      await updateTransaction(transactionId, values);
      message.success('更新成功');
      onClose();
    } catch {
      message.error('更新失败');
    }
  };

  const handleDelete = async () => {
    if (!transactionId) return;
    try {
      await deleteTransaction(transactionId);
      message.success('删除成功');
      onClose();
    } catch {
      message.error('删除失败');
    }
  };

  return (
    <Modal
      title="交易详情"
      open={open}
      onCancel={onClose}
      width={720}
      destroyOnClose
      footer={
        transaction ? (
          <div style={{ textAlign: 'left' }}>
            <Popconfirm
              title="确认删除"
              description="确定要删除这条交易记录吗？删除后不可恢复。"
              onConfirm={handleDelete}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </div>
        ) : null
      }
    >
      {!transaction ? (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <p>未找到该交易记录</p>
        </div>
      ) : (
        <>
          <WorkflowProgress transaction={transaction} />
          <TransactionForm
            initialValues={transaction}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </>
      )}
    </Modal>
  );
};

export default TransactionDetailModal;
