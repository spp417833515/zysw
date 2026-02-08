import React, { useEffect, useState, useCallback } from 'react';
import { Button, Tabs, Card, Spin, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PageContainer from '@/components/PageContainer';
import CategoryTree from './components/CategoryTree';
import CategoryFormModal from './components/CategoryFormModal';
import { useCategoryStore } from '@/store/useCategoryStore';
import type { Category, CategoryType } from '@/types/category';

const CategoryPage: React.FC = () => {
  const {
    categories,
    loading,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategoryStore();

  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(
    undefined
  );
  const [addParentId, setAddParentId] = useState<string | undefined>(undefined);
  const [defaultType, setDefaultType] = useState<CategoryType | undefined>(undefined);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAdd = useCallback(() => {
    setEditingCategory(undefined);
    setAddParentId(undefined);
    setDefaultType(activeTab);
    setModalOpen(true);
  }, [activeTab]);

  const handleAddChild = useCallback(
    (parentId: string) => {
      const parent = categories.find((c) => c.id === parentId);
      setEditingCategory(undefined);
      setAddParentId(parentId);
      setDefaultType(parent?.type);
      setModalOpen(true);
    },
    [categories]
  );

  const handleEdit = useCallback((category: Category) => {
    setEditingCategory(category);
    setAddParentId(undefined);
    setDefaultType(undefined);
    setModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      const hasChildren = categories.some((c) => c.parentId === id);
      if (hasChildren) {
        message.warning('该分类下有子分类，请先删除子分类');
        return;
      }
      try {
        await deleteCategory(id);
        message.success('删除成功');
      } catch (e: any) {
        message.error(e?.message || '删除失败');
      }
    },
    [deleteCategory, categories]
  );

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingCategory(undefined);
    setAddParentId(undefined);
    setDefaultType(undefined);
  }, []);

  const handleSubmit = useCallback(
    async (values: Partial<Category>) => {
      try {
        if (editingCategory) {
          await updateCategory(editingCategory.id, values);
          message.success('编辑成功');
        } else {
          await addCategory(values as Omit<Category, 'id'>);
          message.success('新增成功');
        }
        handleModalClose();
      } catch {
        message.error(editingCategory ? '编辑失败' : '新增失败');
      }
    },
    [editingCategory, updateCategory, addCategory, handleModalClose]
  );

  const expenseCount = categories.filter((c) => c.type === 'expense').length;
  const incomeCount = categories.filter((c) => c.type === 'income').length;

  const tabItems = [
    {
      key: 'expense' as CategoryType,
      label: `支出分类 (${expenseCount})`,
      children: (
        <CategoryTree
          type="expense"
          categories={categories}
          onEdit={handleEdit}
          onAdd={handleAddChild}
          onDelete={handleDelete}
        />
      ),
    },
    {
      key: 'income' as CategoryType,
      label: `收入分类 (${incomeCount})`,
      children: (
        <CategoryTree
          type="income"
          categories={categories}
          onEdit={handleEdit}
          onAdd={handleAddChild}
          onDelete={handleDelete}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="分类管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增分类
        </Button>
      }
    >
      <Spin spinning={loading}>
        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as CategoryType)}
            items={tabItems}
          />
        </Card>
      </Spin>

      <CategoryFormModal
        open={modalOpen}
        onClose={handleModalClose}
        initialValues={editingCategory}
        parentId={addParentId}
        defaultType={defaultType}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
};

export default CategoryPage;
