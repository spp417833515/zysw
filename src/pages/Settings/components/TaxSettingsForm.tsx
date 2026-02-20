import React, { useEffect, useState } from 'react';
import { Form, Input, InputNumber, Switch, Select, Button, Card, message, Divider, Alert, Space, Typography } from 'antd';
import { SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { getTaxSettings, saveTaxSettings, TaxSettings } from '@/api/settings';

const { Option } = Select;
const { Text } = Typography;

const TaxSettingsForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setFetching(true);
      const res = await getTaxSettings();
      if (res.data) {
        form.setFieldsValue(res.data);
      }
    } catch (error) {
      message.error('获取税率设置失败');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (values: TaxSettings) => {
    try {
      setLoading(true);
      await saveTaxSettings(values);
      message.success('税率设置保存成功');
    } catch (error) {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card bordered={false} loading={fetching}>
      <Alert
        message="税率说明"
        description={
          <Space direction="vertical" size={4}>
            <Text strong>小规模纳税人（年销售额≤500万）：</Text>
            <Text>• 增值税率：3%，季度销售额30万以下免征</Text>
            <Text>• 适用于：注册资金较小、员工较少的企业</Text>
            <Text strong style={{ marginTop: 8, display: 'block' }}>一般纳税人（年销售额&gt;500万或主动申请）：</Text>
            <Text>• 增值税率：6%（服务业）、9%（运输建筑）、13%（销售货物）</Text>
            <Text>• 可抵扣进项税额</Text>
            <Text strong style={{ marginTop: 8, display: 'block' }}>其他税费：</Text>
            <Text>• 附加税：增值税的12%（城建税7% + 教育费附加3% + 地方教育附加2%）</Text>
            <Text>• 企业所得税：有限公司25%，小微企业5%-10%优惠税率</Text>
          </Space>
        }
        type="info"
        icon={<InfoCircleOutlined />}
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          vatRate: 0.03,
          vatThresholdQuarterly: 300000,
          additionalTaxRate: 0.12,
          incomeTaxEnabled: true,
          province: '河南',
          city: '',
          taxpayerType: 'small',
        }}
      >
        <Divider orientation="left">基本信息</Divider>

        <Form.Item
          label="纳税人类型"
          name="taxpayerType"
          rules={[{ required: true, message: '请选择纳税人类型' }]}
          tooltip="年销售额500万以下通常为小规模纳税人"
        >
          <Select>
            <Option value="small">小规模纳税人（年销售额≤500万）</Option>
            <Option value="general">一般纳税人（年销售额&gt;500万或主动申请）</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="省份"
          name="province"
          rules={[{ required: true, message: '请输入省份' }]}
        >
          <Input placeholder="如：河南" />
        </Form.Item>

        <Form.Item label="城市" name="city">
          <Input placeholder="如：郑州（可选）" />
        </Form.Item>

        <Divider orientation="left">增值税设置</Divider>

        <Form.Item
          label="增值税率"
          name="vatRate"
          rules={[{ required: true, message: '请输入增值税率' }]}
          tooltip="小规模纳税人通常为3%，一般纳税人根据行业不同为6%、9%或13%"
        >
          <InputNumber
            min={0}
            max={1}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
            formatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
            parser={(value) => Number(value?.replace('%', '')) / 100}
          />
        </Form.Item>

        <Form.Item
          label="季度免征额（元）"
          name="vatThresholdQuarterly"
          rules={[{ required: true, message: '请输入季度免征额' }]}
          tooltip="小规模纳税人季度销售额低于此金额可免征增值税，当前政策为30万元"
        >
          <InputNumber
            min={0}
            step={10000}
            style={{ width: '100%' }}
            formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value?.replace(/¥\s?|(,*)/g, '') as any}
          />
        </Form.Item>

        <Divider orientation="left">附加税设置</Divider>

        <Form.Item
          label="附加税率"
          name="additionalTaxRate"
          rules={[{ required: true, message: '请输入附加税率' }]}
          tooltip="附加税 = 增值税 × 附加税率，通常为12%（城建税7% + 教育费附加3% + 地方教育附加2%）"
        >
          <InputNumber
            min={0}
            max={1}
            step={0.01}
            precision={2}
            style={{ width: '100%' }}
            formatter={(value) => `${(Number(value) * 100).toFixed(0)}%`}
            parser={(value) => Number(value?.replace('%', '')) / 100}
          />
        </Form.Item>

        <Divider orientation="left">企业所得税设置</Divider>

        <Form.Item
          label="启用企业所得税计算"
          name="incomeTaxEnabled"
          valuePropName="checked"
          tooltip="有限责任公司需缴纳企业所得税，标准税率25%，小微企业可享受5%-10%优惠税率"
        >
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>

        <Alert
          message="企业所得税说明（有限责任公司）"
          description={
            <div style={{ marginTop: 8 }}>
              <table style={{ width: '100%', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ant-color-border-secondary, #f0f0f0)' }}>
                    <th style={{ padding: '4px 8px', textAlign: 'left' }}>年应纳税所得额</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left' }}>税率</th>
                    <th style={{ padding: '4px 8px', textAlign: 'left' }}>说明</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 8px' }}>≤100万元</td>
                    <td style={{ padding: '4px 8px' }}>5%</td>
                    <td style={{ padding: '4px 8px' }}>小微企业优惠</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px' }}>100万-300万元</td>
                    <td style={{ padding: '4px 8px' }}>10%</td>
                    <td style={{ padding: '4px 8px' }}>小微企业优惠</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 8px' }}>&gt;300万元</td>
                    <td style={{ padding: '4px 8px' }}>25%</td>
                    <td style={{ padding: '4px 8px' }}>标准税率</td>
                  </tr>
                </tbody>
              </table>
              <Text style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                * 小微企业条件：年应纳税所得额≤300万、从业人数≤300人、资产总额≤5000万
              </Text>
            </div>
          }
          type="info"
          style={{ marginTop: 12 }}
        />

        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} block>
            保存设置
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TaxSettingsForm;
