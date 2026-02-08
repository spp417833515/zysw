import React, { useMemo, useState } from 'react';
import { Tree, Button, Space, Popconfirm, Typography, Empty, Tooltip } from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { Category, CategoryType } from '@/types/category';
import { renderCategoryIcon } from '@/utils/categoryIcons';

interface CategoryTreeProps {
  type: CategoryType;
  categories: Category[];
  onEdit: (category: Category) => void;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
}

/** 单个树节点标题 — 自行管理 hover 状态，避免整棵树重建 */
const TreeNodeTitle: React.FC<{
  item: Category;
  onEdit: (category: Category) => void;
  onAdd: (parentId: string) => void;
  onDelete: (id: string) => void;
}> = ({ item, onEdit, onAdd, onDelete }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        minWidth: 300,
        borderLeft: `3px solid ${item.color || '#d9d9d9'}`,
        paddingLeft: 8,
        marginLeft: -4,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Space size={8}>
        {item.icon && (
          <span style={{ color: item.color || undefined, fontSize: 16 }}>
            {renderCategoryIcon(item.icon) || item.icon}
          </span>
        )}
        <Typography.Text>{item.name}</Typography.Text>
      </Space>
      <Space
        size={0}
        style={{ visibility: hovered ? 'visible' : 'hidden' }}
      >
        <Tooltip title="编辑">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(item);
            }}
          />
        </Tooltip>
        <Tooltip title="新增子分类">
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onAdd(item.id);
            }}
          />
        </Tooltip>
        <Popconfirm
          title="确认删除"
          description="删除后不可恢复，确认删除该分类吗？"
          onConfirm={(e) => {
            e?.stopPropagation();
            onDelete(item.id);
          }}
          onCancel={(e) => e?.stopPropagation()}
          okText="确认"
          cancelText="取消"
        >
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Tooltip>
        </Popconfirm>
      </Space>
    </div>
  );
};

const CategoryTree: React.FC<CategoryTreeProps> = ({
  type,
  categories,
  onEdit,
  onAdd,
  onDelete,
}) => {
  const buildTreeData = (
    items: Category[],
    parentId: string | null = null
  ): DataNode[] => {
    return items
      .filter(
        (item) =>
          item.type === type &&
          (parentId === null
            ? !item.parentId || item.parentId === ''
            : item.parentId === parentId)
      )
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      .map((item) => {
        const children = buildTreeData(items, item.id);
        return {
          key: item.id,
          title: (
            <TreeNodeTitle
              item={item}
              onEdit={onEdit}
              onAdd={onAdd}
              onDelete={onDelete}
            />
          ),
          children: children.length > 0 ? children : undefined,
        };
      });
  };

  const treeData = useMemo(
    () => buildTreeData(categories),
    [categories, type]
  );

  if (treeData.length === 0) {
    return <Empty description="暂无分类数据" />;
  }

  return (
    <Tree
      treeData={treeData}
      defaultExpandAll
      blockNode
      showLine={{ showLeafIcon: false }}
      selectable={false}
    />
  );
};

export default CategoryTree;
