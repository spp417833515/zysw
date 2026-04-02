import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, Card, Row, Col, Statistic, Table, Button, Space, Tag, Typography, Modal, DatePicker, message } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  ScheduleOutlined,
  PayCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import PageContainer from '@/components/PageContainer';
import {
  useTransactionStore,
  usePendingIncomePayments,
  usePendingExpensePayments,
  usePendingInvoices,
  usePendingTaxes,
} from '@/store/useTransactionStore';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';
import { TRANSACTION_TYPE_MAP } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import { computeReminders, computeRecurringReminders, REMINDER_TYPE_LABELS } from '@/utils/reminder';
import type { ReminderItem, RecurringReminderItem } from '@/utils/reminder';
import { useThemeToken } from '@/hooks/useThemeToken';
import AmountText from '@/components/AmountText';
import PaymentConfirmModal from './components/PaymentConfirmModal';
import InvoiceConfirmModal from './components/InvoiceConfirmModal';
import TaxDeclareModal from './components/TaxDeclareModal';
import SalaryConfirmModal from './components/SalaryConfirmModal';
import TransactionDetailModal from '@/pages/Transaction/components/TransactionDetailModal';
import { useUnpaidSalaries } from '@/hooks/useUnpaidSalaries';
import { baseUnpaidSalaryColumns, makeUnpaidActionColumn } from '@/pages/shared/unpaidSalaryColumns';
import type { Transaction } from '@/types/transaction';
import type { UnpaidSalaryItem, SalaryDifferenceItem } from '@/types/employee';
import { getSalaryDifferences } from '@/api/employee';
import { formatAmount } from '@/utils/format';

