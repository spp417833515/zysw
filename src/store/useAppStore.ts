import { create } from 'zustand';
import type { ThemeMode } from '@/theme/useThemeMode';

interface AppState {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  currentBookId: string;
  setThemeMode: (mode: ThemeMode) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentBookId: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  themeMode: 'light',
  sidebarCollapsed: false,
  currentBookId: 'default',
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCurrentBookId: (id) => set({ currentBookId: id }),
}));
