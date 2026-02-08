import React from 'react';
import { Card, Tag, Typography, Space, Popconfirm, Badge } from 'antd';
import { EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import type { Budget } from '@/types/budget';
import { BUDGET_PERIOD_MAP } from '@/utils/constants';
import { formatDate } from '@/utils/format';
import BudgetProgressBar from './BudgetProgressBar';

const { Text } = Typography;

interface BudgetCardProps {
  budget: Budget;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ budget, onEdit, onDelete }) => {
  const isAlert = budget.spent >= budget.alertThreshold * budget.amount;

  const cardContent = (
    <Card
      hoverable
      style={{ height: '100%' }}
      actions={[
        <span key="edit" onClick={() => onEdit(budget)}>
          <EditOutlined /> 编辑
        </span>,
        <Popconfirm
          key="delete"
          title="确认删除"
          description={`确定要删除预算「${budget.name}」吗？`}
          onConfirm={() => onDelete(budget.id)}
          okText="确定"
          cancelText="取消"
        >
          <span>
            <DeleteOutlined /> 删除
          </span>
        </Popconfirm>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong style={{ fontSize: 16 }}>
              {budget.name}
            </Text>
            <Tag color="blue">{BUDGET_PERIOD_MAP[budget.period]}</Tag>
          </div>
          {budget.categoryName && (
            <Tag color="processing">{budget.categoryName}</Tag>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#999', fontSize: 13 }}>
          <CalendarOutlined />
          <span>
            {formatDate(budget.startDate)} ~ {formatDate(budget.endDate)}
          </span>
        </div>

        <BudgetProgressBar
          spent={budget.spent}
          amount={budget.amount}
          alertThreshold={budget.alertThreshold}
        />
      </Space>
    </Card>
  );

  if (isAlert) {
    return (
      <Badge.Ribbon text="超预警" color="red">
        {cardContent}
      </Badge.Ribbon>
    );
  }

  return cardContent;
};

export default BudgetCard;
