import { create } from "zustand";
import type { DashboardFilters, Priority } from "../types/qa";
import type { Metrics, SnapshotMetrics, AuthMode, JiraIssue } from "../types";
import { QA_THEMES, applyTheme } from "../themes";
import type { QueryTimeRange } from "../utils/queryTimeRange";

interface DashboardStore {
  themeId: string;
  activeSection: string;
  queryTimeRange: QueryTimeRange;
  filters: DashboardFilters;
  projectKey: string;
  projectName: string;
  projectMetrics: Metrics | null;
  prevProjectMetrics: SnapshotMetrics | null;
  sprintName: string;
  sprintGoal: string;
  jiraUrl: string;
  authToken: string | null;
  authMode: AuthMode;
  rawIssues: JiraIssue[];
  recentlyResolved: JiraIssue[];
  ageingIssues: JiraIssue[];
  overburntIssues: JiraIssue[];
  projectDataLoaded: boolean;
  setRawIssues: (issues: JiraIssue[]) => void;
  setRecentlyResolved: (issues: JiraIssue[]) => void;
  setAgeingIssues: (issues: JiraIssue[]) => void;
  setOverburntIssues: (issues: JiraIssue[]) => void;
  setQueryTimeRange: (timeRange: QueryTimeRange) => void;
  setProjectDataLoaded: (loaded: boolean) => void;
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
  setSprintInfo: (sprintName: string, sprintGoal: string) => void;
  setJiraConfig: (url: string, token: string | null, mode: AuthMode) => void;
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
  queryTimeRange: "weekly",
  filters: defaultFilters,
  projectKey: "",
  projectName: "",
  projectMetrics: null,
  prevProjectMetrics: null,
  sprintName: "",
  sprintGoal: "",
  jiraUrl: "",
  authToken: null,
  authMode: "none",
  rawIssues: [],
  recentlyResolved: [],
  ageingIssues: [],
  overburntIssues: [],
  projectDataLoaded: false,
  setRawIssues: (issues) => set({ rawIssues: issues }),
  setRecentlyResolved: (issues) => set({ recentlyResolved: issues }),
  setAgeingIssues: (issues) => set({ ageingIssues: issues }),
  setOverburntIssues: (issues) => set({ overburntIssues: issues }),
  setQueryTimeRange: (queryTimeRange) => set({ queryTimeRange }),
  setProjectDataLoaded: (projectDataLoaded) => set({ projectDataLoaded }),

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

  setSprintInfo: (sprintName, sprintGoal) => set({ sprintName, sprintGoal }),

  setJiraConfig: (url, token, mode) =>
    set({ jiraUrl: url, authToken: token, authMode: mode }),
}));
