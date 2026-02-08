import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTransactionStore } from '@/store/useTransactionStore';
import PageContainer from '@/components/PageContainer';
import ExportButton from '@/components/ExportButton';
import TransactionFilter from './components/TransactionFilter';
import TransactionTable from './components/TransactionTable';
import TransactionDetailModal from './components/TransactionDetailModal';

const TransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchTransactions } = useTransactionStore();
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Support redirect from /transaction/:id → open modal automatically
  useEffect(() => {
    const state = location.state as { openDetailId?: string } | null;
    if (state?.openDetailId) {
      setDetailId(state.openDetailId);
      // Clear the state so refreshing doesn't re-open
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const handleCreate = () => {
    navigate('/transaction/create');
  };

  return (
    <PageContainer
      title="收支流水"
      extra={[
        <ExportButton key="export" />,
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          新增交易
        </Button>,
      ]}
    >
      <TransactionFilter />
      <TransactionTable onViewDetail={(id) => setDetailId(id)} />
      <TransactionDetailModal
        open={!!detailId}
        transactionId={detailId}
        onClose={() => setDetailId(null)}
      />
    </PageContainer>
  );
};

export default TransactionPage;
