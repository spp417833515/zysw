import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Radio, Space } from 'antd';
import { useTransactionStore } from '@/store/useTransactionStore';
import PageContainer from '@/components/PageContainer';
import IncomeRecordForm from './components/IncomeRecordForm';
import IncomeFollowUpModal from './components/IncomeFollowUpModal';
import type { IncomeRecordFormValues } from './components/IncomeRecordForm';

const TYPE_OPTIONS = [
  { label: '支出', value: 'expense' },
  { label: '收入', value: 'income' },
  { label: '转账', value: 'transfer' },
];

const TITLE_MAP: Record<string, string> = {
  income: '记一笔收入',
  expense: '记一笔支出',
  transfer: '转账',
};

const TransactionCreate: React.FC = () => {
  const navigate = useNavigate();
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [formKey, setFormKey] = useState(0);
  const [followUp, setFollowUp] = useState<{
    open: boolean;
    transactionId: string;
    amount: number;
    invoiceIssued: boolean;
  }>({ open: false, transactionId: '', amount: 0, invoiceIssued: false });

  const handleSubmit = useCallback(
    async (values: IncomeRecordFormValues) => {
      setLoading(true);
      try {
        const invoiceImages = values.invoiceImages ?? [];
        const invoiceIssued = invoiceImages.length > 0;

        const txData = {
          type: transactionType,
          amount: values.amount,
          date: values.date.format('YYYY-MM-DD'),
          categoryId: values.categoryId,
          accountId: values.accountId,
          toAccountId: values.toAccountId || undefined,
          contactId: values.contactId || undefined,
          description: values.description || '',
          tags: [],
          attachments: [],
          bookId: 'default',
          paymentConfirmed: values.paymentAccountType === 'company',
          paymentAccountType: values.paymentAccountType || undefined,
          payerName: values.payerName || undefined,
          invoiceNeeded: transactionType !== 'transfer',
          invoiceCompleted: invoiceIssued,
          taxDeclared: false,
          invoiceIssued,
          invoiceImages,
          companyAccountDate: values.companyAccountDate
            ? values.companyAccountDate.format('YYYY-MM-DD')
            : undefined,
          companyAccountImages: values.companyAccountImages ?? [],
        };

        const created = await addTransaction(txData as any);
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
    [addTransaction, transactionType],
  );

  return (
    <PageContainer title={TITLE_MAP[transactionType] || '新增交易'}>
      <div style={{ marginBottom: 20 }}>
        <Space>
          <span style={{ fontWeight: 500 }}>交易类型：</span>
          <Radio.Group
            value={transactionType}
            onChange={(e) => { setTransactionType(e.target.value); setFormKey((k) => k + 1); }}
            optionType="button"
            buttonStyle="solid"
            options={TYPE_OPTIONS}
          />
        </Space>
      </div>
      <IncomeRecordForm
        key={formKey}
        transactionType={transactionType}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/transaction')}
        loading={loading}
      />
      <IncomeFollowUpModal
        open={followUp.open}
        transactionId={followUp.transactionId}
        amount={followUp.amount}
        invoiceIssued={followUp.invoiceIssued}
        onContinue={() => setFormKey((k) => k + 1)}
        onClose={() => setFollowUp((s) => ({ ...s, open: false }))}
      />
    </PageContainer>
  );
};

export default TransactionCreate;
