import { useQuery } from "@tanstack/react-query";
import { MOCK_ISSUES } from "../data/mockData";
import { useDashboardStore } from "../store/useStore";
import { filterIssues } from "../utils/qaCalculations";
import {
  calculateProjectHealth,
  calculateAgeingItems,
  calculateTopStories,
  calculateBugLeakage,
  calculateOverburntItems,
  calculateFlowImpact,
  generateAIRecommendations,
} from "../utils/qaCalculations";

const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Simulate async fetch with mock data
const fetchIssues = async () => {
  await new Promise((r) => setTimeout(r, 400)); // Simulate network delay
  return MOCK_ISSUES;
};

export const useQAIssues = () => {
  const filters = useDashboardStore((s) => s.filters);

  return useQuery({
    queryKey: ["qa-issues", filters],
    queryFn: fetchIssues,
    staleTime: STALE_TIME,
    select: (data) => filterIssues(data, filters),
  });
};

export const useProjectHealth = () => {
  const filters = useDashboardStore((s) => s.filters);

  return useQuery({
    queryKey: ["project-health", filters],
    queryFn: fetchIssues,
    staleTime: STALE_TIME,
    select: (data) => calculateProjectHealth(filterIssues(data, filters)),
  });
};

export const useAgeingAnalysis = () => {
  const filters = useDashboardStore((s) => s.filters);

  return useQuery({
    queryKey: ["ageing", filters],
    queryFn: fetchIssues,
    staleTime: STALE_TIME,
    select: (data) => calculateAgeingItems(filterIssues(data, filters)),
  });
};

export const useTopStories = () => {
  const filters = useDashboardStore((s) => s.filters);

  return useQuery({
    queryKey: ["top-stories", filters],
    queryFn: fetchIssues,
    staleTime: STALE_TIME,
    select: (data) => calculateTopStories(filterIssues(data, filters)),
  });
};

export const useBugLeakage = () => {
  const filters = useDashboardStore((s) => s.filters);

  return useQuery({
    queryKey: ["bug-leakage", filters],
    queryFn: fetchIssues,
    staleTime: STALE_TIME,
    select: (data) => calculateBugLeakage(filterIssues(data, filters)),
  });
};

export const useOverburntItems = () => {
  const filters = useDashboardStore((s) => s.filters);

  return useQuery({
    queryKey: ["overburnt", filters],
    queryFn: fetchIssues,
    staleTime: STALE_TIME,
    select: (data) => calculateOverburntItems(filterIssues(data, filters)),
  });
};

export const useFlowImpact = () => {
  const filters = useDashboardStore((s) => s.filters);

  return useQuery({
    queryKey: ["flow-impact", filters],
    queryFn: fetchIssues,
    staleTime: STALE_TIME,
    select: (data) => calculateFlowImpact(filterIssues(data, filters)),
  });
};

export const useAIRecommendations = () => {
  const filters = useDashboardStore((s) => s.filters);

  return useQuery({
    queryKey: ["ai-recommendations", filters],
    queryFn: fetchIssues,
    staleTime: STALE_TIME,
    select: (data) => {
      const filtered = filterIssues(data, filters);
      const topStories = calculateTopStories(filtered);
      const ageingItems = calculateAgeingItems(filtered);
      return generateAIRecommendations(filtered, topStories, ageingItems);
    },
  });
};
