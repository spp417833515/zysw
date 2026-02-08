import React, { useEffect, useMemo } from 'react';
import { TreeSelect } from 'antd';
import { useCategoryStore } from '@/store/useCategoryStore';
import type { CategoryType } from '@/types/category';
import { renderCategoryIcon } from '@/utils/categoryIcons';

interface CategorySelectProps {
  value?: string;
  onChange?: (value: string) => void;
  type?: CategoryType;
  placeholder?: string;
  style?: React.CSSProperties;
}

const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  type,
  placeholder = '请选择分类',
  style,
}) => {
  const categories = useCategoryStore((s) => s.categories);
  const fetchCategories = useCategoryStore((s) => s.fetchCategories);

  // 确保分类数据已加载（用户可能直接进入交易页面而未访问分类管理）
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length, fetchCategories]);

  const treeData = useMemo(() => {
    const filtered = type ? categories.filter((c) => c.type === type) : categories;
    const roots = filtered.filter((c) => !c.parentId);
    return roots.map((root) => ({
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {root.icon && (
            <span style={{ color: root.color || undefined, fontSize: 14 }}>
              {renderCategoryIcon(root.icon)}
            </span>
          )}
          {root.name}
        </span>
      ),
      value: root.id,
      key: root.id,
      children: filtered
        .filter((c) => c.parentId === root.id)
        .map((child) => ({
          title: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {child.icon && (
                <span style={{ color: child.color || undefined, fontSize: 14 }}>
                  {renderCategoryIcon(child.icon)}
                </span>
              )}
              {child.name}
            </span>
          ),
          value: child.id,
          key: child.id,
        })),
    }));
  }, [categories, type]);

  return (
    <TreeSelect
      value={value}
      onChange={onChange}
      treeData={treeData}
      placeholder={placeholder}
      style={{ width: '100%', ...style }}
      treeDefaultExpandAll
      allowClear
    />
  );
};

export default CategorySelect;
