import React, { useEffect } from 'react';
import { Card, Space, Typography, Badge } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  ScheduleOutlined,
  WalletOutlined,
  PhoneOutlined,
  UserOutlined,
  MoneyCollectOutlined,
  PayCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  useTransactionStore,
  usePendingIncomePayments,
  usePendingExpensePayments,
  usePendingInvoices,
  usePendingTaxes,
} from '@/store/useTransactionStore';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';
import { useReimbursementStore } from '@/store/useReimbursementStore';
import { getEmployeeReminders, getUnpaidSalaries, getSalaryDifferences } from '@/api/employee';
import { computeReminders, computeRecurringReminders } from '@/utils/reminder';
import { useThemeToken } from '@/hooks/useThemeToken';
import { formatAmount } from '@/utils/format';

const { Text, Link } = Typography;

const PendingTasks: React.FC = () => {
  const navigate = useNavigate();
  const { token, colors } = useThemeToken();
  const pendingIncomePayments = usePendingIncomePayments();
  const pendingExpensePayments = usePendingExpensePayments();
  const pendingInvoices = usePendingInvoices();
  const pendingTaxes = usePendingTaxes();
  const pendingPayments = useTransactionStore((s) => s.pendingPayments);
  const recurringItems = useRecurringExpenseStore((s) => s.items);
  const pendingReimbursementCount = useReimbursementStore((s) => s.pendingCount);
  const fetchPendingReimbursementCount = useReimbursementStore((s) => s.fetchPendingCount);
  const unpaidReimbursementCount = useReimbursementStore((s) => s.unpaidCount);
  const unpaidReimbursementAmount = useReimbursementStore((s) => s.unpaidAmount);
  const fetchUnpaidReimbursementInfo = useReimbursementStore((s) => s.fetchUnpaidInfo);
  const reminders = computeReminders(pendingPayments);
  const collectionReminders = reminders.filter((r) => r.type === 'collection_overdue');
  const recurringReminders = computeRecurringReminders(recurringItems);
  const [employeeReminderCount, setEmployeeReminderCount] = React.useState(0);
  const [unpaidSalaryCount, setUnpaidSalaryCount] = React.useState(0);
  const [unpaidSalaryAmount, setUnpaidSalaryAmount] = React.useState(0);
  const [salaryDiffCount, setSalaryDiffCount] = React.useState(0);
  const [salaryDiffAmount, setSalaryDiffAmount] = React.useState(0);

  useEffect(() => {
    fetchPendingReimbursementCount();
    fetchUnpaidReimbursementInfo();
    getEmployeeReminders().then((res) => {
      setEmployeeReminderCount(res.data?.length ?? 0);
    }).catch(() => {});
    getUnpaidSalaries().then((res) => {
      setUnpaidSalaryCount(res.data?.count ?? 0);
      setUnpaidSalaryAmount(res.data?.totalAmount ?? 0);
    }).catch(() => {});
    getSalaryDifferences().then((res) => {
      const items = res.data ?? [];
      setSalaryDiffCount(items.length);
      setSalaryDiffAmount(Math.round(items.reduce((s, i) => s + Math.abs(i.difference), 0) * 100) / 100);
    }).catch(() => {});
  }, []);

  const items = [
    // 资金流动
    {
      key: 'income-payment',
      icon: <DollarOutlined style={{ fontSize: 20, color: colors.warning }} />,
      label: '待到账',
      count: pendingIncomePayments.length,
      tab: 'income-payment',
    },
    {
      key: 'expense-payment',
      icon: <DollarOutlined style={{ fontSize: 20, color: colors.expense }} />,
      label: '待支出',
      count: pendingExpensePayments.length,
      tab: 'expense-payment',
    },
    {
      key: 'salary-unpaid',
      icon: <PayCircleOutlined style={{ fontSize: 20, color: colors.expense }} />,
      label: unpaidSalaryCount > 0 ? `待开工资 ¥${formatAmount(unpaidSalaryAmount)}` : '待开工资',
      count: unpaidSalaryCount,
      tab: 'salary-unpaid',
    },
    {
      key: 'salary-diff',
      icon: <WarningOutlined style={{ fontSize: 20, color: '#faad14' }} />,
      label: salaryDiffCount > 0 ? `工资差额 ¥${formatAmount(salaryDiffAmount)}` : '工资差额',
      count: salaryDiffCount,
      tab: 'salary-diff',
    },
    {
      key: 'collection',
      icon: <PhoneOutlined style={{ fontSize: 20, color: colors.expense }} />,
      label: '应收催款',
      count: collectionReminders.length,
      tab: 'overdue',
    },
    // 票据报销
    {
      key: 'invoice',
      icon: <FileTextOutlined style={{ fontSize: 20, color: colors.info }} />,
      label: '待开票',
      count: pendingInvoices.length,
      tab: 'invoice',
    },
    {
      key: 'reimbursement',
      icon: <WalletOutlined style={{ fontSize: 20, color: colors.warning }} />,
      label: '待确认报销',
      count: pendingReimbursementCount,
      tab: 'reimbursement',
    },
    {
      key: 'reimbursement-unpaid',
      icon: <MoneyCollectOutlined style={{ fontSize: 20, color: colors.expense }} />,
      label: unpaidReimbursementCount > 0 ? `待打款 ¥${formatAmount(unpaidReimbursementAmount)}` : '待打款',
      count: unpaidReimbursementCount,
      tab: 'reimbursement',
    },
    // 周期提醒
    {
      key: 'recurring',
      icon: <ScheduleOutlined style={{ fontSize: 20, color: token.colorPrimary }} />,
      label: '固定开销提醒',
      count: recurringReminders.length,
      tab: 'recurring',
    },
    {
      key: 'overdue',
      icon: <ClockCircleOutlined style={{ fontSize: 20, color: colors.expense }} />,
      label: '超时提醒',
      count: reminders.length,
      tab: 'overdue',
    },
    {
      key: 'employee',
      icon: <UserOutlined style={{ fontSize: 20, color: token.colorPrimary }} />,
      label: '工资/入职提醒',
      count: employeeReminderCount,
      tab: 'employee',
    },
    // 合规（低频末位）
    {
      key: 'tax',
      icon: <AuditOutlined style={{ fontSize: 20, color: colors.expense }} />,
      label: '待申报',
      count: pendingTaxes.length,
      tab: 'tax',
    },
  ];

  return (
    <Card
      title="待办事项"
      size="small"
      extra={<Link onClick={() => navigate('/tasks')}>查看全部</Link>}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '6px 10px',
              borderRadius: 6,
              transition: 'background 0.2s',
            }}
            onClick={() => navigate(
              item.key === 'reimbursement' || item.key === 'reimbursement-unpaid' ? '/reimbursement' :
              item.key === 'employee' ? '/employee' :
              `/tasks?tab=${item.tab}`
            )}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = token.colorBgTextHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Space size="small">
              {item.icon}
              <Text style={{ fontSize: 13 }}>{item.label}</Text>
            </Space>
            <Badge
              count={item.count}
              overflowCount={99}
              color={item.key === 'overdue' ? colors.expense : item.key === 'recurring' ? colors.primary : undefined}
            />
          </div>
        ))}
      </Space>
    </Card>
  );
};

export default PendingTasks;
