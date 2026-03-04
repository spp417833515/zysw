import React, { useEffect, useMemo, useState } from 'react';
import { Tabs, Card, Row, Col, Statistic, Table, Button, Space, Tag, Typography } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  ScheduleOutlined,
  PayCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { formatDate, formatAmount } from '@/utils/format';
import { computeReminders, computeRecurringReminders, REMINDER_TYPE_LABELS } from '@/utils/reminder';
import type { ReminderItem, RecurringReminderItem } from '@/utils/reminder';
import { useThemeToken } from '@/hooks/useThemeToken';
import AmountText from '@/components/AmountText';
import PaymentConfirmModal from './components/PaymentConfirmModal';
import InvoiceConfirmModal from './components/InvoiceConfirmModal';
import TaxDeclareModal from './components/TaxDeclareModal';
import SalaryConfirmModal from './components/SalaryConfirmModal';
import TransactionDetailModal from '@/pages/Transaction/components/TransactionDetailModal';
import { getUnpaidSalaries } from '@/api/employee';
import type { UnpaidSalaryItem } from '@/types/employee';

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
  const [unpaidItems, setUnpaidItems] = useState<UnpaidSalaryItem[]>([]);
  const [unpaidLoading, setUnpaidLoading] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<UnpaidSalaryItem | null>(null);

  const fetchUnpaid = async () => {
    setUnpaidLoading(true);
    try {
      const res: any = await getUnpaidSalaries();
      setUnpaidItems(res.data?.items ?? []);
    } finally {
      setUnpaidLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingData();
    fetchRecurring();
    fetchUnpaid();
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
      render: (v: number, r: any) => <AmountText value={v} type={r.type} />,
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

  const makeActionColumn = (label: string, onAction: (record: any) => void) => ({
    title: '操作',
    key: 'action',
    width: 160,
    render: (_: unknown, record: any) => (
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
    { title: '员工', dataIndex: 'employeeName', key: 'employeeName', width: 100 },
    { title: '年份', dataIndex: 'year', key: 'year', width: 80 },
    { title: '月份', dataIndex: 'month', key: 'month', width: 80, render: (v: number) => `${v}月` },
    {
      title: '应发工资', dataIndex: 'baseSalary', key: 'baseSalary', width: 120,
      render: (v: number) => <Typography.Text type="danger">¥{formatAmount(v)}</Typography.Text>,
    },
    {
      title: '操作', key: 'action', width: 120,
      render: (_: unknown, record: UnpaidSalaryItem) => (
        <Button
          type="primary" danger size="small"
          onClick={() => { setPayingItem(record); setSalaryModalOpen(true); }}
        >
          确认发放
        </Button>
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
        <Table
          rowKey="id"
          columns={taxColumns}
          dataSource={pendingTaxes}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
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
    </PageContainer>
  );
};

export default Tasks;
