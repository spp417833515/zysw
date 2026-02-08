import React from 'react';
import { Layout, Menu, Badge } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  TransactionOutlined,
  BankOutlined,
  AppstoreOutlined,
  FundOutlined,
  BarChartOutlined,
  FileTextOutlined,
  SettingOutlined,
  BellOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import {
  useTransactionStore,
  usePendingPayments,
  usePendingInvoices,
  usePendingTaxes,
} from '@/store/useTransactionStore';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';
import { computeReminders, computeRecurringReminders } from '@/utils/reminder';

const { Sider } = Layout;

const AppSidebar: React.FC = () => {
  const pendingPayments = usePendingPayments();
  const pendingInvoices = usePendingInvoices();
  const pendingTaxes = usePendingTaxes();
  const transactions = useTransactionStore((s) => s.transactions);
  const recurringItems = useRecurringExpenseStore((s) => s.items);
  const overdueCount = computeReminders(transactions).length;
  const recurringCount = computeRecurringReminders(recurringItems).length;
  const totalPending = pendingPayments.length + pendingInvoices.length + pendingTaxes.length + overdueCount + recurringCount;

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/transaction', icon: <TransactionOutlined />, label: '收支流水' },
    {
      key: '/tasks',
      icon: <BellOutlined />,
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          待办任务
          {totalPending > 0 && <Badge count={totalPending} size="small" />}
        </span>
      ),
    },
    { key: '/account', icon: <BankOutlined />, label: '账户管理' },
    { key: '/category', icon: <AppstoreOutlined />, label: '分类管理' },
    { key: '/budget', icon: <FundOutlined />, label: '预算管理' },
    { key: '/recurring-expense', icon: <ScheduleOutlined />, label: '月固定开销' },
    { key: '/report', icon: <BarChartOutlined />, label: '报表中心' },
    { key: '/invoice', icon: <FileTextOutlined />, label: '发票管理' },
    { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
  ];
  const navigate = useNavigate();
  const location = useLocation();
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);

  const selectedKey = '/' + (location.pathname.split('/')[1] || '');

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setSidebarCollapsed}
      width={240}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 16 : 18,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {collapsed ? '财务' : '小微企业财务记账'}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey === '/' ? '/' : selectedKey]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
};

export default AppSidebar;
