import React, { useEffect } from 'react';
import { Card, Space, Typography, Badge } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  ScheduleOutlined,
  WalletOutlined,
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
import { computeReminders, computeRecurringReminders } from '@/utils/reminder';
import { useThemeToken } from '@/hooks/useThemeToken';

const { Text, Link } = Typography;

const PendingTasks: React.FC = () => {
  const navigate = useNavigate();
  const { token, colors } = useThemeToken();
  const pendingIncomePayments = usePendingIncomePayments();
  const pendingExpensePayments = usePendingExpensePayments();
  const pendingInvoices = usePendingInvoices();
  const pendingTaxes = usePendingTaxes();
  const transactions = useTransactionStore((s) => s.transactions);
  const recurringItems = useRecurringExpenseStore((s) => s.items);
  const pendingReimbursementCount = useReimbursementStore((s) => s.pendingCount);
  const fetchPendingReimbursementCount = useReimbursementStore((s) => s.fetchPendingCount);
  const reminders = computeReminders(transactions);
  const recurringReminders = computeRecurringReminders(recurringItems);

  useEffect(() => { fetchPendingReimbursementCount(); }, []);

  const items = [
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
      key: 'invoice',
      icon: <FileTextOutlined style={{ fontSize: 20, color: colors.info }} />,
      label: '待开票',
      count: pendingInvoices.length,
      tab: 'invoice',
    },
    {
      key: 'tax',
      icon: <AuditOutlined style={{ fontSize: 20, color: colors.expense }} />,
      label: '待申报',
      count: pendingTaxes.length,
      tab: 'tax',
    },
    {
      key: 'overdue',
      icon: <ClockCircleOutlined style={{ fontSize: 20, color: colors.expense }} />,
      label: '超时提醒',
      count: reminders.length,
      tab: 'overdue',
    },
    {
      key: 'recurring',
      icon: <ScheduleOutlined style={{ fontSize: 20, color: token.colorPrimary }} />,
      label: '固定开销提醒',
      count: recurringReminders.length,
      tab: 'recurring',
    },
    {
      key: 'reimbursement',
      icon: <WalletOutlined style={{ fontSize: 20, color: colors.warning }} />,
      label: '待报销',
      count: pendingReimbursementCount,
      tab: 'reimbursement',
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
            onClick={() => navigate(item.key === 'reimbursement' ? '/reimbursement' : `/tasks?tab=${item.tab}`)}
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