const { Text } = Typography;

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'income-payment';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const { fetchPendingData, pendingPayments } = useTransactionStore();
  const { fetchItems: fetchRecurring, items: recurringItems } = useRecurringExpenseStore();
  const { colors } = useThemeToken();
  const pendingIncomePayments = usePendingIncomePayments();
  const pendingExpensePayments = usePendingExpensePayments();
  const pendingInvoices = usePendingInvoices();
  const pendingTaxes = usePendingTaxes();
  const reminders = useMemo(() => computeReminders(pendingPayments), [pendingPayments]);
  const recurringReminders = useMemo(() => computeRecurringReminders(recurringItems), [recurringItems]);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [taxModalOpen, setTaxModalOpen] = useState(false);
  const [currentTxId, setCurrentTxId] = useState('');
  const [currentTxDate, setCurrentTxDate] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  // 待开工资
  const { unpaidItems, unpaidLoading, fetchUnpaid } = useUnpaidSalaries();
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<UnpaidSalaryItem | null>(null);

  // 工资差额
  const [diffItems, setDiffItems] = useState<SalaryDifferenceItem[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);

  // 一键申报
  const [batchTaxModalOpen, setBatchTaxModalOpen] = useState(false);
  const [batchTaxPeriod, setBatchTaxPeriod] = useState<dayjs.Dayjs | null>(dayjs().subtract(1, 'month').startOf('month'));
  const [batchTaxLoading, setBatchTaxLoading] = useState(false);
  const batchConfirmTaxDeclare = useTransactionStore((s) => s.batchConfirmTaxDeclare);

  const handleBatchTaxDeclare = async () => {
    if (!batchTaxPeriod) {
      message.warning('请选择申报所属期');
      return;
    }
    setBatchTaxLoading(true);
    try {
      const result = await batchConfirmTaxDeclare(batchTaxPeriod.format('YYYY-MM'));
      message.success(`一键申报完成：${result.count} 笔交易已标记为已申报`);
      setBatchTaxModalOpen(false);
      fetchPendingData();
    } catch {
      message.error('申报失败，请重试');
    } finally {
      setBatchTaxLoading(false);
    }
  };
  const fetchDifferences = async () => {
    setDiffLoading(true);
    try {
      const res = await getSalaryDifferences();
      setDiffItems(res.data ?? []);
    } finally {
      setDiffLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingData();
    fetchRecurring();
    fetchUnpaid();
    fetchDifferences();
  }, [fetchPendingData, fetchRecurring]);

  const baseColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (v: string) => formatDate(v),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (v: string) => {
        const info = TRANSACTION_TYPE_MAP[v as keyof typeof TRANSACTION_TYPE_MAP];
        return <Tag color={info?.color}>{info?.label || v}</Tag>;
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (v: number, r: Transaction) => <AmountText value={v} type={r.type} />,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 120,
      render: (v: string) => v || '-',
    },
  ];

  const makeActionColumn = (label: string, onAction: (record: Transaction) => void) => ({
    title: '操作',
    key: 'action',
    width: 160,
    render: (_: unknown, record: Transaction) => (
      <Space>
        <Button type="primary" size="small" onClick={() => onAction(record)}>{label}</Button>
        <Button size="small" onClick={() => setDetailId(record.id)}>详情</Button>
      </Space>
    ),
  });

  const incomePaymentColumns = [
    ...baseColumns,
    makeActionColumn('确认到账', (r) => { setCurrentTxId(r.id); setPaymentModalOpen(true); }),
  ];

  const expensePaymentColumns = [
    ...baseColumns,
    makeActionColumn('确认支出', (r) => { setCurrentTxId(r.id); setPaymentModalOpen(true); }),
  ];

  const invoiceColumns = [
    ...baseColumns,
    makeActionColumn('确认开票', (r) => { setCurrentTxId(r.id); setInvoiceModalOpen(true); }),
  ];

  const taxColumns = [
    ...baseColumns,
    makeActionColumn('确认申报', (r) => { setCurrentTxId(r.id); setCurrentTxDate(r.date); setTaxModalOpen(true); }),
  ];

  const overdueColumns = [
    {
      title: '日期',
      dataIndex: ['transaction', 'date'],
      key: 'date',
      width: 120,
      render: (v: string) => formatDate(v),
    },
    {
      title: '类型',
      dataIndex: ['transaction', 'type'],
      key: 'type',
      width: 80,
      render: (v: string) => {
        const info = TRANSACTION_TYPE_MAP[v as keyof typeof TRANSACTION_TYPE_MAP];
        return <Tag color={info?.color}>{info?.label || v}</Tag>;
      },
    },
    {
      title: '金额',
      dataIndex: ['transaction', 'amount'],
      key: 'amount',
      width: 120,
      render: (v: number, r: ReminderItem) => <AmountText value={v} type={r.transaction.type} />,
    },
    {
      title: '超时类型',
      dataIndex: 'type',
      key: 'reminderType',
      width: 130,
      render: (v: string) => REMINDER_TYPE_LABELS[v] || v,
    },
    {
      title: '超时天数',
      dataIndex: 'daysPassed',
      key: 'daysPassed',
      width: 110,
      render: (v: number, r: ReminderItem) => (
        <Tag color={r.level === 'danger' ? 'red' : 'orange'}>
          {v} 天
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, record: ReminderItem) => (
        <Button
          size="small"
          onClick={() => setDetailId(record.transactionId)}
        >
          详情
        </Button>
      ),
    },
  ];

  const recurringColumns = [
    {
      title: '开销内容',
      dataIndex: ['recurringExpense', 'name'],
      key: 'name',
      width: 160,
    },
    {
      title: '金额',
      dataIndex: ['recurringExpense', 'amount'],
      key: 'amount',
      width: 120,
      render: (v: number) => <AmountText value={v} type="expense" />,
    },
    {
      title: '扣款日',
      dataIndex: ['recurringExpense', 'dayOfMonth'],
      key: 'dayOfMonth',
      width: 100,
      render: (v: number) => `每月 ${v} 号`,
    },
    {
      title: '提醒类型',
      dataIndex: 'type',
      key: 'reminderType',
      width: 130,
      render: (v: string) => {
        const isOverdue = v === 'recurring_overdue';
        return (
          <Tag color={isOverdue ? 'red' : 'blue'}>
            {isOverdue ? '已到扣款日' : '即将到期'}
          </Tag>
        );
      },
    },
    {
      title: '距扣款日',
      dataIndex: 'daysUntil',
      key: 'daysUntil',
      width: 110,
      render: (v: number, r: RecurringReminderItem) => {
        if (v > 0) return <Tag color="blue">还有 {v} 天</Tag>;
        if (v === 0) return <Tag color="orange">今天</Tag>;
        return <Tag color={r.level === 'danger' ? 'red' : 'orange'}>已过 {Math.abs(v)} 天</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: () => (
        <Button
          size="small"
          onClick={() => navigate('/recurring-expense')}
        >
          查看
        </Button>
      ),
    },
  ];

  const unpaidSalaryColumns = [
    ...baseUnpaidSalaryColumns,
    makeUnpaidActionColumn((record) => { setPayingItem(record); setSalaryModalOpen(true); }),
  ];

  const differenceColumns = [
    { title: '员工', dataIndex: 'employeeName', key: 'employeeName', width: 100 },
    { title: '月份', key: 'period', width: 120, render: (_: unknown, r: SalaryDifferenceItem) => `${r.year}年${r.month}月` },
    { title: '应发(税后)', dataIndex: 'netSalary', key: 'netSalary', width: 120, render: (v: number) => `¥${formatAmount(v)}` },
    { title: '实付金额', dataIndex: 'actualPaid', key: 'actualPaid', width: 120, render: (v: number) => `¥${formatAmount(v)}` },
    {
      title: '差额', dataIndex: 'difference', key: 'difference', width: 120,
      render: (v: number) => (
        <Text strong style={{ color: v > 0 ? '#f5222d' : '#faad14' }}>
          ¥{formatAmount(Math.abs(v))}
        </Text>
      ),
    },
    {
      title: '状态', dataIndex: 'type', key: 'type', width: 140,
      render: (_: unknown, r: SalaryDifferenceItem) => (
        <Tag color={r.type === 'underpaid' ? 'red' : 'orange'}>
          {r.type === 'underpaid' ? `欠员工 ¥${formatAmount(r.difference)}` : `员工欠 ¥${formatAmount(Math.abs(r.difference))}`}
        </Tag>
      ),
    },
    {
      title: '待办', key: 'action', width: 180,
      render: (_: unknown, r: SalaryDifferenceItem) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {r.type === 'underpaid' ? `需补发 ¥${formatAmount(r.difference)} 给${r.employeeName}` : `${r.employeeName}需偿还 ¥${formatAmount(Math.abs(r.difference))}`}
        </Text>
      ),
    },
  ];

  const tabItems = [
    // 资金流动
    {
      key: 'income-payment',
      label: `待到账 (${pendingIncomePayments.length})`,
      children: (
        <Table
          rowKey="id"
          columns={incomePaymentColumns}
          dataSource={pendingIncomePayments}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      ),
    },
    {
      key: 'expense-payment',
      label: `待支出 (${pendingExpensePayments.length})`,
      children: (
        <Table
          rowKey="id"
          columns={expensePaymentColumns}
          dataSource={pendingExpensePayments}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      ),
    },
    {
      key: 'salary-unpaid',
      label: `待开工资 (${unpaidItems.length})`,
      children: (
        <Table
          rowKey={(r: UnpaidSalaryItem) => `${r.employeeId}-${r.year}-${r.month}`}
          columns={unpaidSalaryColumns}
          dataSource={unpaidItems}
          loading={unpaidLoading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      ),
    },
    {
      key: 'salary-diff',
      label: `工资差额 (${diffItems.length})`,
      children: (
        <Table
          rowKey="id"
          columns={differenceColumns}
          dataSource={diffItems}
          loading={diffLoading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      ),
    },
    // 票据
    {
      key: 'invoice',
      label: `待开票 (${pendingInvoices.length})`,
      children: (
        <Table
          rowKey="id"
          columns={invoiceColumns}
          dataSource={pendingInvoices}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      ),
    },
    // 周期提醒
    {
      key: 'recurring',
      label: `固定开销提醒 (${recurringReminders.length})`,
      children: (
        <Table
          rowKey={(r: RecurringReminderItem) => `${r.recurringExpenseId}-${r.type}`}
          columns={recurringColumns}
          dataSource={recurringReminders}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      ),
    },
    {
      key: 'overdue',
      label: `超时提醒 (${reminders.length})`,
      children: (
        <Table
          rowKey={(r: ReminderItem) => `${r.transactionId}-${r.type}`}
          columns={overdueColumns}
          dataSource={reminders}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      ),
    },
    // 合规（低频末位）
    {
      key: 'tax',
      label: `待申报 (${pendingTaxes.length})`,
      children: (
        <>
          {pendingTaxes.length > 0 && (
            <div style={{ marginBottom: 16, textAlign: 'right' }}>
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={() => setBatchTaxModalOpen(true)}
              >
                一键申报 ({pendingTaxes.length} 笔)
              </Button>
            </div>
          )}
          <Table
            rowKey="id"
            columns={taxColumns}
            dataSource={pendingTaxes}
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        </>
      ),
    },
  ];

  return (
    <PageContainer title="待办任务">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { title: '待到账', value: pendingIncomePayments.length, suffix: '笔', icon: <DollarOutlined />, color: colors.warning },
          { title: '待支出', value: pendingExpensePayments.length, suffix: '笔', icon: <DollarOutlined />, color: colors.expense },
          { title: '待开工资', value: unpaidItems.length, suffix: '笔', icon: <PayCircleOutlined />, color: colors.expense },
          { title: '工资差额', value: diffItems.length, suffix: '笔', icon: <WarningOutlined />, color: '#faad14' },
          { title: '待开票', value: pendingInvoices.length, suffix: '笔', icon: <FileTextOutlined />, color: colors.info },
          { title: '固定开销', value: recurringReminders.length, suffix: '项', icon: <ScheduleOutlined />, color: colors.primary },
          { title: '超时提醒', value: reminders.length, suffix: '项', icon: <ClockCircleOutlined />, color: colors.expense },
          { title: '待申报', value: pendingTaxes.length, suffix: '笔', icon: <AuditOutlined />, color: colors.expense },
        ].map((s) => (
          <Col key={s.title} xs={12} sm={4}>
            <Card>
              <Statistic title={s.title} value={s.value} suffix={s.suffix} prefix={s.icon} valueStyle={{ color: s.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

      <PaymentConfirmModal
        open={paymentModalOpen}
        transactionId={currentTxId}
        onClose={() => setPaymentModalOpen(false)}
      />
      <InvoiceConfirmModal
        open={invoiceModalOpen}
        transactionId={currentTxId}
        onClose={() => setInvoiceModalOpen(false)}
      />
      <TaxDeclareModal
        open={taxModalOpen}
        transactionId={currentTxId}
        transactionDate={currentTxDate}
        onClose={() => setTaxModalOpen(false)}
      />
      <TransactionDetailModal
        open={!!detailId}
        transactionId={detailId}
        onClose={() => setDetailId(null)}
      />
      <SalaryConfirmModal
        open={salaryModalOpen}
        item={payingItem}
        onClose={() => { setSalaryModalOpen(false); setPayingItem(null); }}
        onSuccess={fetchUnpaid}
      />
      <Modal
        title="一键申报"
        open={batchTaxModalOpen}
        onOk={handleBatchTaxDeclare}
        onCancel={() => setBatchTaxModalOpen(false)}
        okText="确认全部申报"
        cancelText="取消"
        confirmLoading={batchTaxLoading}
        destroyOnClose
      >
        <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
          <Typography.Text>
            将 <Typography.Text strong style={{ color: '#f5222d', fontSize: 18 }}>{pendingTaxes.length}</Typography.Text> 笔待申报交易全部标记为已申报
          </Typography.Text>
          <div>
            <Typography.Text style={{ display: 'block', marginBottom: 8 }}>申报所属期：</Typography.Text>
            <DatePicker
              picker="month"
              value={batchTaxPeriod}
              onChange={(val) => setBatchTaxPeriod(val)}
              placeholder="选择申报所属期"
              style={{ width: '100%' }}
            />
          </div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            确认后所有待申报交易将标记为已完成，并记录申报时间
          </Typography.Text>
        </Space>
      </Modal>
    </PageContainer>
  );
};

export default Tasks;
