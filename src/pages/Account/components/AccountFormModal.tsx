import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, ColorPicker } from 'antd';
import type { Account, AccountType } from '@/types/account';
import { accountTypeLabels } from '@/types/account';
import AmountInput from '@/components/AmountInput';

interface AccountFormModalProps {
  open: boolean;
  onClose: () => void;
  initialValues?: Account;
  onSubmit: (values: Partial<Account>) => void;
}

const accountTypeOptions: { label: string; value: AccountType }[] = (
  Object.entries(accountTypeLabels) as [AccountType, string][]
).map(([value, label]) => ({
  label,
  value,
}));

const presetColors = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#fa8c16',
  '#2f54eb',
  '#a0d911',
];

const AccountFormModal: React.FC<AccountFormModalProps> = ({
  open,
  onClose,
  initialValues,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!initialValues;

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          ...initialValues,
          color: initialValues.color || '#1890ff',
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const color =
        typeof values.color === 'string'
          ? values.color
          : values.color?.toHexString?.() ?? '#1890ff';
      onSubmit({ ...values, color });
      onClose();
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑账户' : '新增账户'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
      forceRender
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: 'cash' as AccountType,
          initialBalance: 0,
          color: '#1890ff',
          isDefault: false,
        }}
      >
        <Form.Item
          name="name"
          label="账户名称"
          rules={[{ required: true, message: '请输入账户名称' }]}
        >
          <Input placeholder="请输入账户名称" />
        </Form.Item>

        <Form.Item
          name="type"
          label="账户类型"
          rules={[{ required: true, message: '请选择账户类型' }]}
        >
          <Select options={accountTypeOptions} placeholder="请选择账户类型" />
        </Form.Item>

        <Form.Item
          name="initialBalance"
          label="初始余额"
          rules={[{ required: true, message: '请输入初始余额' }]}
        >
          <AmountInput />
        </Form.Item>

        <Form.Item name="description" label="备注">
          <Input.TextArea rows={3} placeholder="请输入备注信息" />
        </Form.Item>

        <Form.Item name="color" label="账户颜色">
          <ColorPicker presets={[{ label: '推荐颜色', colors: presetColors }]} />
        </Form.Item>

        <Form.Item name="isDefault" label="设为默认账户" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AccountFormModal;
