import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Row,
  Col,
  Card,
  Statistic,
  Modal,
  message,
  Space,
  Input,
  Select,
  DatePicker,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import PageContainer from '@/components/PageContainer';
import InvoiceTable from './components/InvoiceTable';
import InvoicePreview from './components/InvoicePreview';
import {
  getInvoices,
  getInvoiceStats,
  deleteInvoice,
  verifyInvoice,
  voidInvoice,
  type InvoiceListParams,
  type InvoiceStats,
} from '@/api/invoice';
import type { Invoice } from '@/types/invoice';

const { confirm } = Modal;
const { RangePicker } = DatePicker;

const InvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);

  // 筛选条件
  const [direction, setDirection] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  // 统计
  const [stats, setStats] = useState<InvoiceStats | null>(null);

  const fetchData = useCallback(async (
    overrides?: Partial<InvoiceListParams> & { _page?: number; _pageSize?: number },
  ) => {
    setLoading(true);
    try {
      const useDateRange = overrides?.start_date !== undefined || overrides?.end_date !== undefined;
      const params: InvoiceListParams = {
        page: overrides?._page ?? page,
        page_size: overrides?._pageSize ?? pageSize,
        direction: overrides?.direction !== undefined ? overrides.direction : direction,
        type: overrides?.type !== undefined ? overrides.type : type,
        status: overrides?.status !== undefined ? overrides.status : status,
        keyword: (overrides?.keyword !== undefined ? overrides.keyword : keyword) || undefined,
        start_date: useDateRange ? overrides?.start_date : dateRange?.[0]?.format('YYYY-MM-DD'),
        end_date: useDateRange ? overrides?.end_date : dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      const res = await getInvoices(params);
      const d = res.data;
      setInvoices(d.data ?? []);
      setTotal(d.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, direction, type, status, keyword, dateRange]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getInvoiceStats();
      setStats(res.data);
    } catch {
      // ignore
    }
  }, []);

  // 仅首次加载
  const initialized = React.useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      fetchData();
      fetchStats();
    }
  }, [fetchData, fetchStats]);

  const handlePageChange = (p: number, ps: number) => {
    setPage(p);
    setPageSize(ps);
    fetchData({ _page: p, _pageSize: ps });
  };

  const handleSearch = () => {
    setPage(1);
    fetchData({ _page: 1 });
  };

  const handleReset = () => {
    setDirection(undefined);
    setType(undefined);
    setStatus(undefined);
    setKeyword('');
    setDateRange(null);
    setPage(1);
    // 传入所有重置值，避免闭包使用旧状态
    fetchData({
      _page: 1,
      direction: undefined,
      type: undefined,
      status: undefined,
      keyword: '',
      start_date: undefined,
      end_date: undefined,
    });
  };

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
      content: `确定要删除发票 ${invoice.number || invoice.id.slice(0, 8)} 吗？`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const res = await deleteInvoice(invoice.id);
          if (res.code === 0) {
            message.success('发票已删除');
            fetchData();
            fetchStats();
          } else {
            message.error(res.message || '删除失败');
          }
        } catch {
          message.error('删除失败');
        }
      },
    });
  };

  const handleVerify = async (invoice: Invoice) => {
    try {
      const res = await verifyInvoice(invoice.id);
      if (res.code === 0) {
        message.success('已标记为已验证');
        fetchData();
        fetchStats();
      }
    } catch {
      message.error('操作失败');
    }
  };

  const handleVoid = (invoice: Invoice) => {
    confirm({
      title: '确认作废',
      icon: <ExclamationCircleOutlined />,
      content: `确定要作废发票 ${invoice.number || invoice.id.slice(0, 8)} 吗？作废后不可恢复。`,
      okText: '确定作废',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const res = await voidInvoice(invoice.id);
          if (res.code === 0) {
            message.success('发票已作废');
            fetchData();
            fetchStats();
          }
        } catch {
          message.error('操作失败');
        }
      },
    });
  };

  return (
    <PageContainer
      title="发票管理"
      extra={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/invoice/create')}
        >
          新增发票
        </Button>,
      ]}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="发票总数"
              value={stats?.total ?? 0}
              suffix="张"
              prefix={<FileTextOutlined style={{ color: '#1890ff', marginRight: 4 }} />}
            />
            {(stats?.pending ?? 0) > 0 && (
              <div style={{ marginTop: 8 }}>
                <Tag color="orange">{stats?.pending} 张待验证</Tag>
              </div>
            )}
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="收到发票（进项）"
              value={stats?.received?.totalAmount ?? 0}
              precision={2}
              prefix={<ArrowDownOutlined style={{ color: '#1890ff' }} />}
              suffix="元"
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
              共 {stats?.received?.count ?? 0} 张 | 税额 ¥{(stats?.received?.taxAmount ?? 0).toFixed(2)}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="开出发票（销项）"
              value={stats?.issued?.totalAmount ?? 0}
              precision={2}
              prefix={<ArrowUpOutlined style={{ color: '#52c41a' }} />}
              suffix="元"
              valueStyle={{ color: '#52c41a' }}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
              共 {stats?.issued?.count ?? 0} 张 | 税额 ¥{(stats?.issued?.taxAmount ?? 0).toFixed(2)}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="本月收到"
              value={stats?.monthReceived?.totalAmount ?? 0}
              precision={2}
              prefix="¥"
              valueStyle={{ fontSize: 20 }}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#999' }}>
              本月开出 ¥{(stats?.monthIssued?.totalAmount ?? 0).toFixed(2)}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col>
            <Input.Search
              placeholder="搜索发票号码/代码/名称"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onSearch={handleSearch}
              style={{ width: 220 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="方向"
              value={direction}
              onChange={setDirection}
              allowClear
              style={{ width: 120 }}
              options={[
                { label: '收到发票', value: 'in' },
                { label: '开出发票', value: 'out' },
              ]}
            />
          </Col>
          <Col>
            <Select
              placeholder="类型"
              value={type}
              onChange={setType}
              allowClear
              style={{ width: 140 }}
              options={[
                { label: '增值税普通发票', value: 'normal' },
                { label: '增值税专用发票', value: 'special' },
                { label: '电子发票', value: 'electronic' },
              ]}
            />
          </Col>
          <Col>
            <Select
              placeholder="状态"
              value={status}
              onChange={setStatus}
              allowClear
              style={{ width: 100 }}
              options={[
                { label: '待验证', value: 'pending' },
                { label: '已验证', value: 'verified' },
                { label: '已作废', value: 'void' },
              ]}
            />
          </Col>
          <Col>
            <RangePicker
              value={dateRange}
              onChange={(v) => setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              placeholder={['开票起始', '开票截止']}
              style={{ width: 240 }}
            />
          </Col>
          <Col>
            <Space>
              <Button type="primary" onClick={handleSearch}>查询</Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <InvoiceTable
        invoices={invoices}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onView={handleView}
        onDelete={handleDelete}
        onVerify={handleVerify}
        onVoid={handleVoid}
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
