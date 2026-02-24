import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { PlusOutlined, ImportOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTransactionStore } from '@/store/useTransactionStore';
import PageContainer from '@/components/PageContainer';
import ExportButton from '@/components/ExportButton';
import TransactionFilter from './components/TransactionFilter';
import TransactionTable from './components/TransactionTable';
import TransactionDetailModal from './components/TransactionDetailModal';
import ImportModal from './components/ImportModal';

const EXPORT_COLUMNS = [
  { title: '日期', dataIndex: 'date' },
  { title: '类型', dataIndex: 'type' },
  { title: '金额', dataIndex: 'amount' },
  { title: '分类', dataIndex: 'categoryName' },
  { title: '账户', dataIndex: 'accountName' },
  { title: '客户/供应商', dataIndex: 'contactName' },
  { title: '备注', dataIndex: 'description' },
];

const TransactionPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchTransactions, transactions } = useTransactionStore();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const state = location.state as { openDetailId?: string } | null;
    if (state?.openDetailId) {
      setDetailId(state.openDetailId);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  return (
    <PageContainer
      title="收支流水"
      extra={[
        <Button key="import" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
          导入
        </Button>,
        <ExportButton
          key="export"
          data={transactions as any}
          columns={EXPORT_COLUMNS}
          fileName="收支流水"
        />,
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/transaction/create')}
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
      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => fetchTransactions()}
      />
    </PageContainer>
  );
};

export default TransactionPage;
