import React, { useCallback, useMemo, useState } from 'react';
import { Table, Tag, Space, Button, Tooltip, Row, Col, Card, Statistic, Image, Modal, message } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  SwapOutlined,
  PaperClipOutlined,
  FileTextOutlined,
  BankOutlined,
} from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { useTransactionStore } from '@/store/useTransactionStore';
import { Transaction, TransactionType, Attachment } from '@/types/transaction';
import { TRANSACTION_TYPE_MAP, PAGE_SIZE } from '@/utils/constants';
import { formatDate, formatAmount, toDisplayUrl } from '@/utils/format';
import AmountText from '@/components/AmountText';
import EmptyState from '@/components/EmptyState';
import ImageUpload from '@/components/ImageUpload';

const typeColorMap: Record<string, string> = {
  income: 'green',
  expense: 'red',
  transfer: 'blue',
};

const emptyVoucherStyle = { color: '#bfbfbf', border: '1px dashed #d9d9d9', borderRadius: 4 };

type VoucherField = 'attachments' | 'invoiceImages' | 'companyAccountImages';

const VoucherButton: React.FC<{
  icon: React.ReactNode;
  color: string;
  label: string;
  count: number;
  items: Attachment[] | undefined;
  field: VoucherField;
  transactionId: string;
  onPreview: (items: Attachment[]) => void;
  onUpload: (target: { transactionId: string; field: VoucherField; label: string }) => void;
}> = ({ icon, color, label, count, items, field, transactionId, onPreview, onUpload }) => (
  <Tooltip title={count ? `${label} (${count}) - 点击预览` : `点击上传${label}`}>
    <Button
      type="text"
      size="small"
      icon={icon}
      style={count ? { color } : emptyVoucherStyle}
      onClick={() => {
        if (count && items) {
          onPreview(items);
        } else {
          onUpload({ transactionId, field, label: `上传${label}` });
        }
      }}
    />
  </Tooltip>
);

interface TransactionTableProps {
  onViewDetail?: (id: string) => void;
}

