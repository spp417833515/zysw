import React from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import PageContainer from '@/components/PageContainer';
import InvoiceForm from './components/InvoiceForm';

const InvoiceCreate: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = (values: any) => {
    const newInvoice = {
      id: `inv_${Date.now()}`,
      code: values.code,
      number: values.number,
      type: values.type,
      direction: values.direction,
      issueDate: values.issueDate.format('YYYY-MM-DD'),
      buyerName: values.buyerName,
      buyerTaxNumber: values.buyerTaxNumber,
      sellerName: values.sellerName,
      sellerTaxNumber: values.sellerTaxNumber,
      items: values.items.map((item: any, index: number) => ({
        ...item,
        key: index,
      })),
      amount: values.items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0),
      taxAmount: values.items.reduce((sum: number, item: any) => sum + (item.taxAmount || 0), 0),
      totalAmount: values.items.reduce(
        (sum: number, item: any) => sum + (item.amount || 0) + (item.taxAmount || 0),
        0
      ),
      status: 'pending' as const,
    };

    // In a real app, this would call an API. Here we just show success and navigate back.
    console.log('New invoice created:', newInvoice);
    message.success('发票创建成功');
    navigate('/invoice');
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
