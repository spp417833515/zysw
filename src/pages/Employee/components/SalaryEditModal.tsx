import React, { useState, useEffect } from 'react';
import { Modal, InputNumber, Typography, Space, message } from 'antd';
import { updateSalaryRecord } from '@/api/employee';
import { formatAmount } from '@/utils/format';
import type { SalaryRecord } from '@/types/employee';

const { Text } = Typography;

interface SalaryEditModalProps {
  open: boolean;
  record: SalaryRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SalaryEditModal: React.FC<SalaryEditModalProps> = ({ open, record, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [tax, setTax] = useState<number>(0);
  const [actualPaid, setActualPaid] = useState<number>(0);

  const baseSalary = record?.baseSalary ?? 0;
  const netSalary = baseSalary - tax;
  const difference = netSalary - actualPaid;

  useEffect(() => {
    if (record) {
      setTax(record.tax);
      setActualPaid(record.actualPaid ?? record.netSalary);
    }
  }, [record]);

  const handleTaxChange = (val: number | null) => {
    const t = val ?? 0;
    setTax(t);
    setActualPaid(Math.round((baseSalary - t) * 100) / 100);
  };

  const handleOk = async () => {
    if (!record) return;
    setLoading(true);
    try {
      const res = await updateSalaryRecord(record.id, { tax, actualPaid });
      if (res.code === 0) {
        message.success('发放记录已更新');
        onClose();
        onSuccess();
      } else {
        message.error(res.message || '更新失败');
      }
    } catch {
      message.error('更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="修改发放记录"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      confirmLoading={loading}
      destroyOnClose
      width={480}
    >
      {record && (
        <Space direction="vertical" size={12} style={{ width: '100%', marginTop: 8 }}>
          <div style={{ marginBottom: 4, color: '#666' }}>
            {record.employeeName} - {record.year}年{record.month}月
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
            <Text>基本工资</Text>
            <Text strong style={{ fontSize: 16 }}>¥{formatAmount(baseSalary)}</Text>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
            <Text>个人所得税</Text>
            <InputNumber
              value={tax}
              onChange={handleTaxChange}
              min={0}
              step={0.01}
              precision={2}
              prefix="¥"
              style={{ width: 160 }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
            <Text>应发(税后)</Text>
            <Text strong style={{ fontSize: 16, color: '#52c41a' }}>¥{formatAmount(netSalary)}</Text>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#e6f7ff', borderRadius: 6, border: '1px solid #91d5ff' }}>
            <Text>实际发放</Text>
            <InputNumber
              value={actualPaid}
              onChange={(val) => setActualPaid(val ?? 0)}
              min={0}
              step={0.01}
              precision={2}
              prefix="¥"
              style={{ width: 160 }}
            />
          </div>

          {difference !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: difference > 0 ? '#fff1f0' : '#fffbe6', borderRadius: 6, border: `1px solid ${difference > 0 ? '#ffa39e' : '#ffe58f'}` }}>
              <Text>差额</Text>
              <Text strong style={{ fontSize: 14, color: difference > 0 ? '#f5222d' : '#faad14' }}>
                {difference > 0 ? `少发 ¥${formatAmount(difference)}（欠员工）` : `多发 ¥${formatAmount(Math.abs(difference))}（员工欠）`}
              </Text>
            </div>
          )}
        </Space>
      )}
    </Modal>
  );
};

export default SalaryEditModal;