const TransactionTable: React.FC<TransactionTableProps> = ({ onViewDetail }) => {
  const { transactions, loading, filter, updateTransaction } = useTransactionStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [previewImages, setPreviewImages] = useState<Attachment[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<{
    transactionId: string;
    field: 'attachments' | 'invoiceImages' | 'companyAccountImages';
    label: string;
  } | null>(null);
  const [uploadFiles, setUploadFiles] = useState<Attachment[]>([]);

  // Apply client-side filter
  const filteredTransactions = useMemo(() => {
    let list = transactions;

    if (filter.type) {
      list = list.filter((t) => t.type === filter.type);
    }
    if (filter.categoryId) {
      list = list.filter((t) => t.categoryId === filter.categoryId);
    }
    if (filter.accountId) {
      list = list.filter((t) => t.accountId === filter.accountId || t.toAccountId === filter.accountId);
    }
    if (filter.dateRange && filter.dateRange.length === 2) {
      const [start, end] = filter.dateRange;
      list = list.filter((t) => t.date >= start && t.date <= end);
    }
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description && t.description.toLowerCase().includes(kw)) ||
          (t.categoryName && t.categoryName.toLowerCase().includes(kw)) ||
          (t.accountName && t.accountName.toLowerCase().includes(kw)) ||
          (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(kw))),
      );
    }

    return list;
  }, [transactions, filter]);

  // Summary statistics
  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const openPreview = useCallback((items: Attachment[]) => {
    if (!items || items.length === 0) return;
    const images = items.filter((a) => !a.type?.toLowerCase().includes('pdf'));
    const pdfs = items.filter((a) => a.type?.toLowerCase().includes('pdf'));

    // Open PDFs in new browser tabs (native PDF viewer)
    pdfs.forEach((att) => {
      const url = toDisplayUrl(att.url);
      if (url) window.open(url, '_blank');
    });

    // Show images in preview modal
    if (images.length > 0) {
      setPreviewImages(images);
      setPreviewOpen(true);
    }
  }, []);

  const handleUploadSave = useCallback(async () => {
    if (!uploadTarget || uploadFiles.length === 0) return;
    try {
      await updateTransaction(uploadTarget.transactionId, {
        [uploadTarget.field]: uploadFiles,
      } as Partial<Transaction>);
      message.success('上传成功');
      setUploadTarget(null);
      setUploadFiles([]);
    } catch {
      message.error('上传失败');
    }
  }, [uploadTarget, uploadFiles, updateTransaction]);

  const handleTableChange = useCallback(
    (
      pagination: TablePaginationConfig,
      _filters: any,
      _sorter: SorterResult<Transaction> | SorterResult<Transaction>[],
    ) => {
      setCurrentPage(pagination.current || 1);
    },
    [],
  );

  const columns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      defaultSortOrder: 'descend',
      render: (date: string) => formatDate(date),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: TransactionType) => (
        <Tag color={typeColorMap[type] || 'default'}>
          {TRANSACTION_TYPE_MAP[type]?.label || type}
        </Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 100,
      ellipsis: true,
      render: (v: string) => v || '-',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          {text || '-'}
        </Tooltip>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.amount - b.amount,
      render: (amount: number, record: Transaction) => (
        <AmountText value={amount} type={record.type} />
      ),
    },
    {
      title: '账户',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 110,
      ellipsis: true,
      render: (v: string, record: Transaction) => {
        if (record.type === 'transfer' && record.toAccountName) {
          return (
            <Tooltip title={`${v || '-'} → ${record.toAccountName}`}>
              <span>{v || '-'} → {record.toAccountName}</span>
            </Tooltip>
          );
        }
        return v || '-';
      },
    },
    {
      title: '凭证',
      key: 'documents',
      width: 110,
      render: (_: any, record: Transaction) => {
        const isIncome = record.type === 'income';
        const handleUpload = (target: { transactionId: string; field: VoucherField; label: string }) => {
          setUploadTarget(target);
          setUploadFiles([]);
        };
        return (
          <Space size={4}>
            <VoucherButton icon={<PaperClipOutlined />} color="#1890ff" label="附件"
              count={record.attachments?.length || 0} items={record.attachments}
              field="attachments" transactionId={record.id}
              onPreview={openPreview} onUpload={handleUpload} />
            {isIncome && (
              <>
                <VoucherButton icon={<FileTextOutlined />} color="#52c41a" label="发票"
                  count={record.invoiceImages?.length || 0} items={record.invoiceImages}
                  field="invoiceImages" transactionId={record.id}
                  onPreview={openPreview} onUpload={handleUpload} />
                <VoucherButton icon={<BankOutlined />} color="#faad14" label="公户截图"
                  count={record.companyAccountImages?.length || 0} items={record.companyAccountImages}
                  field="companyAccountImages" transactionId={record.id}
                  onPreview={openPreview} onUpload={handleUpload} />
              </>
            )}
          </Space>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 70,
      render: (_: any, record: Transaction) => (
        <Button
          type="link"
          size="small"
          onClick={() => onViewDetail?.(record.id)}
        >
          详情
        </Button>
      ),
    },
  ];

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="收入"
              value={formatAmount(stats.income)}
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="支出"
              value={formatAmount(stats.expense)}
              prefix={<ArrowDownOutlined />}
              valueStyle={{ color: '#f5222d', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="结余"
              value={formatAmount(stats.balance)}
              prefix={<SwapOutlined />}
              valueStyle={{ color: stats.balance >= 0 ? '#52c41a' : '#f5222d', fontSize: 18 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="记录数"
              value={stats.count}
              suffix="笔"
              valueStyle={{ fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>

      <Table<Transaction>
        columns={columns}
        dataSource={filteredTransactions}
        rowKey="id"
        loading={loading}
        onChange={handleTableChange}
        pagination={{
          current: currentPage,
          pageSize: PAGE_SIZE,
          total: filteredTransactions.length,
          showSizeChanger: false,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
        }}
        locale={{
          emptyText: <EmptyState description="暂无交易记录" />,
        }}
      />

      {/* Preview modal for images */}
      <Modal
        title="凭证预览"
        open={previewOpen}
        onCancel={() => { setPreviewOpen(false); setPreviewImages([]); }}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {previewImages.map((att) => (
            <Image
              key={att.id}
              src={toDisplayUrl(att.url)}
              style={{ maxWidth: '100%', borderRadius: 4 }}
              alt={att.name}
            />
          ))}
        </Space>
      </Modal>

      {/* Upload modal for empty document slots */}
      <Modal
        title={uploadTarget?.label}
        open={!!uploadTarget}
        onCancel={() => { setUploadTarget(null); setUploadFiles([]); }}
        onOk={handleUploadSave}
        okText="保存"
        cancelText="取消"
        okButtonProps={{ disabled: uploadFiles.length === 0 }}
        destroyOnClose
        width={480}
      >
        <ImageUpload
          value={uploadFiles}
          onChange={setUploadFiles}
          maxCount={5}
          accept="image/*,.pdf,application/pdf"
          label={uploadTarget?.label || '上传文件'}
        />
      </Modal>
    </>
  );
};

export default TransactionTable;
