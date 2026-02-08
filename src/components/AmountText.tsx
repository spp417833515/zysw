import React from 'react';
import { Typography } from 'antd';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';

interface AmountTextProps {
  value: number;
  type?: 'income' | 'expense' | 'transfer';
  prefix?: string;
  showSign?: boolean;
  style?: React.CSSProperties;
}

const AmountText: React.FC<AmountTextProps> = ({
  value,
  type,
  prefix = '¥',
  showSign = false,
  style,
}) => {
  const getColor = () => {
    if (type === 'income') return semanticColors.income;
    if (type === 'expense') return semanticColors.expense;
    if (type === 'transfer') return semanticColors.transfer;
    return undefined;
  };

  const sign = showSign ? (type === 'expense' ? '-' : '+') : '';

  return (
    <Typography.Text strong style={{ color: getColor(), ...style }}>
      {sign}{prefix}{formatAmount(Math.abs(value))}
    </Typography.Text>
  );
};

export default AmountText;
