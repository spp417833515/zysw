import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Radio,
  DatePicker,
  InputNumber,
  Button,
  Space,
  Card,
  Divider,
  Row,
  Col,
  Typography,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { invoiceTypeLabels, invoiceDirectionLabels, type InvoiceType, type InvoiceDirection } from '@/types/invoice';
import { formatAmount } from '@/utils/format';
import ImageUpload from '@/components/ImageUpload';

const { Text } = Typography;

// 公司信息
const COMPANY_INFO = {
  name: '知域科技（新安县）有限责任公司',
  taxNumber: '91410323MAK75U412Y',
};

export interface InvoiceFormValues {
  code: string;
  number: string;
  type: InvoiceType;
  direction: InvoiceDirection;
  issueDate: { format: (template: string) => string };
  buyerName: string;
  buyerTaxNumber: string;
  sellerName: string;
  sellerTaxNumber: string;
  items: InvoiceFormItem[];
  imageUrl?: string | null;
}

export interface InvoiceFormItem {
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount?: number;
  taxAmount?: number;
}

interface InvoiceFormProps {
  onSubmit: (values: InvoiceFormValues) => void;
  onCancel: () => void;
}

const taxRateOptions = [
  { label: '0%', value: 0 },
  { label: '1%', value: 0.01 },
  { label: '3%', value: 0.03 },
  { label: '6%', value: 0.06 },
  { label: '9%', value: 0.09 },
  { label: '13%', value: 0.13 },
];

const typeOptions = Object.entries(invoiceTypeLabels).map(([value, label]) => ({
  label,
  value,
}));

const directionOptions = Object.entries(invoiceDirectionLabels).map(
  ([value, label]) => ({
    label,
    value,
  })
);

