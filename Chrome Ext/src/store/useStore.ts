import { create } from "zustand";
import type { DashboardFilters, Priority } from "../types/qa";
import type { Metrics, SnapshotMetrics, RAGStatus } from "../types";
import { QA_THEMES, applyTheme } from "../themes";

interface DashboardStore {
  themeId: string;
  activeSection: string;
  filters: DashboardFilters;
  projectKey: string;
  projectName: string;
  projectMetrics: Metrics | null;
  prevProjectMetrics: SnapshotMetrics | null;
  ragOverride: RAGStatus;
  setTheme: (id: string) => void;
  setActiveSection: (section: string) => void;
  setFilters: (filters: Partial<DashboardFilters>) => void;
  resetFilters: () => void;
  setProjectData: (
    key: string,
    name: string,
    metrics: Metrics,
    prev: SnapshotMetrics | null,
  ) => void;
  setRagOverride: (rag: RAGStatus) => void;
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
  projectKey: "",
  projectName: "",
  projectMetrics: null,
  prevProjectMetrics: null,
  ragOverride: null,

  setTheme: (id) => {
    const theme = QA_THEMES.find((t) => t.id === id);
    if (theme) applyTheme(theme);
    set({ themeId: id });
  },

  setActiveSection: (section) => set({ activeSection: section }),

  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),

  resetFilters: () => set({ filters: defaultFilters }),

  setProjectData: (key, name, metrics, prev) =>
    set({
      projectKey: key,
      projectName: name,
      projectMetrics: metrics,
      prevProjectMetrics: prev,
    }),

  setRagOverride: (rag) => set({ ragOverride: rag }),
}));
