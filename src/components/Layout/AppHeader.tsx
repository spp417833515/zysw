import React from 'react';
import { Layout, Space, Button, Dropdown, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
  BellOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import type { MenuProps } from 'antd';

const { Header } = Layout;

const AppHeader: React.FC = () => {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const { token } = theme.useToken();

  const themeItems: MenuProps['items'] = [
    {
      key: 'light',
      icon: <SunOutlined />,
      label: '浅色模式',
      onClick: () => setThemeMode('light'),
    },
    {
      key: 'dark',
      icon: <MoonOutlined />,
      label: '深色模式',
      onClick: () => setThemeMode('dark'),
    },
    {
      key: 'system',
      icon: <DesktopOutlined />,
      label: '跟随系统',
      onClick: () => setThemeMode('system'),
    },
  ];

  const themeIcon = themeMode === 'dark' ? <MoonOutlined /> : <SunOutlined />;

  return (
    <Header
      style={{
        padding: '0 24px',
        background: token.colorBgContainer,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        position: 'sticky',
        top: 0,
        zIndex: 99,
      }}
    >
      <Button
        type="text"
        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        onClick={toggleSidebar}
        style={{ fontSize: 16 }}
      />
      <Space size="middle">
        <Dropdown menu={{ items: themeItems, selectedKeys: [themeMode] }} placement="bottomRight">
          <Button type="text" icon={themeIcon} />
        </Dropdown>
        <Button type="text" icon={<BellOutlined />} />
        <Button type="text" icon={<UserOutlined />} />
      </Space>
    </Header>
  );
};

export default AppHeader;
