import React from 'react';
import { Table, Tag, Button, Space, Tooltip } from 'antd';
import {
  EyeOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Invoice } from '@/types/invoice';
import { invoiceTypeLabels, invoiceDirectionLabels } from '@/types/invoice';
import AmountText from '@/components/AmountText';
import { formatDate } from '@/utils/format';

interface InvoiceTableProps {
  invoices: Invoice[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  onView: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
  onVerify: (invoice: Invoice) => void;
  onVoid: (invoice: Invoice) => void;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待验证' },
  verified: { color: 'green', label: '已验证' },
  void: { color: 'red', label: '已作废' },
};

const directionColorMap: Record<string, string> = {
  in: 'blue',
  out: 'green',
};

const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  loading,
  total,
  page,
  pageSize,
  onPageChange,
  onView,
  onDelete,
  onVerify,
  onVoid,
}) => {
  const columns: ColumnsType<Invoice> = [
    {
      title: '发票号码',
      dataIndex: 'number',
      key: 'number',
      width: 120,
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 90,
      render: (direction: string) => (
        <Tag color={directionColorMap[direction] || 'default'}>
          {invoiceDirectionLabels[direction as keyof typeof invoiceDirectionLabels]}
        </Tag>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      render: (type: string) => (
        <Tag>{invoiceTypeLabels[type as keyof typeof invoiceTypeLabels]}</Tag>
      ),
    },
    {
      title: '购买方',
      dataIndex: 'buyerName',
      key: 'buyerName',
      width: 160,
      ellipsis: { showTitle: false },
      render: (name: string) => (
        <Tooltip title={name}>{name || '-'}</Tooltip>
      ),
    },
    {
      title: '销售方',
      dataIndex: 'sellerName',
      key: 'sellerName',
      width: 160,
      ellipsis: { showTitle: false },
      render: (name: string) => (
        <Tooltip title={name}>{name || '-'}</Tooltip>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 110,
      align: 'right',
      render: (amount: number) => <AmountText value={amount} />,
    },
    {
      title: '税额',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 110,
      align: 'right',
      render: (taxAmount: number) => <AmountText value={taxAmount} />,
    },
    {
      title: '价税合计',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right',
      render: (totalAmount: number) => (
        <AmountText value={totalAmount} style={{ fontWeight: 600 }} />
      ),
    },
    {
      title: '开票日期',
      dataIndex: 'issueDate',
      key: 'issueDate',
      width: 110,
      render: (date: string) => formatDate(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const config = statusConfig[status] || { color: 'default', label: status };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onView(record)}
          >
            查看
          </Button>
          {record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              style={{ color: '#52c41a' }}
              onClick={() => onVerify(record)}
            >
              验证
            </Button>
          )}
          {record.status !== 'void' && (
            <Button
              type="link"
              size="small"
              icon={<StopOutlined />}
              danger
              onClick={() => onVoid(record)}
            >
              作废
            </Button>
          )}
          {record.status !== 'void' && (
            <Button
              type="link"
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => onDelete(record)}
            >
              删除
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table<Invoice>
      columns={columns}
      dataSource={invoices}
      rowKey="id"
      loading={loading}
      scroll={{ x: 1400 }}
      pagination={{
        current: page,
        pageSize: pageSize,
        total: total,
        onChange: onPageChange,
        onShowSizeChange: onPageChange,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (t) => `共 ${t} 条记录`,
        pageSizeOptions: ['10', '20', '50'],
      }}
    />
  );
};

export default InvoiceTable;
