import React, { useEffect } from 'react';
import { Row, Col } from 'antd';
import PageContainer from '@/components/PageContainer';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';
import SummaryCards from './components/SummaryCards';
import ExpensePieChart from './components/ExpensePieChart';
import IncomeTrendChart from './components/IncomeTrendChart';
import RecentTransactions from './components/RecentTransactions';
import QuickActions from './components/QuickActions';
import PendingTasks from './components/PendingTasks';

const Dashboard: React.FC = () => {
  const { fetchTransactions } = useTransactionStore();
  const { fetchAccounts } = useAccountStore();
  const { fetchItems: fetchRecurring } = useRecurringExpenseStore();

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchRecurring();
  }, [fetchTransactions, fetchAccounts, fetchRecurring]);

  return (
    <PageContainer title="仪表盘">
      <SummaryCards />

      <div style={{ marginTop: 16 }}>
        <QuickActions />
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <ExpensePieChart />
        </Col>
        <Col xs={24} lg={12}>
          <IncomeTrendChart />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <RecentTransactions />
        </Col>
        <Col xs={24} lg={10}>
          <PendingTasks />
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Dashboard;
