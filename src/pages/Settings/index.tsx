import React from 'react';
import PageContainer from '@/components/PageContainer';
import CompanyInfoForm from './components/CompanyInfoForm';
import ThemeSetting from './components/ThemeSetting';
import BackupRestore from './components/BackupRestore';

const Settings: React.FC = () => {
  return (
    <PageContainer title="系统设置">
      <CompanyInfoForm />
      <ThemeSetting />
      <BackupRestore />
    </PageContainer>
  );
};

export default Settings;
