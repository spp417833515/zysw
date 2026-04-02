import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  AccountBookOutlined,
  CreditCardOutlined,
  WalletOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useAccountStore } from '@/store/useAccountStore';
import { useReimbursementStore } from '@/store/useReimbursementStore';
import {
  usePendingIncomePayments,
  usePendingExpensePayments,
} from '@/store/useTransactionStore';
import { getUnpaidSalaries, getSalaryDifferences } from '@/api/employee';
import { formatAmount } from '@/utils/format';
import { semanticColors, functionalColors } from '@/theme/tokens/colors';

const SummaryCards: React.FC = () => {
  const { accounts } = useAccountStore();
  const unpaidReimbursementAmount = useReimbursementStore((s) => s.unpaidAmount);
  const fetchUnpaidInfo = useReimbursementStore((s) => s.fetchUnpaidInfo);

  const pendingIncomePayments = usePendingIncomePayments();
  const pendingExpensePayments = usePendingExpensePayments();

  const [unpaidSalaryAmount, setUnpaidSalaryAmount] = useState(0);
  const [salaryDiffUnderpaid, setSalaryDiffUnderpaid] = useState(0);
  const [salaryDiffOverpaid, setSalaryDiffOverpaid] = useState(0);

  useEffect(() => {
    fetchUnpaidInfo();
    getUnpaidSalaries().then((res) => {
      setUnpaidSalaryAmount(res.data?.totalAmount ?? 0);
    }).catch(() => {});
    getSalaryDifferences().then((res) => {
      const items = res.data ?? [];
      let underpaid = 0;
      let overpaid = 0;
      for (const item of items) {
        if (item.difference > 0) underpaid += item.difference;
        else overpaid += Math.abs(item.difference);
      }
      setSalaryDiffUnderpaid(Math.round(underpaid * 100) / 100);
      setSalaryDiffOverpaid(Math.round(overpaid * 100) / 100);
    }).catch(() => {});
  }, []);

  const totalAssets = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  }, [accounts]);

  // 待收入：待到账流水 + 员工欠公司（多发）
  const pendingIncomeAmount = useMemo(() => {
    return pendingIncomePayments.reduce((s, t) => s + (t.amount ?? 0), 0);
  }, [pendingIncomePayments]);
  const totalPendingIncome = pendingIncomeAmount + salaryDiffOverpaid;

  // 待支出：待支出流水 + 待开工资 + 待打款报销 + 欠员工差额
  const pendingExpenseAmount = useMemo(() => {
    return pendingExpensePayments.reduce((s, t) => s + (t.amount ?? 0), 0);
  }, [pendingExpensePayments]);
  const totalPendingExpense = pendingExpenseAmount + unpaidSalaryAmount + unpaidReimbursementAmount + salaryDiffUnderpaid;

  const netBalance = totalAssets + totalPendingIncome - totalPendingExpense;

  const cardStyle = { height: '100%' };
  const iconBox = (color: string, icon: React.ReactNode) => (
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: `${color}15`, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: 22, color,
    }}>
      {icon}
    </div>
  );

  const lineItem = (label: string, amount: number, color: string) => (
    <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span style={{ color }}>{amount > 0 ? `¥${formatAmount(amount)}` : '-'}</span>
    </div>
  );

  const totalLine = (label: string, amount: number, color: string) => (
    <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', marginTop: 4, paddingTop: 4, fontWeight: 600 }}>
      <span>{label}</span>
      <span style={{ color }}>¥{formatAmount(amount)}</span>
    </div>
  );

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={6}>
        <Card hoverable style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {iconBox(functionalColors.info, <AccountBookOutlined />)}
            <Statistic title="总资产" value={`¥${formatAmount(totalAssets)}`} />
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={6}>
        <Card hoverable style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {iconBox(semanticColors.income, <DollarOutlined />)}
            <div style={{ flex: 1 }}>
              <div style={{ color: '#999', fontSize: 13, marginBottom: 4 }}>待收入</div>
              {lineItem('待到账', pendingIncomeAmount, semanticColors.income)}
              {lineItem('员工欠款', salaryDiffOverpaid, semanticColors.income)}
              {totalLine('合计', totalPendingIncome, semanticColors.income)}
            </div>
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={6}>
        <Card hoverable style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {iconBox(semanticColors.expense, <CreditCardOutlined />)}
            <div style={{ flex: 1 }}>
              <div style={{ color: '#999', fontSize: 13, marginBottom: 4 }}>待支出</div>
              {lineItem('待支出流水', pendingExpenseAmount, semanticColors.expense)}
              {lineItem('待开工资', unpaidSalaryAmount, semanticColors.expense)}
              {lineItem('待打款报销', unpaidReimbursementAmount, semanticColors.expense)}
              {lineItem('欠员工差额', salaryDiffUnderpaid, semanticColors.expense)}
              {totalLine('合计', totalPendingExpense, semanticColors.expense)}
            </div>
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={6}>
        <Card hoverable style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {iconBox(netBalance >= 0 ? semanticColors.income : semanticColors.expense, <WalletOutlined />)}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#999' }}>实际余额</span>
                <span style={{ fontWeight: 600 }}>¥{formatAmount(totalAssets)}</span>
              </div>
              <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', marginTop: 4, paddingTop: 4, fontWeight: 600 }}>
                <span>净余额</span>
                <span style={{ color: netBalance >= 0 ? semanticColors.income : semanticColors.expense }}>
                  ¥{formatAmount(netBalance)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default SummaryCards;
