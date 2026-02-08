import React, { useEffect, useMemo } from 'react';
import { Modal, Form, DatePicker, Input, Typography } from 'antd';
import AccountSelect from '@/components/AccountSelect';
import AmountInput from '@/components/AmountInput';
import { useAccountStore } from '@/store/useAccountStore';
import { formatAmount } from '@/utils/format';

const { Text } = Typography;

interface TransferFormValues {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  date: any;
}

interface AccountTransferModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TransferFormValues) => void;
}

const AccountTransferModal: React.FC<AccountTransferModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [form] = Form.useForm<TransferFormValues>();
  const { accounts } = useAccountStore();

  const fromAccountId = Form.useWatch('fromAccountId', form);

  const sourceAccount = useMemo(
    () => accounts.find((a) => a.id === fromAccountId),
    [accounts, fromAccountId],
  );

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      onSubmit(values);
      onClose();
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title="账户转账"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
      forceRender
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="fromAccountId"
          label="转出账户"
          rules={[{ required: true, message: '请选择转出账户' }]}
        >
          <AccountSelect placeholder="请选择转出账户" />
        </Form.Item>

        {sourceAccount && (
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              可用余额：
              <Text strong style={{ color: sourceAccount.balance >= 0 ? '#52c41a' : '#f5222d' }}>
                {formatAmount(sourceAccount.balance)}
              </Text>
            </Text>
          </div>
        )}

        <Form.Item
          name="toAccountId"
          label="转入账户"
          rules={[
            { required: true, message: '请选择转入账户' },
            {
              validator: (_, value) => {
                if (value && value === fromAccountId) {
                  return Promise.reject(new Error('转入账户不能与转出账户相同'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <AccountSelect
            placeholder="请选择转入账户"
            excludeId={fromAccountId}
          />
        </Form.Item>

        <Form.Item
          name="amount"
          label="转账金额"
          rules={[
            { required: true, message: '请输入转账金额' },
            {
              validator: (_, value) => {
                if (value !== undefined && value <= 0) {
                  return Promise.reject(new Error('转账金额必须大于0'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <AmountInput />
        </Form.Item>

        <Form.Item name="description" label="备注">
          <Input.TextArea rows={2} placeholder="请输入转账备注" />
        </Form.Item>

        <Form.Item
          name="date"
          label="转账日期"
          rules={[{ required: true, message: '请选择转账日期' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AccountTransferModal;
