import React, { useState } from 'react';
import {
  Steps,
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
  Descriptions,
  Tag,
  Result,
} from 'antd';
import { TRANSACTION_TYPE_MAP } from '@/utils/constants';
import AmountInput from '@/components/AmountInput';
import CategorySelect from '@/components/CategorySelect';
import AccountSelect from '@/components/AccountSelect';
import ImageUpload from '@/components/ImageUpload';
import type { PaymentAccountType } from '@/types/transaction';
import dayjs from 'dayjs';

const { TextArea } = Input;

interface TransactionWizardProps {
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

const TransactionWizard: React.FC<TransactionWizardProps> = ({
  onSubmit,
  onCancel,
}) => {
  const [current, setCurrent] = useState(0);
  const [form] = Form.useForm();
  const transactionType = Form.useWatch('type', form);

  // Workflow state
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentAccountType, setPaymentAccountType] = useState<PaymentAccountType | null>(null);
  const [invoiceAction, setInvoiceAction] = useState<'needed' | 'notNeeded'>('needed');

  const isTransfer = transactionType === 'transfer';

  const handleNext = async () => {
    if (current === 0) {
      try {
        await form.validateFields([
          'type', 'amount', 'date', 'categoryId', 'accountId',
          ...(transactionType === 'transfer' ? ['toAccountId'] : []),
        ]);
        setCurrent(1);
      } catch {
        // validation failed
      }
    } else if (current === 1) {
      setCurrent(2);
    } else if (current === 2) {
      setCurrent(3);
    }
  };

  const handlePrev = () => {
    setCurrent(current - 1);
  };

  const handleSkip = () => {
    if (current === 1) {
      setPaymentConfirmed(false);
      setPaymentAccountType(null);
    } else if (current === 2) {
      setInvoiceAction('needed');
    }
    setCurrent(current + 1);
  };

  const handleFinish = () => {
    const values = form.getFieldsValue();
    const submitData = {
      ...values,
      date: values.date ? values.date.format('YYYY-MM-DD') : undefined,
      paymentConfirmed,
      paymentAccountType: paymentConfirmed ? paymentAccountType : null,
      paymentConfirmedAt: paymentConfirmed ? new Date().toISOString() : undefined,
      invoiceNeeded: isTransfer ? false : invoiceAction === 'needed',
      invoiceCompleted: false,
      taxDeclared: false,
    };
    onSubmit(submitData);
  };

  const steps = [
    { title: '基本信息' },
    { title: '到账确认' },
    { title: '开票确认' },
    { title: '完成确认' },
  ];

  const renderStep0 = () => (
    <>
      <Form.Item
        name="type"
        label="交易类型"
        rules={[{ required: true, message: '请选择交易类型' }]}
      >
        <Radio.Group>
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

      <Form.Item name="description" label="描述">
        <TextArea rows={3} placeholder="请输入交易描述" maxLength={200} showCount />
      </Form.Item>

      <Form.Item name="tags" label="标签">
        <Select
          mode="tags"
          placeholder="输入标签后按回车添加"
          style={{ width: '100%' }}
          tokenSeparators={[',']}
        />
      </Form.Item>

      <Form.Item name="attachments" label="附件">
        <ImageUpload
          maxCount={5}
          accept="image/*,.pdf,application/pdf"
          label="上传附件"
        />
      </Form.Item>
    </>
  );

  const renderStep1 = () => (
    <Card style={{ maxWidth: 500, margin: '24px auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ fontSize: 16, fontWeight: 500 }}>该笔款项是否已到账？</div>
        <Radio.Group
          value={paymentConfirmed ? 'yes' : 'no'}
          onChange={(e) => setPaymentConfirmed(e.target.value === 'yes')}
        >
          <Space direction="vertical">
            <Radio value="yes">已到账</Radio>
            <Radio value="no">尚未到账（稍后确认）</Radio>
          </Space>
        </Radio.Group>
        {paymentConfirmed && (
          <>
            <div style={{ fontSize: 14 }}>到账类型：</div>
            <Radio.Group
              value={paymentAccountType}
              onChange={(e) => setPaymentAccountType(e.target.value)}
            >
              <Space direction="vertical">
                <Radio value="company">公户（对公账户）</Radio>
                <Radio value="personal">私户（个人账户）</Radio>
              </Space>
            </Radio.Group>
          </>
        )}
      </Space>
    </Card>
  );

  const renderStep2 = () => {
    if (isTransfer) {
      return (
        <Result
          status="info"
          title="转账类型无需开票"
          subTitle="转账交易不涉及开票环节，将自动跳过。"
        />
      );
    }
    return (
      <Card style={{ maxWidth: 500, margin: '24px auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>该笔交易是否需要开票？</div>
          <Radio.Group
            value={invoiceAction}
            onChange={(e) => {
              setInvoiceAction(e.target.value);
            }}
          >
            <Space direction="vertical">
              <Radio value="needed">需要开票（稍后处理）</Radio>
              <Radio value="notNeeded">不需要开票</Radio>
            </Space>
          </Radio.Group>
        </Space>
      </Card>
    );
  };

  const renderStep3 = () => {
    const values = form.getFieldsValue();
    const typeInfo = TRANSACTION_TYPE_MAP[values.type as keyof typeof TRANSACTION_TYPE_MAP];
    return (
      <Card style={{ maxWidth: 600, margin: '24px auto' }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="交易类型">
            <Tag color={typeInfo?.color}>{typeInfo?.label || values.type}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="金额">
            ¥{values.amount?.toLocaleString() ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="日期">
            {values.date?.format('YYYY-MM-DD') ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="描述">
            {values.description || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="到账状态">
            {paymentConfirmed ? (
              <Tag color="green">
                已到账 ({paymentAccountType === 'company' ? '公户' : '私户'})
              </Tag>
            ) : (
              <Tag color="orange">待确认</Tag>
            )}
          </Descriptions.Item>
          {!isTransfer && (
            <Descriptions.Item label="开票状态">
              {invoiceAction === 'needed' ? (
                <Tag color="orange">需要开票（待处理）</Tag>
              ) : (
                <Tag>无需开票</Tag>
              )}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="申报状态">
            {isTransfer ? (
              <Tag>不适用</Tag>
            ) : (
              <Tag color="orange">待申报</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
        {!isTransfer && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: '#fffbe6',
              borderRadius: 6,
              border: '1px solid #ffe58f',
              fontSize: 13,
            }}
          >
            提示：未完成的环节将自动进入"待办任务"列表，您可以随时在待办任务中处理。
          </div>
        )}
      </Card>
    );
  };

  const stepContent = [renderStep0, renderStep1, renderStep2, renderStep3];

  return (
    <div>
      <Steps current={current} items={steps} style={{ marginBottom: 32 }} />

      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={{ type: 'expense', date: dayjs() }}
      >
        {stepContent[current]()}
      </Form>

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          {current > 0 && <Button onClick={handlePrev}>上一步</Button>}
          {current > 0 && current < 3 && (
            <Button onClick={handleSkip}>跳过(稍后处理)</Button>
          )}
          {current < 3 && (
            <Button type="primary" onClick={handleNext}>
              下一步
            </Button>
          )}
          {current === 3 && (
            <Button type="primary" onClick={handleFinish}>
              提交
            </Button>
          )}
        </Space>
      </div>
    </div>
  );
};

export default TransactionWizard;
