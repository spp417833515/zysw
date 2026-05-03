import React, { useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Select, DatePicker, Switch, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Employee } from '@/types/employee';

interface Props {
  open: boolean;
  editingEmployee: Employee | null;
  onOk: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  loading: boolean;
}

const EmployeeForm: React.FC<Props> = ({ open, editingEmployee, onOk, onCancel, loading }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (editingEmployee) {
        form.setFieldsValue({
          ...editingEmployee,
          entryDate: editingEmployee.entryDate ? dayjs(editingEmployee.entryDate) : null,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ status: 'active', payDay: 15, socialInsuranceRate: 0, housingFundRate: 0, specialDeduction: 0, selfTaxFiling: false });
      }
    }
  }, [open, editingEmployee, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onOk({
      ...values,
      entryDate: values.entryDate ? values.entryDate.format('YYYY-MM-DD') : '',
    });
  };

  return (
    <Modal
      title={editingEmployee ? '编辑员工' : '新增员工'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="员工姓名" />
        </Form.Item>
        <Form.Item name="phone" label="手机号">
          <Input placeholder="手机号" />
        </Form.Item>
        <Form.Item name="idNumber" label="身份证号">
          <Input placeholder="身份证号" />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="department" label="部门">
            <Input placeholder="部门" />
          </Form.Item>
          <Form.Item name="position" label="职位">
            <Input placeholder="职位" />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="entryDate" label="入职日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ label: '在职', value: 'active' }, { label: '离职', value: 'departed' }]} />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name="baseSalary" label="月基本工资（元）" rules={[{ required: true, message: '请输入工资' }]}>
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
          </Form.Item>
          <Form.Item name="payDay" label="每月发薪日">
            <InputNumber min={1} max={28} style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Form.Item name="socialInsuranceRate" label="社保个人比例(%)">
            <InputNumber min={0} max={30} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="housingFundRate" label="公积金个人比例(%)">
            <InputNumber min={0} max={12} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="specialDeduction" label="专项附加扣除(元/月)">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <Form.Item
          name="selfTaxFiling"
          valuePropName="checked"
          label={
            <span>
              员工自行缴纳税费&nbsp;
              <Tooltip title="开启后：公司全额发放工资，由员工自行申报和缴纳个税。系统不再自动扣税。">
                <QuestionCircleOutlined style={{ color: '#999' }} />
              </Tooltip>
            </span>
          }
        >
          <Switch checkedChildren="自缴" unCheckedChildren="代扣" />
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <Input.TextArea rows={2} placeholder="备注信息" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EmployeeForm;
