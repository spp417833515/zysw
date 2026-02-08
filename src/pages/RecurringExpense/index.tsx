import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Table,
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Popconfirm,
  Switch,
  message,
} from 'antd';
import {
  PlusOutlined,
  ScheduleOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import AmountText from '@/components/AmountText';
import { useRecurringExpenseStore } from '@/store/useRecurringExpenseStore';
import { formatDate } from '@/utils/format';
import type { RecurringExpense } from '@/types/recurringExpense';
import RecurringExpenseFormModal from './components/RecurringExpenseFormModal';

const RecurringExpensePage: React.FC = () => {
  const { items, loading, fetchItems, addItem, updateItem, deleteItem } =
    useRecurringExpenseStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | undefined>(undefined);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const stats = useMemo(() => {
    const enabled = items.filter((i) => i.enabled);
    const totalMonthly = enabled.reduce((sum, i) => sum + i.amount, 0);
    return {
      total: items.length,
      enabled: enabled.length,
      totalMonthly,
    };
  }, [items]);

  const handleAdd = useCallback(() => {
    setEditing(undefined);
    setModalOpen(true);
  }, []);

  const handleEdit = useCallback((record: RecurringExpense) => {
    setEditing(record);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteItem(id);
        message.success('删除成功');
      } catch {
        message.error('删除失败');
      }
    },
    [deleteItem],
  );

  const handleToggle = useCallback(
    async (record: RecurringExpense, enabled: boolean) => {
      try {
        await updateItem(record.id, { enabled });
        message.success(enabled ? '已启用' : '已停用');
      } catch {
        message.error('操作失败');
      }
    },
    [updateItem],
  );

  const handleSubmit = useCallback(
    async (values: Partial<RecurringExpense>) => {
      try {
        if (editing) {
          await updateItem(editing.id, values);
          message.success('编辑成功');
        } else {
          await addItem(values);
          message.success('新增成功');
        }
        setModalOpen(false);
        setEditing(undefined);
      } catch {
        message.error(editing ? '编辑失败' : '新增失败');
      }
    },
    [editing, updateItem, addItem],
  );

  const getEndInfo = (record: RecurringExpense) => {
    if (record.endDate) return `截止 ${formatDate(record.endDate)}`;
    if (record.durationMonths) return `持续 ${record.durationMonths} 个月`;
    return '长期';
  };

  const isExpired = (record: RecurringExpense) => {
    if (!record.endDate && !record.durationMonths) return false;
    if (record.endDate) {
      return new Date(record.endDate) < new Date();
    }
    if (record.durationMonths) {
      const start = new Date(record.startDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + record.durationMonths);
      return end < new Date();
    }
    return false;
  };

  const columns = [
    {
      title: '开销内容',
      dataIndex: 'name',
      key: 'name',
      width: 180,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (v: number) => <AmountText value={v} type="expense" />,
    },
    {
      title: '每月几号',
      dataIndex: 'dayOfMonth',
      key: 'dayOfMonth',
      width: 100,
      render: (v: number) => `每月 ${v} 号`,
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      key: 'categoryName',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '账户',
      dataIndex: 'accountName',
      key: 'accountName',
      width: 100,
      render: (v: string) => v || '-',
    },
    {
      title: '开始日期',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 120,
      render: (v: string) => formatDate(v),
    },
    {
      title: '截止方式',
      key: 'endInfo',
      width: 150,
      render: (_: unknown, record: RecurringExpense) => {
        const expired = isExpired(record);
        return (
          <Space>
            <span>{getEndInfo(record)}</span>
            {expired && <Tag color="red">已到期</Tag>}
          </Space>
        );
      },
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: '状态',
      key: 'enabled',
      width: 80,
      render: (_: unknown, record: RecurringExpense) => (
        <Switch
          checked={record.enabled}
          size="small"
          onChange={(checked) => handleToggle(record, checked)}
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: RecurringExpense) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后不可恢复，确认删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="月固定开销"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增固定开销
        </Button>
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="固定开销项"
              value={stats.total}
              suffix="项"
              prefix={<ScheduleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="启用中"
              value={stats.enabled}
              suffix="项"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="每月合计"
              value={stats.totalMonthly.toFixed(2)}
              prefix="¥"
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={loading}
          pagination={{ pageSize: 10 }}
          size="middle"
          scroll={{ x: 1200 }}
        />
      </Card>

      <RecurringExpenseFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(undefined);
        }}
        initialValues={editing}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
};

export default RecurringExpensePage;
