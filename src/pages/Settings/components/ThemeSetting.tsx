import React from 'react';
import { Card, Radio, Space, Typography } from 'antd';
import { SunOutlined, MoonOutlined, DesktopOutlined } from '@ant-design/icons';
import { useAppStore } from '@/store/useAppStore';
import type { ThemeMode } from '@/theme/useThemeMode';

const ThemeSetting: React.FC = () => {
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  return (
    <Card title="主题设置" style={{ marginBottom: 24 }}>
      <Typography.Paragraph type="secondary">
        选择界面显示主题，支持浅色、深色和跟随系统设置。
      </Typography.Paragraph>
      <Radio.Group
        value={themeMode}
        onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
        optionType="button"
        buttonStyle="solid"
        size="large"
      >
        <Radio.Button value="light">
          <Space><SunOutlined />浅色模式</Space>
        </Radio.Button>
        <Radio.Button value="dark">
          <Space><MoonOutlined />深色模式</Space>
        </Radio.Button>
        <Radio.Button value="system">
          <Space><DesktopOutlined />跟随系统</Space>
        </Radio.Button>
      </Radio.Group>
    </Card>
  );
};

export default ThemeSetting;
