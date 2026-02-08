import React from 'react';
import { InputNumber } from 'antd';

interface AmountInputProps {
  value?: number;
  onChange?: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  placeholder = '请输入金额',
  disabled,
  style,
}) => {
  return (
    <InputNumber
      value={value}
      onChange={onChange}
      prefix="¥"
      placeholder={placeholder}
      disabled={disabled}
      precision={2}
      min={0}
      style={{ width: '100%', ...style }}
      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      parser={(val) => val!.replace(/,/g, '') as unknown as number}
    />
  );
};

export default AmountInput;
