import { useAppStore } from '@/store/useAppStore';
import { lightTheme, darkTheme } from '@/theme';
import type { ThemeConfig } from 'antd';
import { useEffect, useMemo } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export function useThemeMode() {
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  useEffect(() => {
    if (themeMode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        document.documentElement.setAttribute(
          'data-theme',
          mq.matches ? 'dark' : 'light',
        );
      };
      handler();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  const resolvedTheme = useMemo((): ThemeConfig => {
    if (themeMode === 'dark') return darkTheme;
    if (themeMode === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? darkTheme
        : lightTheme;
    }
    return lightTheme;
  }, [themeMode]);

  return { themeMode, setThemeMode, resolvedTheme };
}
