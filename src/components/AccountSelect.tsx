import React, { useEffect } from 'react';
import { Select } from 'antd';
import { useAccountStore } from '@/store/useAccountStore';

interface AccountSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  excludeId?: string;
  style?: React.CSSProperties;
}

const AccountSelect: React.FC<AccountSelectProps> = ({
  value,
  onChange,
  placeholder = '请选择账户',
  excludeId,
  style,
}) => {
  const accounts = useAccountStore((s) => s.accounts);
  const fetchAccounts = useAccountStore((s) => s.fetchAccounts);

  // 确保账户数据已加载（用户可能直接进入交易页面而未访问账户管理）
  useEffect(() => {
    if (accounts.length === 0) {
      fetchAccounts();
    }
  }, [accounts.length, fetchAccounts]);

  const options = accounts
    .filter((a) => a.id !== excludeId)
    .map((a) => ({
      label: `${a.name} (¥${a.balance.toLocaleString()})`,
      value: a.id,
    }));

  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      style={{ width: '100%', ...style }}
      allowClear
    />
  );
};

export default AccountSelect;
