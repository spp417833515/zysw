import React from 'react';
import {
  Form,
  DatePicker,
  Input,
  Button,
  Space,
  Card,
  Typography,
} from 'antd';
import AmountInput from '@/components/AmountInput';
import AccountSelect from '@/components/AccountSelect';
import CategorySelect from '@/components/CategorySelect';
import ImageUpload from '@/components/ImageUpload';
import type { Attachment } from '@/types/transaction';

const { TextArea } = Input;
const { Title, Text } = Typography;

export interface IncomeRecordFormValues {
  date: any; // dayjs
  amount: number;
  accountId: string;
  categoryId: string;
  description: string;
  invoiceImages?: Attachment[];
  companyAccountDate?: any; // dayjs
  companyAccountImages?: Attachment[];
}

interface IncomeRecordFormProps {
  onSubmit: (values: IncomeRecordFormValues) => void;
  onCancel: () => void;
  loading?: boolean;
}

const IncomeRecordForm: React.FC<IncomeRecordFormProps> = ({
  onSubmit,
  onCancel,
  loading,
}) => {
  const [form] = Form.useForm<IncomeRecordFormValues>();

  const handleFinish = (values: IncomeRecordFormValues) => {
    onSubmit(values);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        description: '',
        invoiceImages: [],
        companyAccountImages: [],
      }}
    >
      {/* 基本信息 — 必填 */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginTop: 0 }}>基本信息</Title>
        <Form.Item
          label="时间"
          name="date"
          rules={[{ required: true, message: '请选择时间' }]}
        >
          <DatePicker style={{ width: '100%' }} placeholder="请选择日期" />
        </Form.Item>

        <Form.Item
          label="收入金额（含税）"
          name="amount"
          rules={[{ required: true, message: '请输入收入金额' }]}
        >
          <AmountInput placeholder="请输入收入金额" />
        </Form.Item>

        <Form.Item
          label="入账账户"
          name="accountId"
          rules={[{ required: true, message: '请选择入账账户' }]}
        >
          <AccountSelect placeholder="请选择入账账户" />
        </Form.Item>

        <Form.Item
          label="收入分类"
          name="categoryId"
          rules={[{ required: true, message: '请选择收入分类' }]}
        >
          <CategorySelect type="income" placeholder="请选择收入分类" />
        </Form.Item>

        <Form.Item label="备注" name="description">
          <TextArea rows={3} placeholder="请输入备注信息（选填）" maxLength={500} showCount />
        </Form.Item>
      </Card>

      {/* 发票 — 选填，上传了即视为发票已完成 */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          发票 <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>选填，上传发票即视为已完成；未上传将生成待办提醒</Text>
        </Title>
        <Form.Item label="上传发票（PDF 或图片）" name="invoiceImages">
          <ImageUpload
            maxCount={5}
            accept="image/*,.pdf,application/pdf"
            label="上传发票"
          />
        </Form.Item>
      </Card>

      {/* 公户入账 — 选填，未填则进入待办 */}
      <Card style={{ marginBottom: 16 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          公户入账 <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>选填，未填写将生成待办提醒</Text>
        </Title>
        <Form.Item label="公户入账日期" name="companyAccountDate">
          <DatePicker style={{ width: '100%' }} placeholder="请选择公户入账日期" />
        </Form.Item>

        <Form.Item label="公户入账截图" name="companyAccountImages">
          <ImageUpload maxCount={5} />
        </Form.Item>
      </Card>

      {/* 提交按钮 */}
      <Card>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
          </Space>
        </Form.Item>
      </Card>
    </Form>
  );
};

export default IncomeRecordForm;
