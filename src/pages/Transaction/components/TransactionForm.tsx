import React, { useEffect } from 'react';
import {
  Form,
  Radio,
  DatePicker,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Card,
  Typography,
} from 'antd';
import { Transaction } from '@/types/transaction';
import { TRANSACTION_TYPE_MAP } from '@/utils/constants';
import AmountInput from '@/components/AmountInput';
import CategorySelect from '@/components/CategorySelect';
import AccountSelect from '@/components/AccountSelect';
import ImageUpload from '@/components/ImageUpload';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Text } = Typography;

interface TransactionFormProps {
  initialValues?: Partial<Transaction>;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const transactionType = Form.useWatch('type', form);
  const isEditing = !!initialValues?.id;

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        ...initialValues,
        date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
        companyAccountDate: initialValues.companyAccountDate
          ? dayjs(initialValues.companyAccountDate)
          : undefined,
      });
    } else {
      form.setFieldsValue({
        type: 'expense',
        date: dayjs(),
      });
    }
  }, [initialValues, form]);

  const handleFinish = (values: any) => {
    const invoiceImages = values.invoiceImages || [];
    const submitData = {
      ...values,
      date: values.date ? values.date.format('YYYY-MM-DD') : undefined,
      companyAccountDate: values.companyAccountDate
        ? values.companyAccountDate.format('YYYY-MM-DD')
        : undefined,
      invoiceIssued: invoiceImages.length > 0,
    };
    onSubmit(submitData);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      autoComplete="off"
    >
      <Form.Item
        name="type"
        label="交易类型"
        rules={[{ required: true, message: '请选择交易类型' }]}
      >
        <Radio.Group disabled={isEditing}>
          {Object.entries(TRANSACTION_TYPE_MAP).map(([key, val]) => (
            <Radio.Button key={key} value={key}>
              {val.label}
            </Radio.Button>
          ))}
        </Radio.Group>
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="amount"
            label="金额"
            rules={[
              { required: true, message: '请输入金额' },
              {
                validator: (_, value) => {
                  if (value !== undefined && value !== null && value <= 0) {
                    return Promise.reject(new Error('金额必须大于0'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <AmountInput placeholder="请输入金额" style={{ width: '100%' }} />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item
            name="date"
            label="日期"
            rules={[{ required: true, message: '请选择日期' }]}
          >
            <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            name="categoryId"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <CategorySelect
              type={transactionType === 'transfer' ? undefined : transactionType as 'income' | 'expense'}
              placeholder="请选择分类"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Col>

        <Col xs={24} sm={12}>
          <Form.Item
            name="accountId"
            label="账户"
            rules={[{ required: true, message: '请选择账户' }]}
          >
            <AccountSelect placeholder="请选择账户" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      {transactionType === 'transfer' && (
        <Form.Item
          name="toAccountId"
          label="转入账户"
          rules={[
            { required: true, message: '请选择转入账户' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('accountId') !== value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('转入账户不能与转出账户相同'));
              },
            }),
          ]}
        >
          <AccountSelect placeholder="请选择转入账户" style={{ width: '100%' }} />
        </Form.Item>
      )}

      <Form.Item
        name="description"
        label="描述"
      >
        <TextArea
          rows={3}
          placeholder="请输入交易描述"
          maxLength={200}
          showCount
        />
      </Form.Item>

      <Form.Item
        name="tags"
        label="标签"
      >
        <Select
          mode="tags"
          placeholder="输入标签后按回车添加"
          style={{ width: '100%' }}
          tokenSeparators={[',']}
        />
      </Form.Item>

      <Form.Item
        name="attachments"
        label="附件"
      >
        <ImageUpload
          maxCount={5}
          accept="image/*,.pdf,application/pdf"
          label="上传附件"
        />
      </Form.Item>

      {transactionType === 'income' && (
        <>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              name="invoiceImages"
              label={
                <Space>
                  <span>发票</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>上传发票即视为已开票</Text>
                </Space>
              }
              style={{ marginBottom: 0 }}
            >
              <ImageUpload
                maxCount={5}
                accept="image/*,.pdf,application/pdf"
                label="上传发票"
              />
            </Form.Item>
          </Card>

          <Card size="small" style={{ marginBottom: 16 }}>
            <Form.Item
              name="companyAccountDate"
              label="公户入账日期"
            >
              <DatePicker style={{ width: '100%' }} placeholder="请选择公户入账日期" />
            </Form.Item>
            <Form.Item
              name="companyAccountImages"
              label="公户入账截图"
              style={{ marginBottom: 0 }}
            >
              <ImageUpload maxCount={5} />
            </Form.Item>
          </Card>
        </>
      )}

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">
            保存
          </Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default TransactionForm;
