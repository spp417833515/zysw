import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Table, Button, Space, Popconfirm, Typography, Tag, message } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import PageContainer from '@/components/PageContainer';
import AmountText from '@/components/AmountText';
import { useAccountStore } from '@/store/useAccountStore';
import { accountTypeLabels } from '@/types/account';
import { mockTransactions } from '@/mock/data';
import AccountFormModal from './components/AccountFormModal';
import type { Account } from '@/types/account';

const { Text } = Typography;

interface Transaction {
  id: string;
  date: string;
  type: string;
  categoryName?: string;
  description?: string;
  amount: number;
  accountId?: string;
}

const AccountDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accounts, deleteAccount, updateAccount } = useAccountStore();

  const [editModalOpen, setEditModalOpen] = React.useState(false);

  const account = useMemo(
    () => accounts.find((a) => a.id === id),
    [accounts, id],
  );

  const transactions = useMemo(() => {
    if (!id) return [];
    return (mockTransactions as Transaction[]).filter(
      (t) => t.accountId === id,
    );
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteAccount(id);
      message.success('账户已删除');
      navigate('/account');
    } catch {
      message.error('删除失败');
    }
  };

  const handleEditSubmit = async (values: Partial<Account>) => {
    if (!id) return;
    try {
      await updateAccount(id, values);
      message.success('账户更新成功');
      setEditModalOpen(false);
    } catch {
      message.error('更新失败');
    }
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => {
        const labelMap: Record<string, { text: string; color: string }> = {
          income: { text: '收入', color: 'green' },
          expense: { text: '支出', color: 'red' },
          transfer: { text: '转账', color: 'blue' },
        };
        const item = labelMap[type] || { text: type, color: 'default' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 120,
      render: (text: string) => text || '-',
    },
    {
      title: '备注',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      align: 'right',
      render: (amount: number) => <AmountText value={amount} />,
    },
  ];

  if (!account) {
    return (
      <PageContainer title="账户详情">
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">账户不存在或已被删除</Text>
            <br />
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/account')}
              style={{ marginTop: 16 }}
            >
              返回账户列表
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="账户详情"
      extra={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/account')}>
            返回
          </Button>
          <Button type="primary" icon={<EditOutlined />} onClick={() => setEditModalOpen(true)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，确认删除该账户？"
            onConfirm={handleDelete}
            okText="确认"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <Card style={{ marginBottom: 24 }}>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          bordered
          size="middle"
        >
          <Descriptions.Item label="账户名称">
            <Text strong>{account.name}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="账户类型">
            <Tag>{accountTypeLabels[account.type]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="当前余额">
            <AmountText value={account.balance} style={{ fontSize: 18, fontWeight: 600 }} />
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>
            {account.description || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {account.createdAt || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="最近交易记录">
        <Table<Transaction>
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: '暂无交易记录' }}
        />
      </Card>

      <AccountFormModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        initialValues={account}
        onSubmit={handleEditSubmit}
      />
    </PageContainer>
  );
};

export default AccountDetail;
