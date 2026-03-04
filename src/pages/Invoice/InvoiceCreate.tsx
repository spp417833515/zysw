import React from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import PageContainer from '@/components/PageContainer';
import InvoiceForm from './components/InvoiceForm';
import { createInvoice } from '@/api/invoice';

const InvoiceCreate: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (values: any) => {
    const items = values.items.map((item: any, index: number) => ({
      ...item,
      key: index,
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
      amount: items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0),
      taxAmount: items.reduce((sum: number, item: any) => sum + (item.taxAmount || 0), 0),
      totalAmount: items.reduce(
        (sum: number, item: any) => sum + (item.amount || 0) + (item.taxAmount || 0),
        0
      ),
      imageUrl: values.imageUrl || null,
      status: 'pending' as const,
    };

    try {
      const res: any = await createInvoice(payload);
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
