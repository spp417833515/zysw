import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Row, Col, Card, Statistic, Button, Spin, message } from 'antd';
import {
  PlusOutlined,
  FundOutlined,
  PayCircleOutlined,
  AccountBookOutlined,
} from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import EmptyState from '@/components/EmptyState';
import { useBudgetStore } from '@/store/useBudgetStore';
import { useCategoryStore } from '@/store/useCategoryStore';
import { formatAmount } from '@/utils/format';
import type { Budget } from '@/types/budget';
import BudgetCard from './components/BudgetCard';
import BudgetFormModal from './components/BudgetFormModal';

const BudgetPage: React.FC = () => {
  const { budgets, loading, fetchBudgets, addBudget, updateBudget, deleteBudget } =
    useBudgetStore();
  const { fetchCategories } = useCategoryStore();

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, [fetchBudgets, fetchCategories]);

  const { totalBudget, totalSpent, totalRemaining } = useMemo(() => {
    let budget = 0;
    let spent = 0;
    budgets.forEach((b) => {
      budget += b.amount;
      spent += b.spent;
    });
    return {
      totalBudget: budget,
      totalSpent: spent,
      totalRemaining: budget - spent,
    };
  }, [budgets]);

  const handleAdd = useCallback(() => {
    setEditingBudget(undefined);
    setFormModalOpen(true);
  }, []);

  const handleEdit = useCallback((budget: Budget) => {
    setEditingBudget(budget);
    setFormModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteBudget(id);
      message.success('预算已删除');
    },
    [deleteBudget],
  );

  const handleFormSubmit = useCallback(
    (values: Partial<Budget>) => {
      try {
        if (editingBudget) {
          updateBudget(editingBudget.id, values);
          message.success('预算更新成功');
        } else {
          addBudget(values as Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>);
          message.success('预算创建成功');
        }
        setFormModalOpen(false);
      } catch {
        message.error(editingBudget ? '预算更新失败' : '预算创建失败');
      }
    },
    [editingBudget, updateBudget, addBudget],
  );

  return (
    <PageContainer
      title="预算管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增预算
        </Button>
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总预算额"
              value={formatAmount(totalBudget)}
              prefix={<FundOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已使用"
              value={formatAmount(totalSpent)}
              prefix={<PayCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="剩余"
              value={formatAmount(totalRemaining)}
              prefix={<AccountBookOutlined />}
              valueStyle={{ color: totalRemaining >= 0 ? '#52c41a' : '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Spin spinning={loading}>
        {budgets.length === 0 && !loading ? (
          <EmptyState
            description="暂无预算数据"
            actionText="新增预算"
            onAction={handleAdd}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {budgets.map((budget) => (
              <Col key={budget.id} xs={24} sm={12} lg={8}>
                <BudgetCard
                  budget={budget}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <BudgetFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        initialValues={editingBudget}
        onSubmit={handleFormSubmit}
      />
    </PageContainer>
  );
};

export default BudgetPage;
