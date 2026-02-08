import type { ThemeConfig } from 'antd';
import { theme } from 'antd';
import { brandColor } from './tokens/colors';
import { borderRadius } from './tokens/borderRadius';
import { typography } from './tokens/typography';

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: brandColor,
    borderRadius: borderRadius.base,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizeBase,
  },
  components: {
    Layout: {
      siderBg: '#001529',
      headerBg: '#fff',
      bodyBg: '#f5f5f5',
    },
    Menu: {
      darkItemBg: '#001529',
    },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: brandColor,
    borderRadius: borderRadius.base,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizeBase,
  },
};
