import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import {
  PlusCircleOutlined,
  MinusCircleOutlined,
  SwapOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useThemeToken } from '@/hooks/useThemeToken';

const { Text } = Typography;

interface QuickActionItem {
  title: string;
  icon: React.ReactNode;
  colorKey: 'income' | 'expense' | 'transfer' | 'primary';
  path: string;
}

const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { colors } = useThemeToken();

  const actions: QuickActionItem[] = [
    {
      title: '记一笔收入',
      icon: <PlusCircleOutlined style={{ fontSize: 28 }} />,
      colorKey: 'income',
      path: '/transaction/add?type=income',
    },
    {
      title: '记一笔支出',
      icon: <MinusCircleOutlined style={{ fontSize: 28 }} />,
      colorKey: 'expense',
      path: '/transaction/add?type=expense',
    },
    {
      title: '转账',
      icon: <SwapOutlined style={{ fontSize: 28 }} />,
      colorKey: 'transfer',
      path: '/transaction/add?type=transfer',
    },
    {
      title: '查看报表',
      icon: <BarChartOutlined style={{ fontSize: 28 }} />,
      colorKey: 'primary',
      path: '/report',
    },
  ];

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
              <span style={{ color: colors[action.colorKey] }}>{action.icon}</span>
              <Text style={{ fontSize: 13 }}>{action.title}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default QuickActions;
