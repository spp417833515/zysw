import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useTransactionStore } from '@/store/useTransactionStore';
import PageContainer from '@/components/PageContainer';
import TransactionWizard from './components/TransactionWizard';

const TransactionCreate: React.FC = () => {
  const navigate = useNavigate();
  const { addTransaction } = useTransactionStore();

  const handleSubmit = useCallback(
    async (values: any) => {
      try {
        await addTransaction(values);
        message.success('交易记录创建成功');
        navigate('/transaction');
      } catch (error) {
        message.error('创建失败，请重试');
      }
    },
    [addTransaction, navigate],
  );

  const handleCancel = useCallback(() => {
    navigate('/transaction');
  }, [navigate]);

  return (
    <PageContainer title="新增交易">
      <TransactionWizard onSubmit={handleSubmit} onCancel={handleCancel} />
    </PageContainer>
  );
};

export default TransactionCreate;
