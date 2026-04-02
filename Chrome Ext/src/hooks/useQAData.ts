import { useMemo } from "react";
import { useDashboardStore } from "../store/useStore";
import { filterIssues } from "../utils/qaCalculations";
import { mapJiraIssuesToQA } from "../utils/jiraToQA";
import { generateAIProjectAnalysis } from "../utils/aiAnalysis";
import {
  calculateProjectHealth,
  calculateAgeingAnalysis,
  calculateTopStories,
  calculateBugLeakage,
  calculateOverburntItems,
  calculateFlowImpact,
} from "../utils/qaCalculations";

// Derive filtered QAIssue[] from live Jira data in the store
const useFilteredIssues = () => {
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const filters = useDashboardStore((s) => s.filters);
  return useMemo(
    () => filterIssues(mapJiraIssuesToQA(rawIssues), filters),
    [rawIssues, filters],
  );
};

export const useQAIssues = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const issues = useFilteredIssues();
  return { data: issues, isLoading: !projectDataLoaded, error: null };
};

export const useProjectHealth = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const recentlyResolved = useDashboardStore((s) => s.recentlyResolved);
  const queryTimeRange = useDashboardStore((s) => s.queryTimeRange);
  const issues = useFilteredIssues();
  const resolvedQA = useMemo(
    () => mapJiraIssuesToQA(recentlyResolved),
    [recentlyResolved],
  );
  const data = useMemo(
    () =>
      projectDataLoaded
        ? calculateProjectHealth(issues, resolvedQA, queryTimeRange)
        : null,
    [projectDataLoaded, issues, queryTimeRange, resolvedQA],
  );
  return { data, isLoading: !projectDataLoaded, error: null };
};

export const useAgeingAnalysis = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const ageingIssues = useDashboardStore((s) => s.ageingIssues);
  const data = useMemo(
    () =>
      projectDataLoaded
        ? calculateAgeingAnalysis(mapJiraIssuesToQA(ageingIssues))
        : null,
    [projectDataLoaded, ageingIssues],
  );
  return { data, isLoading: !projectDataLoaded, error: null };
};

export const useTopStories = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (projectDataLoaded ? calculateTopStories(issues) : []),
    [projectDataLoaded, issues],
  );
  return { data, isLoading: !projectDataLoaded, error: null };
};

export const useBugLeakage = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (projectDataLoaded ? calculateBugLeakage(issues) : []),
    [projectDataLoaded, issues],
  );
  return { data, isLoading: !projectDataLoaded, error: null };
};

export const useOverburntItems = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (projectDataLoaded ? calculateOverburntItems(issues) : []),
    [projectDataLoaded, issues],
  );
  return { data, isLoading: !projectDataLoaded, error: null };
};

export const useFlowImpact = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (projectDataLoaded ? calculateFlowImpact(issues) : []),
    [projectDataLoaded, issues],
  );
  return { data, isLoading: !projectDataLoaded, error: null };
};

export const useAIRecommendations = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const projectKey = useDashboardStore((s) => s.projectKey);
  const projectName = useDashboardStore((s) => s.projectName);
  const sprintName = useDashboardStore((s) => s.sprintName);
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const recentlyResolved = useDashboardStore((s) => s.recentlyResolved);
  const projectMetrics = useDashboardStore((s) => s.projectMetrics);
  const queryTimeRange = useDashboardStore((s) => s.queryTimeRange);
  const data = useMemo(() => {
    if (!projectDataLoaded || !projectMetrics) return null;
    return generateAIProjectAnalysis({
      projectKey,
      projectName,
      sprintName,
      timeRange: queryTimeRange,
      metrics: projectMetrics,
      openIssues: rawIssues,
      recentlyResolved,
    });
  }, [
    projectDataLoaded,
    projectKey,
    projectMetrics,
    projectName,
    queryTimeRange,
    rawIssues,
    recentlyResolved,
    sprintName,
  ]);
  return { data, isLoading: !projectDataLoaded, error: null };
};
