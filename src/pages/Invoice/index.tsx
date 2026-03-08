import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Row, Col, Card, Statistic, Modal, message } from 'antd';
import { PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import ExportButton from '@/components/ExportButton';
import InvoiceTable from './components/InvoiceTable';
import InvoicePreview from './components/InvoicePreview';
import { getInvoices, deleteInvoice } from '@/api/invoice';
import type { Invoice } from '@/types/invoice';

const { confirm } = Modal;

const InvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getInvoices();
      setInvoices(res.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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
      async onOk() {
        try {
          const res = await deleteInvoice(invoice.id);
          if (res.code === 0) {
            message.success('发票已删除');
            fetchData();
          } else {
            message.error(res.message || '删除失败');
          }
        } catch {
          message.error('删除失败');
        }
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
