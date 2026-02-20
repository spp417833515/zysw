import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Divider, Spin } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import { getCompanyInfo, saveCompanyInfo, type CompanyInfo } from '@/api/settings';

const CompanyInfoForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // 加载企业信息
  useEffect(() => {
    const loadCompanyInfo = async () => {
      try {
        setFetching(true);
        const response = await getCompanyInfo();
        if (response.data) {
          form.setFieldsValue(response.data);
        }
      } catch (error) {
        // 静默处理加载失败
      } finally {
        setFetching(false);
      }
    };

    loadCompanyInfo();
  }, [form]);

  const onFinish = async (values: CompanyInfo) => {
    try {
      setLoading(true);
      await saveCompanyInfo(values);
      message.success('企业信息保存成功');
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin tip="加载中..." />
      </div>
    );
  }

  return (
    <Card bordered={false}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          companyName: '',
          taxNumber: '',
          address: '',
          phone: '',
          bankName: '',
          bankAccount: '',
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
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
            保存信息
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default CompanyInfoForm;
