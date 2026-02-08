import { create } from 'zustand';
import type { Category } from '@/types/category';
import {
  getCategories,
  createCategory,
  updateCategory as apiUpdateCategory,
  deleteCategory as apiDeleteCategory,
} from '@/api/category';

/**
 * 将后端返回的嵌套树形数据递归展开为平铺数组。
 * parentId 以树结构为准（而非原始字段），确保孤儿分类被正确归为根节点。
 */
function flattenTree(nodes: Category[], parentId: string | null = null): Category[] {
  const result: Category[] = [];
  for (const node of nodes) {
    const { children, ...rest } = node;
    result.push({ ...rest, parentId } as Category);
    if (children && children.length > 0) {
      result.push(...flattenTree(children, node.id));
    }
  }
  return result;
}

interface CategoryState {
  categories: Category[];
  loading: boolean;
  fetchCategories: () => Promise<void>;
  addCategory: (c: Omit<Category, 'id' | 'createdAt'>) => Promise<void>;
  updateCategory: (id: string, c: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,
  fetchCategories: async () => {
    set({ loading: true });
    try {
      const res: any = await getCategories();
      const tree: Category[] = res.data ?? [];
      set({ categories: flattenTree(tree), loading: false });
    } catch {
      set({ loading: false });
    }
  },
  addCategory: async (c) => {
    const res: any = await createCategory(c as any);
    if (res.code === 0) {
      const { children: _, ...flat } = res.data;
      set((s) => ({ categories: [...s.categories, flat as Category] }));
    }
  },
  updateCategory: async (id, updates) => {
    const res: any = await apiUpdateCategory(id, updates as any);
    if (res.code === 0) {
      const { children: _, ...flat } = res.data;
      set((s) => ({
        categories: s.categories.map((c) =>
          c.id === id ? (flat as Category) : c
        ),
      }));
    }
  },
  deleteCategory: async (id) => {
    const res: any = await apiDeleteCategory(id);
    if (res.code === 0) {
      set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
    } else {
      throw new Error(res.message || '删除失败');
    }
  },
}));