const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSubmit, onCancel }) => {
  const [form] = Form.useForm<InvoiceFormValues>();
  const items: InvoiceFormItem[] = Form.useWatch('items', form) || [];
  const direction = Form.useWatch('direction', form);

  // 根据方向自动填充公司信息，并清除对面
  useEffect(() => {
    if (!direction) return;
    if (direction === 'in') {
      // 收到发票：我方是购买方，清除销售方（由用户手填）
      form.setFieldsValue({
        buyerName: COMPANY_INFO.name,
        buyerTaxNumber: COMPANY_INFO.taxNumber,
        sellerName: '',
        sellerTaxNumber: '',
      });
    } else if (direction === 'out') {
      // 开出发票：我方是销售方，清除购买方（由用户手填）
      form.setFieldsValue({
        sellerName: COMPANY_INFO.name,
        sellerTaxNumber: COMPANY_INFO.taxNumber,
        buyerName: '',
        buyerTaxNumber: '',
      });
    }
  }, [direction, form]);

  const calculateItemAmount = (quantity?: number, unitPrice?: number): number => {
    if (quantity == null || unitPrice == null) return 0;
    return +(quantity * unitPrice).toFixed(2);
  };

  const calculateItemTaxAmount = (
    amount: number,
    taxRate?: number
  ): number => {
    if (taxRate == null) return 0;
    return +(amount * taxRate).toFixed(2);
  };

  const totalAmount = items.reduce((sum, item) => {
    if (!item) return sum;
    const amount = calculateItemAmount(item.quantity, item.unitPrice);
    return sum + amount;
  }, 0);

  const totalTaxAmount = items.reduce((sum, item) => {
    if (!item) return sum;
    const amount = calculateItemAmount(item.quantity, item.unitPrice);
    const taxAmount = calculateItemTaxAmount(amount, item.taxRate);
    return sum + taxAmount;
  }, 0);

  const grandTotal = +(totalAmount + totalTaxAmount).toFixed(2);

  const handleFinish = (values: InvoiceFormValues) => {
    const processedItems = (values.items || []).map((item) => {
      const amount = calculateItemAmount(item.quantity, item.unitPrice);
      const taxAmount = calculateItemTaxAmount(amount, item.taxRate);
      return { ...item, amount, taxAmount };
    });
    const attachments = (values as any).attachments;
    onSubmit({
      ...values,
      items: processedItems,
      imageUrl: attachments?.[0]?.url || null,
    } as any);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleFinish}
      initialValues={{
        direction: 'in',
        items: [{}],
      }}
    >
      <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="发票代码"
              name="code"
              rules={[{ required: true, message: '请输入发票代码' }]}
            >
              <Input placeholder="请输入发票代码" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="发票号码"
              name="number"
              rules={[{ required: true, message: '请输入发票号码' }]}
            >
              <Input placeholder="请输入发票号码" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="开票日期"
              name="issueDate"
              rules={[{ required: true, message: '请选择开票日期' }]}
            >
              <DatePicker style={{ width: '100%' }} placeholder="请选择开票日期" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label="类型"
              name="type"
              rules={[{ required: true, message: '请选择发票类型' }]}
            >
              <Select placeholder="请选择发票类型" options={typeOptions} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              label="方向"
              name="direction"
              rules={[{ required: true, message: '请选择发票方向' }]}
            >
              <Radio.Group>
                {directionOptions.map((opt) => (
                  <Radio key={opt.value} value={opt.value}>
                    {opt.label}
                  </Radio>
                ))}
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card
        title={`购买方信息${direction === 'in' ? '（我方）' : ''}`}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="名称"
              name="buyerName"
              rules={[{ required: true, message: '请输入购买方名称' }]}
            >
              <Input
                placeholder="请输入购买方名称"
                disabled={direction === 'in'}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="纳税人识别号"
              name="buyerTaxNumber"
              rules={[{ required: true, message: '请输入购买方纳税人识别号' }]}
            >
              <Input
                placeholder="请输入纳税人识别号"
                disabled={direction === 'in'}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card
        title={`销售方信息${direction === 'out' ? '（我方）' : ''}`}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="名称"
              name="sellerName"
              rules={[{ required: true, message: '请输入销售方名称' }]}
            >
              <Input
                placeholder="请输入销售方名称"
                disabled={direction === 'out'}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="纳税人识别号"
              name="sellerTaxNumber"
              rules={[{ required: true, message: '请输入销售方纳税人识别号' }]}
            >
              <Input
                placeholder="请输入纳税人识别号"
                disabled={direction === 'out'}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="发票附件" size="small" style={{ marginBottom: 16 }}>
        <Form.Item name="attachments" label="上传发票图片/PDF">
          <ImageUpload maxCount={3} accept="image/*,.pdf" label="上传发票" />
        </Form.Item>
      </Card>

      <Card title="发票明细" size="small" style={{ marginBottom: 16 }}>
        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => {
                const currentItem = items[name] || {};
                const itemAmount = calculateItemAmount(
                  currentItem.quantity,
                  currentItem.unitPrice
                );
                const itemTaxAmount = calculateItemTaxAmount(
                  itemAmount,
                  currentItem.taxRate
                );

                return (
                  <div key={key}>
                    <Row gutter={12} align="middle">
                      <Col span={5}>
                        <Form.Item
                          {...restField}
                          name={[name, 'name']}
                          label={name === 0 ? '名称' : undefined}
                          rules={[{ required: true, message: '请输入名称' }]}
                        >
                          <Input placeholder="名称" />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'quantity']}
                          label={name === 0 ? '数量' : undefined}
                          rules={[{ required: true, message: '请输入数量' }]}
                        >
                          <InputNumber
                            placeholder="数量"
                            min={0}
                            precision={2}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'unitPrice']}
                          label={name === 0 ? '单价' : undefined}
                          rules={[{ required: true, message: '请输入单价' }]}
                        >
                          <InputNumber
                            placeholder="单价"
                            min={0}
                            precision={2}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={3}>
                        <Form.Item
                          {...restField}
                          name={[name, 'taxRate']}
                          label={name === 0 ? '税率' : undefined}
                          rules={[{ required: true, message: '请选择税率' }]}
                        >
                          <Select
                            placeholder="税率"
                            options={taxRateOptions}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item label={name === 0 ? '金额' : undefined}>
                          <Text>{formatAmount(itemAmount)}</Text>
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item label={name === 0 ? '税额' : undefined}>
                          <Text>{formatAmount(itemTaxAmount)}</Text>
                        </Form.Item>
                      </Col>
                      <Col span={2}>
                        <Form.Item label={name === 0 ? ' ' : undefined}>
                          {fields.length > 1 && (
                            <MinusCircleOutlined
                              style={{ color: '#ff4d4f', fontSize: 18 }}
                              onClick={() => remove(name)}
                            />
                          )}
                        </Form.Item>
                      </Col>
                    </Row>
                    {name < fields.length - 1 && (
                      <Divider style={{ margin: '0 0 12px 0' }} />
                    )}
                  </div>
                );
              })}
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              >
                添加明细行
              </Button>
            </>
          )}
        </Form.List>

        <Divider />

        <Row justify="end" gutter={32}>
          <Col>
            <Text>合计金额：</Text>
            <Text strong style={{ fontSize: 16 }}>
              {formatAmount(totalAmount)}
            </Text>
          </Col>
          <Col>
            <Text>合计税额：</Text>
            <Text strong style={{ fontSize: 16 }}>
              {formatAmount(totalTaxAmount)}
            </Text>
          </Col>
          <Col>
            <Text>价税合计：</Text>
            <Text strong style={{ fontSize: 18, color: '#f5222d' }}>
              {formatAmount(grandTotal)}
            </Text>
          </Col>
        </Row>
      </Card>

      <Row justify="end" style={{ marginTop: 16 }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
        </Space>
      </Row>
    </Form>
  );
};

export default InvoiceForm;
