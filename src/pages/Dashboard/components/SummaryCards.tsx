import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import {
  AccountBookOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import StatCard from '@/components/StatCard';
import { useTransactionStore } from '@/store/useTransactionStore';
import { useAccountStore } from '@/store/useAccountStore';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';

const SummaryCards: React.FC = () => {
  const { transactions } = useTransactionStore();
  const { accounts } = useAccountStore();

  const totalAssets = useMemo(() => {
    return accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);
  }, [accounts]);

  const { monthlyIncome, monthlyExpense } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      const date = new Date(t.date);
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        if (t.type === 'income') {
          income += t.amount;
        } else if (t.type === 'expense') {
          expense += t.amount;
        }
      }
    });

    return { monthlyIncome: income, monthlyExpense: expense };
  }, [transactions]);

  const monthlyBalance = monthlyIncome - monthlyExpense;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} xl={6}>
        <StatCard
          title="总资产"
          value={`¥${formatAmount(totalAssets)}`}
          icon={<AccountBookOutlined />}
        />
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <StatCard
          title="本月收入"
          value={`¥${formatAmount(monthlyIncome)}`}
          icon={<ArrowUpOutlined />}
          color={semanticColors.income}
        />
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <StatCard
          title="本月支出"
          value={`¥${formatAmount(monthlyExpense)}`}
          icon={<ArrowDownOutlined />}
          color={semanticColors.expense}
        />
      </Col>
      <Col xs={24} sm={12} xl={6}>
        <StatCard
          title="本月结余"
          value={`¥${formatAmount(monthlyBalance)}`}
          icon={<WalletOutlined />}
          color={monthlyBalance >= 0 ? semanticColors.income : semanticColors.expense}
        />
      </Col>
    </Row>
  );
};

export default SummaryCards;
