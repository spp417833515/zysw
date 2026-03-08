import React, { useEffect, useState } from 'react';
import { Button, Table, Space, Input, Select, Popconfirm, Tag, message, Typography, Tabs } from 'antd';
import { PlusOutlined, SearchOutlined, CalculatorOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import EmployeeForm from './components/EmployeeForm';
import TaxCalcModal from './components/TaxCalcModal';
import ContractModal from './components/ContractModal';
import SalaryConfirmModal from '@/pages/Tasks/components/SalaryConfirmModal';
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getSalaryRecords,
} from '@/api/employee';
import { formatAmount } from '@/utils/format';
import { useUnpaidSalaries } from '@/hooks/useUnpaidSalaries';
import { baseUnpaidSalaryColumns, makeUnpaidActionColumn } from '@/pages/shared/unpaidSalaryColumns';
import type { Employee, SalaryRecord, UnpaidSalaryItem } from '@/types/employee';

const { Text } = Typography;

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: '在职', color: 'green' },
  departed: { label: '离职', color: 'default' },
};

const EmployeePage: React.FC = () => {
  const [data, setData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [taxCalcOpen, setTaxCalcOpen] = useState(false);
  const [taxCalcDefaults, setTaxCalcDefaults] = useState<{ defaultSalary?: number; defaultSocialRate?: number; defaultFundRate?: number; defaultSpecialDeduction?: number }>({});
  const [contractOpen, setContractOpen] = useState(false);
  const [contractEmployee, setContractEmployee] = useState<Employee | null>(null);

  // Salary records
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const { unpaidItems, unpaidLoading, fetchUnpaid } = useUnpaidSalaries();
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [payingItem, setPayingItem] = useState<UnpaidSalaryItem | null>(null);

  const fetchData = async (p = page) => {
    setLoading(true);
    try {
      const res = await getEmployees({ page: p, pageSize: 20, keyword: keyword || undefined, status: statusFilter });
      setData(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryRecords = async () => {
    setSalaryLoading(true);
    try {
      const res = await getSalaryRecords();
      setSalaryRecords(res.data ?? []);
    } finally {
      setSalaryLoading(false);
    }
  };

  useEffect(() => { fetchData(1); setPage(1); }, [keyword, statusFilter]);

  const handleSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (editing) {
        await updateEmployee(editing.id, values);
        message.success('更新成功');
      } else {
        await createEmployee(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      setEditing(null);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteEmployee(id);
      if (res.code === 0) {
        message.success('删除成功');
        fetchData();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  };

  const handleSalarySuccess = () => {
    fetchSalaryRecords();
    fetchUnpaid();
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name', width: 100 },
    { title: '部门', dataIndex: 'department', key: 'department', width: 100, render: (v: string) => v || '-' },
    { title: '职位', dataIndex: 'position', key: 'position', width: 100, render: (v: string) => v || '-' },
    { title: '入职日期', dataIndex: 'entryDate', key: 'entryDate', width: 110, render: (v: string) => v || '-' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (v: string) => {
        const m = statusMap[v];
        return m ? <Tag color={m.color}>{m.label}</Tag> : v;
      },
    },
    {
      title: '月薪', dataIndex: 'baseSalary', key: 'baseSalary', width: 100,
      render: (v: number) => v ? `¥${v.toLocaleString()}` : '-',
    },
    { title: '发薪日', dataIndex: 'payDay', key: 'payDay', width: 80, render: (v: number) => `每月${v}号` },
    {
      title: '个税', key: 'tax', width: 90,
      render: (_: unknown, r: Employee) => (
        <Text type={r.taxInfo.tax > 0 ? 'danger' : 'success'}>
          ¥{r.taxInfo.tax.toLocaleString()}
        </Text>
      ),
    },
    {
      title: '实发工资', key: 'netSalary', width: 110,
      render: (_: unknown, r: Employee) => (
        <Text type="success" strong>¥{r.taxInfo.netSalary.toLocaleString()}</Text>
      ),
    },
    {
      title: '操作', key: 'action', width: 240,
      render: (_: unknown, record: Employee) => (
        <Space>
          <a onClick={() => { setEditing(record); setModalOpen(true); }}>编辑</a>
          <a onClick={() => {
            setTaxCalcDefaults({
              defaultSalary: record.baseSalary,
              defaultSocialRate: record.socialInsuranceRate,
              defaultFundRate: record.housingFundRate,
              defaultSpecialDeduction: record.specialDeduction,
            });
            setTaxCalcOpen(true);
          }}>算税</a>
          <a onClick={() => { setContractEmployee(record); setContractOpen(true); }}>合同</a>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const unpaidColumns = [
    ...baseUnpaidSalaryColumns,
    makeUnpaidActionColumn((record) => { setPayingItem(record); setSalaryModalOpen(true); }),
  ];

  const salaryColumns = [
    { title: '员工', dataIndex: 'employeeName', key: 'employeeName', width: 100 },
    { title: '年份', dataIndex: 'year', key: 'year', width: 80 },
    { title: '月份', dataIndex: 'month', key: 'month', width: 80, render: (v: number) => `${v}月` },
    { title: '应发工资', dataIndex: 'baseSalary', key: 'baseSalary', width: 120, render: (v: number) => `¥${formatAmount(v)}` },
    { title: '个税', dataIndex: 'tax', key: 'tax', width: 100, render: (v: number) => `¥${formatAmount(v)}` },
    { title: '实发工资', dataIndex: 'netSalary', key: 'netSalary', width: 120, render: (v: number) => <Text type="success" strong>¥{formatAmount(v)}</Text> },
    { title: '发放时间', dataIndex: 'confirmedAt', key: 'confirmedAt', width: 180, render: (v: string) => v ? new Date(v).toLocaleString() : '-' },
  ];

  const tabItems = [
    {
      key: 'employees',
      label: '员工列表',
      children: (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Input
              placeholder="搜索姓名/手机/部门"
              prefix={<SearchOutlined />}
              allowClear
              onChange={(e) => setKeyword(e.target.value)}
              style={{ width: 240 }}
            />
            <Select
              placeholder="状态筛选"
              allowClear
              onChange={setStatusFilter}
              style={{ width: 120 }}
              options={[
                { label: '在职', value: 'active' },
                { label: '离职', value: 'departed' },
              ]}
            />
          </Space>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={loading}
            pagination={{
              current: page,
              total,
              pageSize: 20,
              onChange: (p) => { setPage(p); fetchData(p); },
              showTotal: (t) => `共 ${t} 条`,
            }}
            scroll={{ x: 1100 }}
          />
        </>
      ),
    },
    {
      key: 'unpaid',
      label: <span>待发工资 {unpaidItems.length > 0 && <Tag color="red">{unpaidItems.length}</Tag>}</span>,
      children: (
        <Table
          rowKey={(r) => `${r.employeeId}-${r.year}-${r.month}`}
          columns={unpaidColumns}
          dataSource={unpaidItems}
          loading={unpaidLoading}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        />
      ),
    },
    {
      key: 'records',
      label: '发放记录',
      children: (
        <Table
          rowKey="id"
          columns={salaryColumns}
          dataSource={salaryRecords}
          loading={salaryLoading}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        />
      ),
    },
  ];

  const handleTabChange = (key: string) => {
    if (key === 'unpaid') fetchUnpaid();
    if (key === 'records') fetchSalaryRecords();
  };

  return (
    <PageContainer
      title="员工管理"
      extra={[
        <Button key="calc" icon={<CalculatorOutlined />} onClick={() => { setTaxCalcDefaults({}); setTaxCalcOpen(true); }}>
          个税计算器
        </Button>,
        <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }}>
          新增员工
        </Button>,
      ]}
    >
      <Tabs defaultActiveKey="employees" items={tabItems} onChange={handleTabChange} />

      <EmployeeForm
        open={modalOpen}
        editingEmployee={editing}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        loading={saving}
      />
      <TaxCalcModal
        open={taxCalcOpen}
        onCancel={() => setTaxCalcOpen(false)}
        {...taxCalcDefaults}
      />

      <ContractModal
        open={contractOpen}
        employee={contractEmployee}
        onCancel={() => { setContractOpen(false); setContractEmployee(null); }}
      />

      <SalaryConfirmModal
        open={salaryModalOpen}
        item={payingItem}
        onClose={() => { setSalaryModalOpen(false); setPayingItem(null); }}
        onSuccess={handleSalarySuccess}
      />
    </PageContainer>
  );
};

export default EmployeePage;
