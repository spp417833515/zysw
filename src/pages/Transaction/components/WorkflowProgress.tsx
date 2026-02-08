import React, { useState } from 'react';
import { Steps, Button, Space, Tag } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import type { Transaction } from '@/types/transaction';
import { formatDate } from '@/utils/format';
import PaymentConfirmModal from '@/pages/Tasks/components/PaymentConfirmModal';
import InvoiceConfirmModal from '@/pages/Tasks/components/InvoiceConfirmModal';
import TaxDeclareModal from '@/pages/Tasks/components/TaxDeclareModal';

interface WorkflowProgressProps {
  transaction: Transaction;
}

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ transaction }) => {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [taxModalOpen, setTaxModalOpen] = useState(false);

  const isTransfer = transaction.type === 'transfer';

  const getStepStatus = (done: boolean, applicable: boolean) => {
    if (!applicable) return 'finish' as const;
    return done ? ('finish' as const) : ('wait' as const);
  };

  const getStepIcon = (done: boolean, applicable: boolean) => {
    if (!applicable) return <MinusCircleOutlined style={{ color: '#d9d9d9' }} />;
    return done ? (
      <CheckCircleOutlined style={{ color: '#52c41a' }} />
    ) : (
      <ClockCircleOutlined style={{ color: '#faad14' }} />
    );
  };

  const invoiceApplicable = !isTransfer && transaction.invoiceNeeded;
  const taxApplicable = !isTransfer;

  const items = [
    {
      title: '记账',
      status: 'finish' as const,
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      description: formatDate(transaction.createdAt),
    },
    {
      title: '到账确认',
      status: getStepStatus(transaction.paymentConfirmed, true),
      icon: getStepIcon(transaction.paymentConfirmed, true),
      description: transaction.paymentConfirmed ? (
        <Space direction="vertical" size={0}>
          <span>{transaction.paymentAccountType === 'company' ? '公户' : '私户'}</span>
          <span style={{ fontSize: 12, color: '#999' }}>
            {transaction.paymentConfirmedAt && formatDate(transaction.paymentConfirmedAt)}
          </span>
        </Space>
      ) : (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setPaymentModalOpen(true)}>
          去处理
        </Button>
      ),
    },
    {
      title: '开票确认',
      status: isTransfer
        ? ('finish' as const)
        : !transaction.invoiceNeeded
          ? ('finish' as const)
          : getStepStatus(transaction.invoiceCompleted, invoiceApplicable),
      icon: isTransfer || !transaction.invoiceNeeded
        ? <MinusCircleOutlined style={{ color: '#d9d9d9' }} />
        : getStepIcon(transaction.invoiceCompleted, invoiceApplicable),
      description: isTransfer ? (
        <Tag>不适用</Tag>
      ) : !transaction.invoiceNeeded ? (
        <Tag>无需开票</Tag>
      ) : transaction.invoiceCompleted ? (
        <Space direction="vertical" size={0}>
          <span>已开票{transaction.invoiceId ? ` (${transaction.invoiceId})` : ''}</span>
          <span style={{ fontSize: 12, color: '#999' }}>
            {transaction.invoiceConfirmedAt && formatDate(transaction.invoiceConfirmedAt)}
          </span>
        </Space>
      ) : (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setInvoiceModalOpen(true)}>
          去处理
        </Button>
      ),
    },
    {
      title: '申报确认',
      status: isTransfer
        ? ('finish' as const)
        : getStepStatus(transaction.taxDeclared, taxApplicable),
      icon: isTransfer
        ? <MinusCircleOutlined style={{ color: '#d9d9d9' }} />
        : getStepIcon(transaction.taxDeclared, taxApplicable),
      description: isTransfer ? (
        <Tag>不适用</Tag>
      ) : transaction.taxDeclared ? (
        <Space direction="vertical" size={0}>
          <span>已申报 ({transaction.taxPeriod})</span>
          <span style={{ fontSize: 12, color: '#999' }}>
            {transaction.taxDeclaredAt && formatDate(transaction.taxDeclaredAt)}
          </span>
        </Space>
      ) : (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setTaxModalOpen(true)}>
          去处理
        </Button>
      ),
    },
  ];

  return (
    <>
      <Steps
        items={items}
        style={{ marginBottom: 24 }}
      />
      <PaymentConfirmModal
        open={paymentModalOpen}
        transactionId={transaction.id}
        onClose={() => setPaymentModalOpen(false)}
      />
      <InvoiceConfirmModal
        open={invoiceModalOpen}
        transactionId={transaction.id}
        onClose={() => setInvoiceModalOpen(false)}
      />
      <TaxDeclareModal
        open={taxModalOpen}
        transactionId={transaction.id}
        transactionDate={transaction.date}
        onClose={() => setTaxModalOpen(false)}
      />
    </>
  );
};

export default WorkflowProgress;
