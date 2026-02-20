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
import TaxDeadlineReminder from './components/TaxDeadlineReminder';
import QuarterlyTaxBudget from './components/QuarterlyTaxBudget';

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
      {/* 第一行：汇总卡片 */}
      <SummaryCards />

      {/* 第二行：税务信息 + 快速操作 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <TaxDeadlineReminder />
        </Col>
        <Col xs={24} lg={12}>
          <QuickActions />
        </Col>
      </Row>

      {/* 第三行：季度交税预算 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <QuarterlyTaxBudget />
        </Col>
      </Row>

      {/* 第四行：图表 + 待办事项 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <ExpensePieChart />
        </Col>
        <Col xs={24} lg={8}>
          <IncomeTrendChart />
        </Col>
        <Col xs={24} lg={8}>
          <PendingTasks />
        </Col>
      </Row>

      {/* 第五行：最近交易 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <RecentTransactions />
        </Col>
      </Row>
    </PageContainer>
  );
};

export default Dashboard;
