import React from 'react';
import { Progress, Typography } from 'antd';
import { formatAmount, formatPercent } from '@/utils/format';

interface BudgetProgressBarProps {
  spent: number;
  amount: number;
  alertThreshold: number;
}

const BudgetProgressBar: React.FC<BudgetProgressBarProps> = ({ spent, amount, alertThreshold }) => {
  const percent = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
  const isOverBudget = spent > amount;
  const isAlert = spent / amount >= alertThreshold;

  const strokeColor = isOverBudget ? '#F5222D' : isAlert ? '#FAAD14' : '#52C41A';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <Typography.Text type="secondary">
          已用 ¥{formatAmount(spent)} / ¥{formatAmount(amount)}
        </Typography.Text>
        <Typography.Text strong style={{ color: strokeColor }}>
          {formatPercent(spent / amount)}
        </Typography.Text>
      </div>
      <Progress
        percent={Number(percent.toFixed(1))}
        strokeColor={strokeColor}
        showInfo={false}
        size="small"
      />
      {isOverBudget && (
        <Typography.Text type="danger" style={{ fontSize: 12 }}>
          已超支 ¥{formatAmount(spent - amount)}
        </Typography.Text>
      )}
    </div>
  );
};

export default BudgetProgressBar;
