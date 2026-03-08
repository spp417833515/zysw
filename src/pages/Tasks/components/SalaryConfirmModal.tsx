import React, { useState } from 'react';
import { Modal, Form, message } from 'antd';
import AccountSelect from '@/components/AccountSelect';
import { confirmSalary } from '@/api/employee';
import { formatAmount } from '@/utils/format';
import type { UnpaidSalaryItem } from '@/types/employee';

interface SalaryConfirmModalProps {
  open: boolean;
  item: UnpaidSalaryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SalaryConfirmModal: React.FC<SalaryConfirmModalProps> = ({
  open,
  item,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    if (!item) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setLoading(true);
    try {
      const res = await confirmSalary({
        employeeId: item.employeeId,
        year: item.year,
        month: item.month,
        accountId: values.accountId,
      });
      if (res.code === 0) {
        message.success('工资发放确认成功，支出流水已生成');
        form.resetFields();
        onClose();
        onSuccess();
      } else {
        message.error(res.message || '操作失败');
      }
    } catch {
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="确认工资发放"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="确认发放"
      okButtonProps={{ danger: true }}
      confirmLoading={loading}
      destroyOnClose
    >
      {item && (
        <div style={{ marginBottom: 16 }}>
          <p>{item.employeeName} - {item.year}年{item.month}月</p>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#f5222d' }}>
            应发工资：¥{formatAmount(item.baseSalary)}
          </p>
          <p style={{ color: '#999' }}>确认后将自动生成一笔支出流水</p>
        </div>
      )}
      <Form form={form} layout="vertical">
        <Form.Item name="accountId" label="发放账户">
          <AccountSelect placeholder="请选择发放账户（可选）" style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SalaryConfirmModal;
