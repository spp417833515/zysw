import React from 'react';
import { Card, Space, Typography, Badge } from 'antd';
import {
  DollarOutlined,
  FileTextOutlined,
  AuditOutlined,
  ClockCircleOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  useTransactionStore,
  usePendingPayments,
  usePendingInvoices,
  usePendingTaxes,
} from '@/store/useTransactionStore';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';
import { computeReminders, computeRecurringReminders } from '@/utils/reminder';

const { Text, Link } = Typography;

const PendingTasks: React.FC = () => {
  const navigate = useNavigate();
  const pendingPayments = usePendingPayments();
  const pendingInvoices = usePendingInvoices();
  const pendingTaxes = usePendingTaxes();
  const transactions = useTransactionStore((s) => s.transactions);
  const recurringItems = useRecurringExpenseStore((s) => s.items);
  const reminders = computeReminders(transactions);
  const recurringReminders = computeRecurringReminders(recurringItems);

  const items = [
    {
      key: 'payment',
      icon: <DollarOutlined style={{ fontSize: 20, color: '#faad14' }} />,
      label: '待确认到账',
      count: pendingPayments.length,
      tab: 'payment',
    },
    {
      key: 'invoice',
      icon: <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />,
      label: '待开票',
      count: pendingInvoices.length,
      tab: 'invoice',
    },
    {
      key: 'tax',
      icon: <AuditOutlined style={{ fontSize: 20, color: '#f5222d' }} />,
      label: '待申报',
      count: pendingTaxes.length,
      tab: 'tax',
    },
    {
      key: 'overdue',
      icon: <ClockCircleOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />,
      label: '超时提醒',
      count: reminders.length,
      tab: 'overdue',
    },
    {
      key: 'recurring',
      icon: <ScheduleOutlined style={{ fontSize: 20, color: '#722ed1' }} />,
      label: '固定开销提醒',
      count: recurringReminders.length,
      tab: 'recurring',
    },
  ];

  return (
    <Card
      title="待办事项"
      extra={<Link onClick={() => navigate('/tasks')}>查看全部</Link>}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: 6,
              transition: 'background 0.2s',
            }}
            onClick={() => navigate(`/tasks?tab=${item.tab}`)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Space>
              {item.icon}
              <Text>{item.label}</Text>
            </Space>
            <Badge
              count={item.count}
              overflowCount={99}
              color={item.key === 'overdue' ? '#ff4d4f' : item.key === 'recurring' ? '#722ed1' : undefined}
            />
          </div>
        ))}
      </Space>
    </Card>
  );
};

export default PendingTasks;
