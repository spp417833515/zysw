import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Row, Col, Card, Statistic, Button, message } from 'antd';
import { PlusOutlined, WalletOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import EmptyState from '@/components/EmptyState';
import { useAccountStore } from '@/store/useAccountStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { formatAmount } from '@/utils/format';
import type { Account } from '@/types/account';
import AccountCard from './components/AccountCard';
import AccountFormModal from './components/AccountFormModal';
import AccountTransferModal from './components/AccountTransferModal';

const AccountPage: React.FC = () => {
  const { accounts, loading, fetchAccounts, addAccount, updateAccount, deleteAccount } =
    useAccountStore();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(undefined);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const { totalAssets, totalLiabilities, netAssets } = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    accounts.forEach((account) => {
      if (account.balance >= 0) {
        assets += account.balance;
      } else {
        liabilities += account.balance;
      }
    });
    return {
      totalAssets: assets,
      totalLiabilities: liabilities,
      netAssets: assets + liabilities,
    };
  }, [accounts]);

  const handleAdd = useCallback(() => {
    setEditingAccount(undefined);
    setFormModalOpen(true);
  }, []);

  const handleEdit = useCallback((account: Account) => {
    setEditingAccount(account);
    setFormModalOpen(true);
  }, []);

  const handleTransfer = useCallback((_account: Account) => {
    setTransferModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (account: Account) => {
      try {
        await deleteAccount(account.id);
        message.success('账户删除成功');
      } catch (e: any) {
        message.error(e?.message || '账户删除失败');
      }
    },
    [deleteAccount],
  );

  const handleFormSubmit = useCallback(
    async (values: Partial<Account>) => {
      try {
        if (editingAccount) {
          await updateAccount(editingAccount.id, values);
          message.success('账户更新成功');
        } else {
          await addAccount(values as Omit<Account, 'id'>);
          message.success('账户创建成功');
        }
        setFormModalOpen(false);
      } catch {
        message.error(editingAccount ? '账户更新失败' : '账户创建失败');
      }
    },
    [editingAccount, updateAccount, addAccount],
  );

  const handleTransferSubmit = useCallback(
    async (values: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      description?: string;
      date: any;
    }) => {
      try {
        await useTransactionStore.getState().addTransaction({
          type: 'transfer',
          amount: values.amount,
          date: typeof values.date === 'string' ? values.date : values.date.format('YYYY-MM-DD'),
          accountId: values.fromAccountId,
          toAccountId: values.toAccountId,
          description: values.description || '',
          categoryId: '',
        } as any);
        await fetchAccounts();
        message.success('转账成功');
        setTransferModalOpen(false);
      } catch {
        message.error('转账失败');
      }
    },
    [fetchAccounts],
  );

  return (
    <PageContainer
      title="账户管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增账户
        </Button>
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总资产"
              value={formatAmount(totalAssets)}
              valueStyle={{ color: '#52c41a' }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总负债"
              value={formatAmount(Math.abs(totalLiabilities))}
              valueStyle={{ color: '#f5222d' }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="净资产"
              value={formatAmount(netAssets)}
              valueStyle={{ color: netAssets >= 0 ? '#52c41a' : '#f5222d' }}
              prefix={<WalletOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {accounts.length === 0 && !loading ? (
        <EmptyState />
      ) : (
        <Row gutter={[16, 16]}>
          {accounts.map((account) => (
            <Col key={account.id} xs={24} sm={12} md={8} lg={6}>
              <AccountCard
                account={account}
                onEdit={handleEdit}
                onTransfer={handleTransfer}
                onDelete={handleDelete}
              />
            </Col>
          ))}
        </Row>
      )}

      <AccountFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        initialValues={editingAccount}
        onSubmit={handleFormSubmit}
      />

      <AccountTransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        onSubmit={handleTransferSubmit}
      />
    </PageContainer>
  );
};

export default AccountPage;
