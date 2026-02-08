import React from 'react';
import { Card, Form, Input, Button, message, Divider } from 'antd';
import { SaveOutlined } from '@ant-design/icons';

const CompanyInfoForm: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: Record<string, string>) => {
    console.log('Company info:', values);
    message.success('企业信息保存成功');
  };

  return (
    <Card title="企业信息" style={{ marginBottom: 24 }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          companyName: '示例科技有限公司',
          taxNumber: '91110000MA87654321',
          address: '北京市朝阳区xxx路xxx号',
          phone: '010-12345678',
          bankName: '中国工商银行北京分行',
          bankAccount: '6222 0000 0000 0000 000',
        }}
        style={{ maxWidth: 600 }}
      >
        <Form.Item label="企业名称" name="companyName" rules={[{ required: true, message: '请输入企业名称' }]}>
          <Input placeholder="请输入企业名称" />
        </Form.Item>
        <Form.Item label="税号" name="taxNumber" rules={[{ required: true, message: '请输入税号' }]}>
          <Input placeholder="请输入统一社会信用代码" />
        </Form.Item>
        <Form.Item label="地址" name="address">
          <Input placeholder="请输入企业地址" />
        </Form.Item>
        <Form.Item label="电话" name="phone">
          <Input placeholder="请输入联系电话" />
        </Form.Item>
        <Divider>开户信息</Divider>
        <Form.Item label="开户银行" name="bankName">
          <Input placeholder="请输入开户银行" />
        </Form.Item>
        <Form.Item label="银行账号" name="bankAccount">
          <Input placeholder="请输入银行账号" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
            保存信息
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CompanyInfoForm;
