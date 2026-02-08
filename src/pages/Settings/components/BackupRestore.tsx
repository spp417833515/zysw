import React from 'react';
import { Card, Button, Space, Typography, Upload, message, Divider } from 'antd';
import { CloudDownloadOutlined, CloudUploadOutlined, WarningOutlined } from '@ant-design/icons';

const BackupRestore: React.FC = () => {
  const handleBackup = () => {
    message.success('数据备份功能将在后续版本实现');
  };

  const handleRestore = () => {
    message.info('数据恢复功能将在后续版本实现');
  };

  return (
    <Card title="数据备份与恢复" style={{ marginBottom: 24 }}>
      <Typography.Paragraph type="secondary">
        定期备份数据可以防止意外数据丢失。建议每周至少备份一次。
      </Typography.Paragraph>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Typography.Text strong>数据备份</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            将当前所有数据导出为备份文件
          </Typography.Paragraph>
          <Button type="primary" icon={<CloudDownloadOutlined />} onClick={handleBackup}>
            立即备份
          </Button>
        </div>
        <Divider />
        <div>
          <Typography.Text strong>数据恢复</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            从备份文件恢复数据（将覆盖当前数据）
          </Typography.Paragraph>
          <Space>
            <Upload
              accept=".json"
              showUploadList={false}
              beforeUpload={() => {
                handleRestore();
                return false;
              }}
            >
              <Button icon={<CloudUploadOutlined />}>选择备份文件</Button>
            </Upload>
          </Space>
          <div style={{ marginTop: 8 }}>
            <Typography.Text type="warning">
              <WarningOutlined /> 恢复数据将覆盖当前所有数据，请谨慎操作
            </Typography.Text>
          </div>
        </div>
      </Space>
    </Card>
  );
};

export default BackupRestore;
