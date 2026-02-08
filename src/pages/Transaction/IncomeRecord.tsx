import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { useTransactionStore } from '@/store/useTransactionStore';
import PageContainer from '@/components/PageContainer';
import IncomeRecordForm from './components/IncomeRecordForm';
import IncomeFollowUpModal from './components/IncomeFollowUpModal';
import type { IncomeRecordFormValues } from './components/IncomeRecordForm';

const IncomeRecord: React.FC = () => {
  const navigate = useNavigate();
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const [loading, setLoading] = useState(false);
  const [followUp, setFollowUp] = useState<{
    open: boolean;
    transactionId: string;
    amount: number;
    invoiceIssued: boolean;
  }>({ open: false, transactionId: '', amount: 0, invoiceIssued: false });

  const [formKey, setFormKey] = useState(0);

  const handleSubmit = useCallback(
    async (values: IncomeRecordFormValues) => {
      setLoading(true);
      try {
        const invoiceImages = values.invoiceImages ?? [];
        // 上传了发票文件 → 视为发票已开具/已完成；未上传 → 待办跟进
        const invoiceIssued = invoiceImages.length > 0;

        const txData = {
          type: 'income' as const,
          amount: values.amount,
          date: values.date.format('YYYY-MM-DD'),
          categoryId: values.categoryId,
          accountId: values.accountId,
          description: values.description || '',
          tags: [],
          attachments: [],
          bookId: 'default',
          paymentConfirmed: false,
          paymentAccountType: null,
          invoiceNeeded: true,
          invoiceCompleted: invoiceIssued,
          taxDeclared: false,
          invoiceIssued,
          invoiceImages,
          companyAccountDate: values.companyAccountDate
            ? values.companyAccountDate.format('YYYY-MM-DD')
            : null,
          companyAccountImages: values.companyAccountImages ?? [],
        };

        const created = await addTransaction(txData);

        setFollowUp({
          open: true,
          transactionId: created?.id || '',
          amount: values.amount,
          invoiceIssued,
        });
      } catch {
        message.error('创建失败，请重试');
      } finally {
        setLoading(false);
      }
    },
    [addTransaction],
  );

  const handleCancel = useCallback(() => {
    navigate('/transaction');
  }, [navigate]);

  const handleContinue = useCallback(() => {
    setFormKey((k) => k + 1);
  }, []);

  const handleFollowUpClose = useCallback(() => {
    setFollowUp((s) => ({ ...s, open: false }));
  }, []);

  return (
    <PageContainer title="记一笔收入">
      <IncomeRecordForm
        key={formKey}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
      <IncomeFollowUpModal
        open={followUp.open}
        transactionId={followUp.transactionId}
        amount={followUp.amount}
        invoiceIssued={followUp.invoiceIssued}
        onContinue={handleContinue}
        onClose={handleFollowUpClose}
      />
    </PageContainer>
  );
};

export default IncomeRecord;
