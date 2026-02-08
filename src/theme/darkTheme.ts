import type { ThemeConfig } from 'antd';
import { theme } from 'antd';
import { brandColor } from './tokens/colors';
import { borderRadius } from './tokens/borderRadius';
import { typography } from './tokens/typography';

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: brandColor,
    borderRadius: borderRadius.base,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizeBase,
  },
};
