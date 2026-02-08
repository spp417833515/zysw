import React from 'react';
import { Breadcrumb } from 'antd';
import { useLocation, Link } from 'react-router-dom';
import { routeMetas } from '@/router/routeMeta';

const AppBreadcrumb: React.FC = () => {
  const location = useLocation();
  const pathSnippets = location.pathname.split('/').filter((i) => i);

  const items = [
    {
      title: <Link to="/">首页</Link>,
    },
    ...pathSnippets.map((_, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
      const meta = routeMetas[url];
      const isLast = index === pathSnippets.length - 1;
      return {
        title: isLast ? (
          meta?.title || pathSnippets[index]
        ) : (
          <Link to={url}>{meta?.title || pathSnippets[index]}</Link>
        ),
      };
    }),
  ];

  if (pathSnippets.length === 0) return null;

  return <Breadcrumb items={items} style={{ marginBottom: 16 }} />;
};

export default AppBreadcrumb;
