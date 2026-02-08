import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Radio,
  TreeSelect,
  ColorPicker,
  InputNumber,
} from 'antd';
import type { Category, CategoryType } from '@/types/category';
import { useCategoryStore } from '@/store/useCategoryStore';
import {
  CATEGORY_ICON_OPTIONS,
  renderCategoryIcon,
} from '@/utils/categoryIcons';

const PRESET_COLORS = [
  '#f5222d',
  '#fa541c',
  '#fa8c16',
  '#faad14',
  '#fadb14',
  '#a0d911',
  '#52c41a',
  '#13c2c2',
  '#1677ff',
  '#2f54eb',
  '#722ed1',
  '#eb2f96',
];

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  initialValues?: Category;
  parentId?: string;
  defaultType?: CategoryType;
  onSubmit: (values: Partial<Category>) => void;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  open,
  onClose,
  initialValues,
  parentId,
  defaultType,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const isEditing = !!initialValues;

  const typeValue: CategoryType | undefined = Form.useWatch('type', form);

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          type: initialValues.type,
          parentId: initialValues.parentId || undefined,
          icon: initialValues.icon,
          color: initialValues.color,
          sort: initialValues.sort ?? 0,
        });
      } else {
        form.resetFields();
        if (defaultType) {
          form.setFieldsValue({ type: defaultType });
        }
        if (parentId) {
          form.setFieldsValue({ parentId });
        }
      }
    }
  }, [open, initialValues, parentId, defaultType, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const color =
        typeof values.color === 'string'
          ? values.color
          : values.color?.toHexString?.() ?? values.color;
      onSubmit({
        ...values,
        color,
        ...(initialValues ? { id: initialValues.id } : {}),
      });
    } catch {
      // validation failed
    }
  };

  return (
    <Modal
      title={isEditing ? '编辑分类' : '新增分类'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnHidden
      okText="确认"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ type: 'expense' as CategoryType, sort: 0 }}
      >
        <Form.Item
          name="name"
          label="分类名称"
          rules={[{ required: true, message: '请输入分类名称' }]}
        >
          <Input placeholder="请输入分类名称" maxLength={20} />
        </Form.Item>

        <Form.Item
          name="type"
          label="分类类型"
          rules={[{ required: true, message: '请选择分类类型' }]}
        >
          <Radio.Group disabled={isEditing || !!parentId}>
            <Radio value="expense">支出</Radio>
            <Radio value="income">收入</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="parentId" label="父级分类">
          <ParentTreeSelect type={typeValue} parentId={parentId} />
        </Form.Item>

        <Form.Item name="icon" label="图标">
          <IconPicker />
        </Form.Item>

        <Form.Item name="color" label="颜色">
          <ColorPicker
            presets={[
              {
                label: '推荐颜色',
                colors: PRESET_COLORS,
              },
            ]}
          />
        </Form.Item>

        <Form.Item name="sort" label="排序">
          <InputNumber
            min={0}
            max={9999}
            placeholder="请输入排序值"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

/** Grid icon picker as a controlled form component */
interface IconPickerProps {
  value?: string;
  onChange?: (value: string) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 8,
      }}
    >
      {CATEGORY_ICON_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <div
            key={opt.value}
            onClick={() => onChange?.(opt.value)}
            style={{
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              borderRadius: 6,
              cursor: 'pointer',
              border: isSelected
                ? '2px solid #1B65B9'
                : '1px solid #d9d9d9',
              background: isSelected ? '#e6f0fa' : '#fff',
              transition: 'all 0.2s',
            }}
            title={opt.label}
          >
            {renderCategoryIcon(opt.value)}
          </div>
        );
      })}
    </div>
  );
};

/** Separate component for the parent TreeSelect so it can consume categories from the store */
interface ParentTreeSelectProps {
  type?: CategoryType;
  parentId?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
}

const ParentTreeSelect: React.FC<ParentTreeSelectProps> = ({
  type,
  value,
  onChange,
}) => {
  const categories: Category[] = useCategoryStore(
    (state) => state.categories
  );

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  const buildTreeSelectData = (
    items: Category[],
    pid: string | null = null
  ): { title: string; value: string; children?: any[] }[] => {
    return items
      .filter((item) =>
        pid === null
          ? !item.parentId || item.parentId === ''
          : item.parentId === pid
      )
      .map((item) => {
        const children = buildTreeSelectData(items, item.id);
        return {
          title: item.name,
          value: item.id,
          children: children.length > 0 ? children : undefined,
        };
      });
  };

  const treeData = useMemo(
    () => buildTreeSelectData(filteredCategories),
    [filteredCategories]
  );

  return (
    <TreeSelect
      value={value}
      onChange={onChange}
      treeData={treeData}
      placeholder="请选择父级分类（不选则为顶级分类）"
      allowClear
      treeDefaultExpandAll
    />
  );
};

export default CategoryFormModal;
