import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Divider,
  message,
  Popconfirm,
  Space,
  Table,
  Typography,
  Upload,
} from 'antd';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  HistoryOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  backupDownloadUrl,
  createBackup,
  getBackups,
  restoreBackup,
  restoreFromFile,
  type BackupItem,
} from '@/api/backup';
import { ensureOk } from '@/api/request';

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

const BackupRestore: React.FC = () => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  const loadBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBackups();
      ensureOk(res, '获取备份列表失败');
      setBackups(res.data);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  const handleBackup = async () => {
    setWorking(true);
    try {
      const res = await createBackup();
      ensureOk(res, '备份失败');
      message.success(`备份成功：${res.data.name}`);
      loadBackups();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setWorking(false);
    }
  };

  const afterRestore = () => {
    message.success('恢复成功，页面即将刷新');
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleRestore = async (name: string) => {
    setWorking(true);
    try {
      const res = await restoreBackup(name);
      ensureOk(res, '恢复失败');
      afterRestore();
    } catch (e) {
      message.error((e as Error).message);
      setWorking(false);
    }
  };

  const handleRestoreFromFile = async (file: File) => {
    setWorking(true);
    try {
      const res = await restoreFromFile(file);
      ensureOk(res, '恢复失败');
      afterRestore();
    } catch (e) {
      message.error((e as Error).message);
      setWorking(false);
    }
  };

  return (
    <Card bordered={false}>
      <Typography.Paragraph type="secondary">
        系统每天自动备份一次（数据库 + 全部附件打包为 zip，保留最近 30 份）。也可以随时手动备份，
        或下载备份文件保存到其他位置。
      </Typography.Paragraph>

      <Space wrap>
        <Button
          type="primary"
          icon={<CloudDownloadOutlined />}
          onClick={handleBackup}
          loading={working}
        >
          立即备份
        </Button>
        <Upload
          accept=".zip"
          showUploadList={false}
          beforeUpload={(file) => {
            handleRestoreFromFile(file);
            return false;
          }}
        >
          <Button icon={<CloudUploadOutlined />} disabled={working}>
            从备份文件恢复
          </Button>
        </Upload>
      </Space>
      <div style={{ marginTop: 8 }}>
        <Typography.Text type="warning">
          <WarningOutlined /> 恢复会覆盖当前所有数据（恢复前系统会先自动做一次安全备份）
        </Typography.Text>
      </div>

      <Divider />

      <Typography.Text strong>
        <HistoryOutlined /> 备份记录
      </Typography.Text>
      <Table<BackupItem>
        style={{ marginTop: 12 }}
        rowKey="name"
        size="small"
        loading={loading}
        dataSource={backups}
        pagination={{ pageSize: 8, hideOnSinglePage: true }}
        columns={[
          {
            title: '备份时间',
            dataIndex: 'createdAt',
            render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
          },
          { title: '文件名', dataIndex: 'name' },
          {
            title: '大小',
            dataIndex: 'size',
            width: 100,
            render: (v: number) => formatSize(v),
          },
          {
            title: '操作',
            width: 160,
            render: (_, record) => (
              <Space>
                <Button
                  type="link"
                  size="small"
                  icon={<DownloadOutlined />}
                  href={backupDownloadUrl(record.name)}
                >
                  下载
                </Button>
                <Popconfirm
                  title="恢复此备份？"
                  description="当前数据将被覆盖（会先自动做一次安全备份）"
                  okText="恢复"
                  cancelText="取消"
                  onConfirm={() => handleRestore(record.name)}
                >
                  <Button type="link" size="small" danger disabled={working}>
                    恢复
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
};

export default BackupRestore;
