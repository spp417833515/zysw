import React from 'react';
import { Table, Tag, Button, Space, Popconfirm } from 'antd';
import { EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Invoice } from '@/types/invoice';
import { invoiceTypeLabels, invoiceDirectionLabels } from '@/types/invoice';
import AmountText from '@/components/AmountText';
import { formatDate } from '@/utils/format';

interface InvoiceTableProps {
  invoices: Invoice[];
  loading: boolean;
  onView: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
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
  onView,
  onDelete,
}) => {
  const columns: ColumnsType<Invoice> = [
    {
      title: '发票代码',
      dataIndex: 'code',
      key: 'code',
      width: 140,
    },
    {
      title: '发票号码',
      dataIndex: 'number',
      key: 'number',
      width: 120,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => <Tag>{invoiceTypeLabels[type as keyof typeof invoiceTypeLabels]}</Tag>,
    },
    {
      title: '方向',
      dataIndex: 'direction',
      key: 'direction',
      width: 80,
      render: (direction: string) => (
        <Tag color={directionColorMap[direction] || 'default'}>
          {invoiceDirectionLabels[direction as keyof typeof invoiceDirectionLabels]}
        </Tag>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      sorter: (a, b) => a.amount - b.amount,
      render: (amount: number) => <AmountText value={amount} />,
    },
    {
      title: '税额',
      dataIndex: 'taxAmount',
      key: 'taxAmount',
      width: 120,
      render: (taxAmount: number) => <AmountText value={taxAmount} />,
    },
    {
      title: '价税合计',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 130,
      render: (totalAmount: number) => <AmountText value={totalAmount} />,
    },
    {
      title: '开票日期',
      dataIndex: 'issueDate',
      key: 'issueDate',
      width: 120,
      sorter: (a, b) =>
        new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime(),
      render: (date: string) => formatDate(date),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: string) => {
        const config = statusConfig[status] || {
          color: 'default',
          label: status,
        };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
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
          <Popconfirm
            title="确认删除"
            description="确定要删除这张发票吗？"
            onConfirm={() => onDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
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
      scroll={{ x: 1200 }}
      pagination={{
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total) => `共 ${total} 条记录`,
        defaultPageSize: 10,
        pageSizeOptions: ['10', '20', '50'],
      }}
    />
  );
};

export default InvoiceTable;
