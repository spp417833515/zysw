import React, { useState } from 'react';
import { Modal, Steps, Upload, Button, Table, Select, message, Alert, Space, Result } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { parseExcelFile, generateTemplate } from '@/utils/export';
import { batchCreateTransactions } from '@/api/transaction';
import { useAccountStore } from '@/store/useAccountStore';
import { useCategoryStore } from '@/store/useCategoryStore';
import type { ExportColumn } from '@/utils/export';
import type { Transaction } from '@/types/transaction';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATE_COLUMNS: ExportColumn[] = [
  { title: '类型(income/expense)', dataIndex: 'type' },
  { title: '金额', dataIndex: 'amount' },
  { title: '日期(YYYY-MM-DD)', dataIndex: 'date' },
  { title: '分类名称', dataIndex: 'categoryName' },
  { title: '账户名称', dataIndex: 'accountName' },
  { title: '备注', dataIndex: 'description' },
];

const FIELD_MAP: Record<string, string> = {
  '类型(income/expense)': 'type',
  '金额': 'amount',
  '日期(YYYY-MM-DD)': 'date',
  '分类名称': 'categoryName',
  '账户名称': 'accountName',
  '备注': 'description',
};

const ImportModal: React.FC<ImportModalProps> = ({ open, onClose, onSuccess }) => {
  const [step, setStep] = useState(0);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ created: number; errors: { index: number; error: string }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);

  const reset = () => {
    setStep(0);
    setRawData([]);
    setMapping({});
    setResult(null);
  };

  const handleFile = async (file: File) => {
    try {
      const data = await parseExcelFile(file);
      if (!data.length) { message.error('文件为空'); return false; }
      setRawData(data);
      // Auto-map columns
      const headers = Object.keys(data[0]);
      const autoMap: Record<string, string> = {};
      for (const h of headers) {
        if (FIELD_MAP[h]) autoMap[h] = FIELD_MAP[h];
      }
      setMapping(autoMap);
      setStep(1);
    } catch {
      message.error('文件解析失败');
    }
    return false;
  };

  const rawHeaders = rawData.length ? Object.keys(rawData[0]) : [];
  const targetFields = [
    { label: '类型', value: 'type' },
    { label: '金额', value: 'amount' },
    { label: '日期', value: 'date' },
    { label: '分类名称', value: 'categoryName' },
    { label: '账户名称', value: 'accountName' },
    { label: '备注', value: 'description' },
  ];

  const buildTransactions = () => {
    const findAccount = (name: string) => accounts.find((a) => a.name === name)?.id || '';
    const findCategory = (name: string) => categories.find((c) => c.name === name)?.id || '';

    return rawData.map((row) => {
      const mapped: Record<string, string> = {};
      for (const [header, field] of Object.entries(mapping)) {
        mapped[field] = row[header] || '';
      }
      return {
        type: (mapped.type || 'expense') as Transaction['type'],
        amount: parseFloat(mapped.amount) || 0,
        date: mapped.date || new Date().toISOString().slice(0, 10),
        categoryId: findCategory(mapped.categoryName || ''),
        accountId: findAccount(mapped.accountName || ''),
        description: mapped.description || '',
      };
    }).filter((t) => t.amount > 0);
  };

  const previewData = step >= 2 ? buildTransactions() : [];

  const handleImport = async () => {
    setLoading(true);
    try {
      const res = await batchCreateTransactions(previewData);
      setResult(res.data ?? null);
      setStep(3);
      onSuccess();
    } catch {
      message.error('导入失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="导入交易数据"
      open={open}
      onCancel={() => { reset(); onClose(); }}
      width={720}
      footer={null}
      destroyOnClose
      afterClose={reset}
    >
      <Steps current={step} size="small" style={{ marginBottom: 24 }}
        items={[
          { title: '上传文件' },
          { title: '字段映射' },
          { title: '预览确认' },
          { title: '导入结果' },
        ]}
      />

      {step === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Space direction="vertical" size="large">
            <Upload accept=".xlsx,.xls,.csv" showUploadList={false} beforeUpload={handleFile}>
              <Button icon={<UploadOutlined />} type="primary" size="large">选择文件</Button>
            </Upload>
            <Button icon={<DownloadOutlined />} onClick={() => generateTemplate(TEMPLATE_COLUMNS, '交易导入模板')}>
              下载导入模板
            </Button>
          </Space>
        </div>
      )}

      {step === 1 && (
        <div>
          <Alert message="请将文件列映射到系统字段" type="info" showIcon style={{ marginBottom: 16 }} />
          {rawHeaders.map((h) => (
            <div key={h} style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 12 }}>
              <span style={{ width: 160 }}>{h}</span>
              <Select
                style={{ width: 200 }}
                placeholder="选择映射字段"
                allowClear
                value={mapping[h]}
                onChange={(v) => setMapping((m) => ({ ...m, [h]: v }))}
                options={targetFields}
              />
            </div>
          ))}
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setStep(0)}>上一步</Button>
              <Button type="primary" onClick={() => setStep(2)}
                disabled={!mapping || !Object.values(mapping).includes('amount')}>
                下一步
              </Button>
            </Space>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <Alert message={`共 ${previewData.length} 条有效数据`} type="info" showIcon style={{ marginBottom: 16 }} />
          <Table
            rowKey={(_, i) => String(i)}
            dataSource={previewData.slice(0, 10)}
            size="small"
            pagination={false}
            columns={[
              { title: '类型', dataIndex: 'type' },
              { title: '金额', dataIndex: 'amount' },
              { title: '日期', dataIndex: 'date' },
              { title: '描述', dataIndex: 'description' },
            ]}
          />
          {previewData.length > 10 && <div style={{ color: '#999', marginTop: 8 }}>仅显示前10条...</div>}
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button onClick={() => setStep(1)}>上一步</Button>
              <Button type="primary" loading={loading} onClick={handleImport}>确认导入</Button>
            </Space>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <Result
          status={result.errors.length ? 'warning' : 'success'}
          title={`成功导入 ${result.created} 条`}
          subTitle={result.errors.length ? `${result.errors.length} 条失败` : undefined}
          extra={<Button type="primary" onClick={() => { reset(); onClose(); }}>完成</Button>}
        />
      )}
    </Modal>
  );
};

export default ImportModal;
