import React from 'react';
import { Card, Space, Typography, Tag, Popconfirm } from 'antd';
import { EditOutlined, SwapOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { Account } from '@/types/account';
import { accountTypeLabels } from '@/types/account';
import AmountText from '@/components/AmountText';
import { ACCOUNT_TYPE_ICONS } from '@/utils/constants';

const { Text } = Typography;

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onTransfer: (account: Account) => void;
  onDelete: (account: Account) => void;
}

const AccountCard: React.FC<AccountCardProps> = ({ account, onEdit, onTransfer, onDelete }) => {
  const navigate = useNavigate();

  const IconComponent = ACCOUNT_TYPE_ICONS[account.type];

  return (
    <Card
      hoverable
      style={{
        borderLeft: `4px solid ${account.color || '#1890ff'}`,
        height: '100%',
      }}
      actions={[
        <span key="edit" onClick={() => onEdit(account)}>
          <EditOutlined /> 编辑
        </span>,
        <span key="transfer" onClick={() => onTransfer(account)}>
          <SwapOutlined /> 转账
        </span>,
        <Popconfirm
          key="delete"
          title="确认删除"
          description="删除后不可恢复，确认删除该账户吗？"
          onConfirm={() => onDelete(account)}
          okText="确认"
          cancelText="取消"
        >
          <span>
            <DeleteOutlined /> 删除
          </span>
        </Popconfirm>,
        <span key="detail" onClick={() => navigate(`/account/${account.id}`)}>
          <EyeOutlined /> 详情
        </span>,
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space align="center">
          {IconComponent && (
            <span style={{ fontSize: 24, color: account.color || '#1890ff' }}>
              {React.isValidElement(IconComponent) ? IconComponent : <IconComponent />}
            </span>
          )}
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {account.name}
            </Text>
            <br />
            <Tag>{accountTypeLabels[account.type]}</Tag>
          </div>
        </Space>
        <div style={{ textAlign: 'right' }}>
          <AmountText value={account.balance} style={{ fontSize: 24, fontWeight: 600 }} />
        </div>
      </Space>
    </Card>
  );
};

export default AccountCard;
