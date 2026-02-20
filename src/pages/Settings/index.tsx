import React from 'react';
import { Tabs } from 'antd';
import { SettingOutlined, DollarOutlined, BgColorsOutlined, DatabaseOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import CompanyInfoForm from './components/CompanyInfoForm';
import TaxSettingsForm from './components/TaxSettingsForm';
import ThemeSetting from './components/ThemeSetting';
import BackupRestore from './components/BackupRestore';

const Settings: React.FC = () => {
  const items = [
    {
      key: 'company',
      label: (
        <span>
          <SettingOutlined />
          企业信息
        </span>
      ),
      children: <CompanyInfoForm />,
    },
    {
      key: 'tax',
      label: (
        <span>
          <DollarOutlined />
          税率设置
        </span>
      ),
      children: <TaxSettingsForm />,
    },
    {
      key: 'theme',
      label: (
        <span>
          <BgColorsOutlined />
          主题设置
        </span>
      ),
      children: <ThemeSetting />,
    },
    {
      key: 'backup',
      label: (
        <span>
          <DatabaseOutlined />
          备份恢复
        </span>
      ),
      children: <BackupRestore />,
    },
  ];

  return (
    <PageContainer title="系统设置">
      <Tabs items={items} defaultActiveKey="company" />
    </PageContainer>
  );
};

export default Settings;
