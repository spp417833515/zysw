import React, { useMemo } from 'react';
import { Card, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import AmountText from '@/components/AmountText';
import { useTransactionStore } from '@/store/useTransactionStore';
import { formatDate } from '@/utils/format';
import { TRANSACTION_TYPE_MAP } from '@/utils/constants';
import { semanticColors } from '@/theme/tokens/colors';
import type { Transaction } from '@/types/transaction';

const typeColorMap: Record<string, string> = {
  income: semanticColors.income,
  expense: semanticColors.expense,
  transfer: semanticColors.transfer,
};

const RecentTransactions: React.FC = () => {
  const transactions = useTransactionStore((s) => s.transactions);

  const recentData = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted.slice(0, 5);
  }, [transactions]);

  const columns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => formatDate(date),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={typeColorMap[type]}>
          {TRANSACTION_TYPE_MAP[type as keyof typeof TRANSACTION_TYPE_MAP]?.label ?? type}
        </Tag>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record) => (
        <AmountText value={amount} type={record.type} />
      ),
    },
    {
      title: '账户',
      dataIndex: 'accountName',
      key: 'accountName',
    },
  ];

  return (
    <Card
      title="最近交易"
      extra={<Link to="/transaction">查看全部</Link>}
    >
      <Table
        columns={columns}
        dataSource={recentData}
        rowKey="id"
        pagination={false}
        size="small"
      />
    </Card>
  );
};

export default RecentTransactions;
