import React from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import PageContainer from '@/components/PageContainer';
import InvoiceForm from './components/InvoiceForm';
import type { InvoiceFormValues } from './components/InvoiceForm';
import { createInvoice } from '@/api/invoice';
import type { InvoiceItem } from '@/types/invoice';

const InvoiceCreate: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (values: InvoiceFormValues) => {
    const items: InvoiceItem[] = values.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate,
      amount: item.amount || 0,
      taxAmount: item.taxAmount || 0,
    }));
    const payload = {
      code: values.code,
      number: values.number,
      type: values.type,
      direction: values.direction,
      issueDate: values.issueDate.format('YYYY-MM-DD'),
      buyerName: values.buyerName,
      buyerTaxNumber: values.buyerTaxNumber,
      sellerName: values.sellerName,
      sellerTaxNumber: values.sellerTaxNumber,
      items,
      amount: items.reduce((sum, item) => sum + item.amount, 0),
      taxAmount: items.reduce((sum, item) => sum + item.taxAmount, 0),
      totalAmount: items.reduce(
        (sum, item) => sum + item.amount + item.taxAmount,
        0
      ),
      imageUrl: values.imageUrl || undefined,
      status: 'pending' as const,
    };

    try {
      const res = await createInvoice(payload);
      if (res.code === 0) {
        message.success('发票创建成功');
        navigate('/invoice');
      } else {
        message.error(res.message || '创建失败');
      }
    } catch {
      message.error('创建失败');
    }
  };

  const handleCancel = () => {
    navigate('/invoice');
  };

  return (
    <PageContainer title="新增发票">
      <InvoiceForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </PageContainer>
  );
};

export default InvoiceCreate;
