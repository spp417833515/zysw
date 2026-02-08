import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Slider } from 'antd';
import dayjs from 'dayjs';
import type { Budget, BudgetPeriod } from '@/types/budget';
import { BUDGET_PERIOD_MAP } from '@/utils/constants';
import AmountInput from '@/components/AmountInput';
import CategorySelect from '@/components/CategorySelect';

interface BudgetFormModalProps {
  open: boolean;
  onClose: () => void;
  initialValues?: Budget;
  onSubmit: (values: Partial<Budget>) => void;
}

const periodOptions = (Object.entries(BUDGET_PERIOD_MAP) as [BudgetPeriod, string][]).map(
  ([value, label]) => ({ label, value }),
);

const sliderMarks: Record<number, string> = {
  50: '50%',
  80: '80%',
  100: '100%',
};

const calcEndDate = (startDate: dayjs.Dayjs, period: BudgetPeriod): dayjs.Dayjs => {
  switch (period) {
    case 'monthly':
      return startDate.add(1, 'month').subtract(1, 'day');
    case 'quarterly':
      return startDate.add(3, 'month').subtract(1, 'day');
    case 'yearly':
      return startDate.add(1, 'year').subtract(1, 'day');
    default:
      return startDate;
  }
};

const BudgetFormModal: React.FC<BudgetFormModalProps> = ({
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
          startDate: dayjs(initialValues.startDate),
          endDate: dayjs(initialValues.endDate),
          alertThreshold: initialValues.alertThreshold * 100,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialValues, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const submitValues: Partial<Budget> = {
        name: values.name,
        categoryId: values.categoryId,
        amount: values.amount,
        period: values.period,
        startDate: values.startDate.format('YYYY-MM-DD'),
        endDate: values.endDate.format('YYYY-MM-DD'),
        alertThreshold: values.alertThreshold / 100,
      };
      onSubmit(submitValues);
      onClose();
    } catch {
      // validation failed
    }
  };

  const handlePeriodChange = (period: BudgetPeriod) => {
    const startDate = form.getFieldValue('startDate');
    if (startDate) {
      form.setFieldValue('endDate', calcEndDate(startDate, period));
    }
  };

  const handleStartDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      const period = form.getFieldValue('period') as BudgetPeriod | undefined;
      if (period) {
        form.setFieldValue('endDate', calcEndDate(date, period));
      }
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑预算' : '新增预算'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
      forceRender
      width={520}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          period: 'monthly' as BudgetPeriod,
          alertThreshold: 80,
          startDate: dayjs().startOf('month'),
          endDate: dayjs().endOf('month'),
        }}
      >
        <Form.Item
          name="name"
          label="预算名称"
          rules={[{ required: true, message: '请输入预算名称' }]}
        >
          <Input placeholder="请输入预算名称" />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="支出分类"
          rules={[{ required: true, message: '请选择支出分类' }]}
        >
          <CategorySelect type="expense" placeholder="请选择支出分类" />
        </Form.Item>

        <Form.Item
          name="amount"
          label="预算金额"
          rules={[{ required: true, message: '请输入预算金额' }]}
        >
          <AmountInput placeholder="请输入预算金额" />
        </Form.Item>

        <Form.Item
          name="period"
          label="预算周期"
          rules={[{ required: true, message: '请选择预算周期' }]}
        >
          <Select options={periodOptions} placeholder="请选择预算周期" onChange={handlePeriodChange} />
        </Form.Item>

        <Form.Item
          name="startDate"
          label="开始日期"
          rules={[{ required: true, message: '请选择开始日期' }]}
        >
          <DatePicker style={{ width: '100%' }} onChange={handleStartDateChange} />
        </Form.Item>

        <Form.Item
          name="endDate"
          label="结束日期"
          rules={[{ required: true, message: '请选择结束日期' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="alertThreshold"
          label="预警阈值"
          tooltip="当支出达到预算的该百分比时触发预警"
        >
          <Slider
            min={0}
            max={100}
            step={5}
            marks={sliderMarks}
            tooltip={{ formatter: (val) => `${val}%` }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BudgetFormModal;
