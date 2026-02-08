import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import {
  PlusCircleOutlined,
  MinusCircleOutlined,
  SwapOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { semanticColors } from '@/theme/tokens/colors';

const { Text } = Typography;

interface QuickActionItem {
  title: string;
  icon: React.ReactNode;
  color: string;
  path: string;
}

const actions: QuickActionItem[] = [
  {
    title: '记一笔收入',
    icon: <PlusCircleOutlined style={{ fontSize: 28 }} />,
    color: semanticColors.income,
    path: '/transaction/add?type=income',
  },
  {
    title: '记一笔支出',
    icon: <MinusCircleOutlined style={{ fontSize: 28 }} />,
    color: semanticColors.expense,
    path: '/transaction/add?type=expense',
  },
  {
    title: '转账',
    icon: <SwapOutlined style={{ fontSize: 28 }} />,
    color: semanticColors.transfer,
    path: '/transaction/add?type=transfer',
  },
  {
    title: '查看报表',
    icon: <BarChartOutlined style={{ fontSize: 28 }} />,
    color: '#1890FF',
    path: '/report',
  },
];

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <Row gutter={[12, 12]}>
        {actions.map((action) => (
          <Col xs={12} sm={6} key={action.title}>
            <Card
              hoverable
              onClick={() => navigate(action.path)}
              style={{ textAlign: 'center' }}
              styles={{
                body: {
                  padding: '16px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                },
              }}
            >
              <span style={{ color: action.color }}>{action.icon}</span>
              <Text style={{ fontSize: 13 }}>{action.title}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default QuickActions;
