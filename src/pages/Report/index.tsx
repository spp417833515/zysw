import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import {
  LineChartOutlined,
  FundOutlined,
  PieChartOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/PageContainer';
import { brandColor } from '@/theme/tokens/colors';

const { Text, Title } = Typography;

interface ReportCardItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  description: string;
}

const reportCards: ReportCardItem[] = [
  {
    title: '利润表',
    path: '/report/profit-loss',
    icon: <LineChartOutlined style={{ fontSize: 36, color: brandColor }} />,
    description: '查看企业收入、成本和利润情况',
  },
  {
    title: '现金流量表',
    path: '/report/cash-flow',
    icon: <FundOutlined style={{ fontSize: 36, color: brandColor }} />,
    description: '分析企业现金流入流出',
  },
  {
    title: '分类汇总',
    path: '/report/category',
    icon: <PieChartOutlined style={{ fontSize: 36, color: brandColor }} />,
    description: '按分类查看收支明细',
  },
  {
    title: '趋势分析',
    path: '/report/trend',
    icon: <RiseOutlined style={{ fontSize: 36, color: brandColor }} />,
    description: '查看收支变化趋势',
  },
];

const ReportIndex: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer title="报表中心">
      <Row gutter={[24, 24]}>
        {reportCards.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.path}>
            <Card
              hoverable
              onClick={() => navigate(item.path)}
              style={{ textAlign: 'center', height: '100%' }}
              bodyStyle={{ padding: 32 }}
            >
              <div style={{ marginBottom: 16 }}>{item.icon}</div>
              <Title level={5} style={{ marginBottom: 8 }}>
                {item.title}
              </Title>
              <Text type="secondary">{item.description}</Text>
            </Card>
          </Col>
        ))}
      </Row>
    </PageContainer>
  );
};

export default ReportIndex;
