import { useMemo } from "react";
import { useDashboardStore } from "../store/useStore";
import { filterIssues } from "../utils/qaCalculations";
import { mapJiraIssuesToQA } from "../utils/jiraToQA";
import {
  calculateProjectHealth,
  calculateAgeingItems,
  calculateTopStories,
  calculateBugLeakage,
  calculateOverburntItems,
  calculateFlowImpact,
  generateAIRecommendations,
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
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const issues = useFilteredIssues();
  return { data: issues, isLoading: rawIssues.length === 0, error: null };
};

export const useProjectHealth = () => {
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (rawIssues.length ? calculateProjectHealth(issues) : null),
    [rawIssues.length, issues],
  );
  return { data, isLoading: rawIssues.length === 0, error: null };
};

export const useAgeingAnalysis = () => {
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (rawIssues.length ? calculateAgeingItems(issues) : []),
    [rawIssues.length, issues],
  );
  return { data, isLoading: rawIssues.length === 0, error: null };
};

export const useTopStories = () => {
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (rawIssues.length ? calculateTopStories(issues) : []),
    [rawIssues.length, issues],
  );
  return { data, isLoading: rawIssues.length === 0, error: null };
};

export const useBugLeakage = () => {
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (rawIssues.length ? calculateBugLeakage(issues) : []),
    [rawIssues.length, issues],
  );
  return { data, isLoading: rawIssues.length === 0, error: null };
};

export const useOverburntItems = () => {
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (rawIssues.length ? calculateOverburntItems(issues) : []),
    [rawIssues.length, issues],
  );
  return { data, isLoading: rawIssues.length === 0, error: null };
};

export const useFlowImpact = () => {
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (rawIssues.length ? calculateFlowImpact(issues) : []),
    [rawIssues.length, issues],
  );
  return { data, isLoading: rawIssues.length === 0, error: null };
};

export const useAIRecommendations = () => {
  const rawIssues = useDashboardStore((s) => s.rawIssues);
  const issues = useFilteredIssues();
  const data = useMemo(() => {
    if (!rawIssues.length) return [];
    const topStories = calculateTopStories(issues);
    const ageingItems = calculateAgeingItems(issues);
    return generateAIRecommendations(issues, topStories, ageingItems);
  }, [rawIssues.length, issues]);
  return { data, isLoading: rawIssues.length === 0, error: null };
};
