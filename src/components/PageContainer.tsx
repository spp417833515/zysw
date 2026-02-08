import React from 'react';
import { Typography, Space } from 'antd';
import { useLocation } from 'react-router-dom';
import { routeMetas } from '@/router/routeMeta';

interface PageContainerProps {
  title?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({ title, extra, children }) => {
  const location = useLocation();
  const meta = routeMetas[location.pathname];
  const displayTitle = title || meta?.title || '';

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {displayTitle}
        </Typography.Title>
        {extra && <Space>{extra}</Space>}
      </div>
      {children}
    </div>
  );
};

export default PageContainer;
