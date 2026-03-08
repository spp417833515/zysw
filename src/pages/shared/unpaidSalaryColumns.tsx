import { Typography } from 'antd';
import { formatAmount } from '@/utils/format';
import type { UnpaidSalaryItem } from '@/types/employee';

const { Text } = Typography;

export const baseUnpaidSalaryColumns = [
  { title: '员工', dataIndex: 'employeeName', key: 'employeeName', width: 100 },
  { title: '年份', dataIndex: 'year', key: 'year', width: 80 },
  { title: '月份', dataIndex: 'month', key: 'month', width: 80, render: (v: number) => `${v}月` },
  {
    title: '应发工资', dataIndex: 'baseSalary', key: 'baseSalary', width: 120,
    render: (v: number) => <Text type="danger">¥{formatAmount(v)}</Text>,
  },
];

export function makeUnpaidActionColumn(onConfirm: (record: UnpaidSalaryItem) => void) {
  return {
    title: '操作', key: 'action', width: 120,
    render: (_: unknown, record: UnpaidSalaryItem) => (
      <a onClick={() => onConfirm(record)} style={{ color: '#f5222d', fontWeight: 500 }}>
        确认发放
      </a>
    ),
  };
}
