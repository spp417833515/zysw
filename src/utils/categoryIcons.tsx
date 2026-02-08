import React from 'react';
import {
  ShopOutlined,
  TeamOutlined,
  HomeOutlined,
  CarOutlined,
  CoffeeOutlined,
  BookOutlined,
  GiftOutlined,
  PhoneOutlined,
  HeartOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  WalletOutlined,
  ShoppingOutlined,
  CustomerServiceOutlined,
  ToolOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons';

export const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ style?: React.CSSProperties }>> = {
  ShopOutlined,
  TeamOutlined,
  HomeOutlined,
  CarOutlined,
  CoffeeOutlined,
  BookOutlined,
  GiftOutlined,
  PhoneOutlined,
  HeartOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  WalletOutlined,
  ShoppingOutlined,
  CustomerServiceOutlined,
  ToolOutlined,
  MedicineBoxOutlined,
};

export const CATEGORY_ICON_OPTIONS = Object.keys(CATEGORY_ICON_MAP).map(
  (key) => ({
    label: key,
    value: key,
  })
);

export function renderCategoryIcon(
  iconName?: string | null,
  props?: React.CSSProperties
): React.ReactNode {
  if (!iconName) return null;
  const IconComp = CATEGORY_ICON_MAP[iconName];
  if (!IconComp) return null;
  return <IconComp style={props} />;
}
