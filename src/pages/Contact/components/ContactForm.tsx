import React from 'react';
import { Form, Input, Select, Modal } from 'antd';
import type { Contact } from '@/types/contact';

const { TextArea } = Input;

interface ContactFormProps {
  open: boolean;
  editingContact?: Contact | null;
  onOk: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const typeOptions = [
  { label: '客户', value: 'customer' },
  { label: '供应商', value: 'vendor' },
  { label: '客户+供应商', value: 'both' },
];

const ContactForm: React.FC<ContactFormProps> = ({ open, editingContact, onOk, onCancel, loading }) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (open) {
      form.setFieldsValue(editingContact ?? { type: 'customer' });
    }
  }, [open, editingContact, form]);

  return (
    <Modal
      title={editingContact ? '编辑客户/供应商' : '新增客户/供应商'}
      open={open}
      onOk={() => form.validateFields().then(onOk)}
      onCancel={onCancel}
      confirmLoading={loading}
      destroyOnClose
      afterClose={() => form.resetFields()}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input placeholder="请输入名称" />
        </Form.Item>
        <Form.Item name="type" label="类型" rules={[{ required: true, message: '请选择类型' }]}>
          <Select options={typeOptions} placeholder="请选择类型" />
        </Form.Item>
        <Form.Item name="contactPerson" label="联系人">
          <Input placeholder="请输入联系人" />
        </Form.Item>
        <Form.Item name="phone" label="电话">
          <Input placeholder="请输入电话" />
        </Form.Item>
        <Form.Item name="email" label="邮箱">
          <Input placeholder="请输入邮箱" />
        </Form.Item>
        <Form.Item name="taxNumber" label="税号">
          <Input placeholder="请输入税号" />
        </Form.Item>
        <Form.Item name="address" label="地址">
          <Input placeholder="请输入地址" />
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <TextArea rows={2} placeholder="请输入备注" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ContactForm;
