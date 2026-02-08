import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Radio,
} from 'antd';
import dayjs from 'dayjs';
import AmountInput from '@/components/AmountInput';
import CategorySelect from '@/components/CategorySelect';
import AccountSelect from '@/components/AccountSelect';
import type { RecurringExpense } from '@/types/recurringExpense';

interface RecurringExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  initialValues?: RecurringExpense;
  onSubmit: (values: Partial<RecurringExpense>) => void;
}

const RecurringExpenseFormModal: React.FC<RecurringExpenseFormModalProps> = ({
  open,
  onClose,
  initialValues,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!initialValues;
  const endMode = Form.useWatch('endMode', form);

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          amount: initialValues.amount,
          dayOfMonth: initialValues.dayOfMonth,
          categoryId: initialValues.categoryId || undefined,
          accountId: initialValues.accountId || undefined,
          note: initialValues.note || '',
          startDate: dayjs(initialValues.startDate),
          endMode: initialValues.endDate ? 'date' : initialValues.durationMonths ? 'duration' : 'none',
          endDate: initialValues.endDate ? dayjs(initialValues.endDate) : undefined,
          durationMonths: initialValues.durationMonths || undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          dayOfMonth: 1,
          startDate: dayjs(),
          endMode: 'none',
        });
      }
    }
  }, [open, initialValues, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const data: Partial<RecurringExpense> = {
        name: values.name,
        amount: values.amount,
        dayOfMonth: values.dayOfMonth,
        categoryId: values.categoryId || null,
        accountId: values.accountId || null,
        note: values.note || '',
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endMode === 'date' && values.endDate
          ? values.endDate.format('YYYY-MM-DD')
          : null,
        durationMonths: values.endMode === 'duration' ? values.durationMonths : null,
        enabled: true,
      };
      onSubmit(data);
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑月固定开销' : '新增月固定开销'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
      okText="确认"
      cancelText="取消"
      width={520}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="开销内容"
          rules={[{ required: true, message: '请输入开销内容' }]}
        >
          <Input placeholder="如：办公室租金、社保、宽带费" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="amount"
          label="金额"
          rules={[{ required: true, message: '请输入金额' }]}
        >
          <AmountInput />
        </Form.Item>

        <Form.Item
          name="dayOfMonth"
          label="每月几号"
          rules={[{ required: true, message: '请输入扣款日' }]}
        >
          <InputNumber min={1} max={31} style={{ width: '100%' }} placeholder="1-31" />
        </Form.Item>

        <Form.Item name="categoryId" label="支出分类">
          <CategorySelect type="expense" />
        </Form.Item>

        <Form.Item name="accountId" label="扣款账户">
          <AccountSelect />
        </Form.Item>

        <Form.Item name="note" label="备注">
          <Input.TextArea rows={2} placeholder="备注信息（可选）" maxLength={200} />
        </Form.Item>

        <Form.Item
          name="startDate"
          label="开始日期"
          rules={[{ required: true, message: '请选择开始日期' }]}
        >
          <DatePicker style={{ width: '100%' }} placeholder="选择开始日期" />
        </Form.Item>

        <Form.Item name="endMode" label="截止方式">
          <Radio.Group>
            <Radio value="none">长期</Radio>
            <Radio value="date">截止日期</Radio>
            <Radio value="duration">持续月数</Radio>
          </Radio.Group>
        </Form.Item>

        {endMode === 'date' && (
          <Form.Item
            name="endDate"
            label="截止日期"
            rules={[{ required: true, message: '请选择截止日期' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="选择截止日期" />
          </Form.Item>
        )}

        {endMode === 'duration' && (
          <Form.Item
            name="durationMonths"
            label="持续月数"
            rules={[{ required: true, message: '请输入持续月数' }]}
          >
            <InputNumber min={1} max={120} style={{ width: '100%' }} placeholder="如：12" addonAfter="个月" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default RecurringExpenseFormModal;
