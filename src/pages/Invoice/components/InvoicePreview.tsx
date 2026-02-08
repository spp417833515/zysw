import React from 'react';
import { Drawer, Table, Descriptions, Typography, Divider, Row, Col, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Invoice, InvoiceItem } from '@/types/invoice';
import { invoiceTypeLabels, invoiceDirectionLabels } from '@/types/invoice';
import { formatAmount, formatDate } from '@/utils/format';

const { Title, Text } = Typography;

interface InvoicePreviewProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

const itemColumns: ColumnsType<InvoiceItem> = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '数量',
    dataIndex: 'quantity',
    key: 'quantity',
    align: 'right',
  },
  {
    title: '单价',
    dataIndex: 'unitPrice',
    key: 'unitPrice',
    align: 'right',
    render: (val: number) => formatAmount(val),
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    align: 'right',
    render: (val: number) => formatAmount(val),
  },
  {
    title: '税率',
    dataIndex: 'taxRate',
    key: 'taxRate',
    align: 'right',
    render: (val: number) => `${(val * 100).toFixed(0)}%`,
  },
  {
    title: '税额',
    dataIndex: 'taxAmount',
    key: 'taxAmount',
    align: 'right',
    render: (val: number) => formatAmount(val),
  },
];

const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  open,
  onClose,
  invoice,
}) => {
  if (!invoice) return null;

  const typeLabel = invoiceTypeLabels[invoice.type] || invoice.type;

  return (
    <Drawer
      title="发票预览"
      placement="right"
      width={720}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {/* Invoice Header */}
      <div
        style={{
          border: '2px solid #c41d1a',
          padding: 24,
          borderRadius: 4,
          background: '#fff',
        }}
      >
        {/* Title Area */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Title
            level={3}
            style={{
              color: '#c41d1a',
              marginBottom: 4,
              letterSpacing: 8,
            }}
          >
            {typeLabel}
          </Title>
          <Row justify="space-between" style={{ marginTop: 8 }}>
            <Col>
              <Text type="secondary">发票代码：</Text>
              <Text strong>{invoice.code}</Text>
            </Col>
            <Col>
              <Text type="secondary">发票号码：</Text>
              <Text strong>{invoice.number}</Text>
            </Col>
            <Col>
              <Text type="secondary">开票日期：</Text>
              <Text strong>{formatDate(invoice.issueDate)}</Text>
            </Col>
          </Row>
        </div>

        <Divider style={{ borderColor: '#c41d1a', margin: '12px 0' }} />

        {/* Buyer Info */}
        <div
          style={{
            background: '#fafafa',
            padding: 12,
            borderRadius: 4,
            marginBottom: 12,
          }}
        >
          <Text
            strong
            style={{
              color: '#c41d1a',
              display: 'block',
              marginBottom: 8,
            }}
          >
            购买方
          </Text>
          <Descriptions column={1} size="small" colon>
            <Descriptions.Item label="名称">
              {invoice.buyerName}
            </Descriptions.Item>
            <Descriptions.Item label="纳税人识别号">
              {invoice.buyerTaxNumber}
            </Descriptions.Item>
          </Descriptions>
        </div>

        {/* Items Table */}
        <Table<InvoiceItem>
          columns={itemColumns}
          dataSource={(invoice.items || []).map((item, idx) => ({
            ...item,
            key: idx,
          }))}
          pagination={false}
          size="small"
          bordered
          style={{ marginBottom: 12 }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}>
                  <Text strong>合计</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  <Text strong>{formatAmount(invoice.amount)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} />
                <Table.Summary.Cell index={3} align="right">
                  <Text strong>{formatAmount(invoice.taxAmount)}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />

        {/* Grand Total */}
        <div
          style={{
            textAlign: 'right',
            padding: '8px 0',
            borderTop: '1px dashed #c41d1a',
            borderBottom: '1px dashed #c41d1a',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16 }}>价税合计（大写）：</Text>
          <Text
            strong
            style={{ fontSize: 18, color: '#c41d1a', marginLeft: 16 }}
          >
            {formatAmount(invoice.totalAmount)}
          </Text>
        </div>

        {/* Seller Info */}
        <div
          style={{
            background: '#fafafa',
            padding: 12,
            borderRadius: 4,
          }}
        >
          <Text
            strong
            style={{
              color: '#c41d1a',
              display: 'block',
              marginBottom: 8,
            }}
          >
            销售方
          </Text>
          <Descriptions column={1} size="small" colon>
            <Descriptions.Item label="名称">
              {invoice.sellerName}
            </Descriptions.Item>
            <Descriptions.Item label="纳税人识别号">
              {invoice.sellerTaxNumber}
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider style={{ borderColor: '#c41d1a', margin: '12px 0' }} />

        {/* Footer Info */}
        <Row justify="space-between">
          <Col>
            <Text type="secondary">方向：</Text>
            <Tag color={invoice.direction === 'in' ? 'blue' : 'green'}>
              {invoiceDirectionLabels[invoice.direction]}
            </Tag>
          </Col>
          <Col>
            <Text type="secondary">状态：</Text>
            <Tag
              color={
                invoice.status === 'verified'
                  ? 'green'
                  : invoice.status === 'void'
                  ? 'red'
                  : 'orange'
              }
            >
              {invoice.status === 'verified'
                ? '已验证'
                : invoice.status === 'void'
                ? '已作废'
                : '待验证'}
            </Tag>
          </Col>
        </Row>
      </div>
    </Drawer>
  );
};

export default InvoicePreview;
