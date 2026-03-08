import React, { useEffect, useState } from 'react';
import { Button, Table, Space, Input, Select, Popconfirm, Tag, message } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import ContactForm from './components/ContactForm';
import { getContacts, createContact, updateContact, deleteContact } from '@/api/contact';
import type { Contact } from '@/types/contact';

const typeMap: Record<string, { label: string; color: string }> = {
  customer: { label: '客户', color: 'blue' },
  vendor: { label: '供应商', color: 'orange' },
  both: { label: '客户+供应商', color: 'green' },
};

const ContactPage: React.FC = () => {
  const [data, setData] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async (p = page) => {
    setLoading(true);
    try {
      const res = await getContacts({ page: p, pageSize: 20, keyword: keyword || undefined, type: typeFilter });
      setData(res.data?.data ?? []);
      setTotal(res.data?.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(1); setPage(1); }, [keyword, typeFilter]);

  const handleSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (editing) {
        await updateContact(editing.id, values);
        message.success('更新成功');
      } else {
        await createContact(values);
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
      const res = await deleteContact(id);
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

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '类型', dataIndex: 'type', key: 'type',
      render: (t: string) => {
        const m = typeMap[t];
        return m ? <Tag color={m.color}>{m.label}</Tag> : t;
      },
    },
    { title: '联系人', dataIndex: 'contactPerson', key: 'contactPerson' },
    { title: '电话', dataIndex: 'phone', key: 'phone' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '税号', dataIndex: 'taxNumber', key: 'taxNumber' },
    {
      title: '操作', key: 'action',
      render: (_: unknown, record: Contact) => (
        <Space>
          <a onClick={() => { setEditing(record); setModalOpen(true); }}>编辑</a>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="客户/供应商管理"
      extra={[
        <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }}>
          新增
        </Button>,
      ]}
    >
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索名称/联系人/电话"
          prefix={<SearchOutlined />}
          allowClear
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 240 }}
        />
        <Select
          placeholder="类型筛选"
          allowClear
          onChange={setTypeFilter}
          style={{ width: 140 }}
          options={[
            { label: '客户', value: 'customer' },
            { label: '供应商', value: 'vendor' },
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
      />
      <ContactForm
        open={modalOpen}
        editingContact={editing}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        loading={saving}
      />
    </PageContainer>
  );
};

export default ContactPage;
