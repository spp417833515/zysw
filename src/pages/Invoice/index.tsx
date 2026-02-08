import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Row, Col, Card, Statistic, Modal, message } from 'antd';
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import ExportButton from '@/components/ExportButton';
import InvoiceTable from './components/InvoiceTable';
import InvoicePreview from './components/InvoicePreview';
import { mockInvoices } from '@/mock/data';
import type { Invoice } from '@/types/invoice';

const { confirm } = Modal;

const InvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [loading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);

  const summary = useMemo(() => {
    const total = invoices.length;
    const receivedAmount = invoices
      .filter((inv) => inv.direction === 'in')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    const issuedAmount = invoices
      .filter((inv) => inv.direction === 'out')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    return { total, receivedAmount, issuedAmount };
  }, [invoices]);

  const handleView = (invoice: Invoice) => {
    setCurrentInvoice(invoice);
    setPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setCurrentInvoice(null);
  };

  const handleDelete = (invoice: Invoice) => {
    confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除发票 ${invoice.number} 吗？此操作不可恢复。`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        setInvoices((prev) => prev.filter((inv) => inv.id !== invoice.id));
        message.success('发票已删除');
      },
    });
  };

  const handleCreate = () => {
    navigate('/invoice/create');
  };

  return (
    <PageContainer
      title="发票管理"
      extra={[
        <ExportButton key="export" />,
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          新增发票
        </Button>,
      ]}
    >
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="发票总数" value={summary.total} suffix="张" />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="收到发票金额"
              value={summary.receivedAmount}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="开出发票金额"
              value={summary.issuedAmount}
              precision={2}
              prefix="¥"
            />
          </Card>
        </Col>
      </Row>

      <InvoiceTable
        invoices={invoices}
        loading={loading}
        onView={handleView}
        onDelete={handleDelete}
      />

      <InvoicePreview
        open={previewOpen}
        onClose={handleClosePreview}
        invoice={currentInvoice}
      />
    </PageContainer>
  );
};

export default InvoicePage;
