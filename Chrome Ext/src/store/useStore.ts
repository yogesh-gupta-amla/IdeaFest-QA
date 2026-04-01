import { create } from "zustand";
import type { DashboardFilters, Priority } from "../types/qa";
import { QA_THEMES, applyTheme } from "../themes";

interface DashboardStore {
  themeId: string;
  activeSection: string;
  filters: DashboardFilters;
  setTheme: (id: string) => void;
  setActiveSection: (section: string) => void;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: DashboardFilters = {
  dateRange: null,
  severity: [] as Priority[],
  assignee: [],
  environment: [],
  module: [],
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  themeId: "dark-pro",
  activeSection: "health",
  filters: defaultFilters,

  setTheme: (id) => {
    const theme = QA_THEMES.find((t) => t.id === id);
    if (theme) applyTheme(theme);
    set({ themeId: id });
  },

  setActiveSection: (section) => set({ activeSection: section }),

  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),

  resetFilters: () => set({ filters: defaultFilters }),
}));
