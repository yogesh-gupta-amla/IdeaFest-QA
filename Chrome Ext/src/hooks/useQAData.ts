import { useMemo, useState, useEffect } from "react";
import { useDashboardStore } from "../store/useStore";
import { filterIssues } from "../utils/qaCalculations";
import { mapJiraIssuesToQA } from "../utils/jiraToQA";
import { generateAIProjectAnalysis } from "../utils/aiAnalysis";
import { callGemini } from "../services/geminiService";
import { buildGeminiPromptFromAnalysis } from "../utils/geminiPrompt";
import {
  calculateProjectHealth,
  calculateAgeingAnalysis,
  calculateTopStories,
  calculateBugLeakage,
  calculateOverburntItems,
  calculateOverburntAnalysis,
  calculateFlowImpact,
  calculateEarlyCompletions,
  calculateCodeIntelligence,
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
  const ageingIssues = useDashboardStore((s) => s.ageingIssues);
  const activeIssues = useDashboardStore((s) => s.activeIssues);
  const queryTimeRange = useDashboardStore((s) => s.queryTimeRange);
  const issues = useFilteredIssues();
  const resolvedQA = useMemo(
    () => mapJiraIssuesToQA(recentlyResolved),
    [recentlyResolved],
  );
  const ageingQA = useMemo(
    () => mapJiraIssuesToQA(ageingIssues),
    [ageingIssues],
  );
  const activeQA = useMemo(
    () => mapJiraIssuesToQA(activeIssues),
    [activeIssues],
  );
  const data = useMemo(
    () =>
      projectDataLoaded
        ? calculateProjectHealth(
            issues,
            resolvedQA,
            queryTimeRange,
            undefined,
            ageingQA,
            activeQA,
          )
        : null,
    [projectDataLoaded, issues, queryTimeRange, resolvedQA, ageingQA, activeQA],
  );
  return { data, isLoading: !projectDataLoaded, error: null };
};

export const useAgeingAnalysis = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const ageingIssues = useDashboardStore((s) => s.ageingIssues);
  const ageingOver48Issues = useDashboardStore((s) => s.ageingOver48Issues);
  const ageingFreshIssues = useDashboardStore((s) => s.ageingFreshIssues);
  const data = useMemo(
    () =>
      projectDataLoaded
        ? calculateAgeingAnalysis(
            mapJiraIssuesToQA(ageingIssues),
            mapJiraIssuesToQA(ageingOver48Issues),
            mapJiraIssuesToQA(ageingFreshIssues),
          )
        : null,
    [projectDataLoaded, ageingIssues, ageingOver48Issues, ageingFreshIssues],
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
  const overburntIssues = useDashboardStore((s) => s.overburntIssues);
  const issues = useFilteredIssues();
  const data = useMemo(
    () => (projectDataLoaded ? calculateOverburntItems(issues) : []),
    [projectDataLoaded, issues],
  );
  const analysis = useMemo(
    () =>
      projectDataLoaded
        ? calculateOverburntAnalysis(mapJiraIssuesToQA(overburntIssues))
        : null,
    [projectDataLoaded, overburntIssues],
  );
  return { data, analysis, isLoading: !projectDataLoaded, error: null };
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

export const useEarlyCompletions = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const earlyCompletionIssues = useDashboardStore(
    (s) => s.earlyCompletionIssues,
  );
  const data = useMemo(
    () =>
      projectDataLoaded
        ? calculateEarlyCompletions(mapJiraIssuesToQA(earlyCompletionIssues))
        : null,
    [projectDataLoaded, earlyCompletionIssues],
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

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!projectDataLoaded);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    if (!projectDataLoaded || !projectMetrics) {
      setData(null);
      setIsLoading(!projectDataLoaded);
      setError(null);
      return;
    }

    (async () => {
      setIsLoading(true);
      setError(null);

      const base = generateAIProjectAnalysis({
        projectKey,
        projectName,
        sprintName,
        timeRange: queryTimeRange,
        metrics: projectMetrics,
        openIssues: rawIssues,
        recentlyResolved,
      });

      if (!cancelled) setData(base);

      try {
        const prompt = buildGeminiPromptFromAnalysis(base);
        const geminiRaw = await callGemini(prompt, {
          model: "gemini-flash-latest",
          // do not pass a too-short timeout from here; let service default be used
          timeoutMs: 60000,
        });

        // tolerant JSON extraction: model may return text that contains JSON with
        // surrounding whitespace or extra characters. Try to extract a JSON blob.
        const tryParseJsonFromText = (text: string): any | null => {
          if (!text) return null;
          try {
            return JSON.parse(text);
          } catch {}
          const first = text.indexOf("{");
          const last = text.lastIndexOf("}");
          if (first !== -1 && last !== -1 && last > first) {
            const possible = text.slice(first, last + 1);
            try {
              return JSON.parse(possible);
            } catch {}
          }
          const fArr = text.indexOf("[");
          const lArr = text.lastIndexOf("]");
          if (fArr !== -1 && lArr !== -1 && lArr > fArr) {
            const possibleArr = text.slice(fArr, lArr + 1);
            try {
              return JSON.parse(possibleArr);
            } catch {}
          }
          return null;
        };

        let parsed: any = null;
        if (typeof geminiRaw === "string")
          parsed = tryParseJsonFromText(geminiRaw);
        else parsed = geminiRaw;

        const enriched = {
          ...base,
          executiveSummary: parsed?.summary ?? base.executiveSummary,
          aiRecommendation: {
            ...base.aiRecommendation,
            headline: parsed?.headline ?? base.aiRecommendation.headline,
          },
          _aiGeneratedRaw: geminiRaw,
          _aiGeneratedParsed: parsed,
        };

        if (!cancelled) {
          setData(enriched);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          // If we have a deterministic base analysis, prefer to keep showing it
          // and avoid surfacing a blocking error to the UI. Log the enrichment
          // failure for diagnostics. If base was not produced, surface the error.
          if (base) {
            // store debug info but don't mark as fatal
            // eslint-disable-next-line no-console
            console.warn("Gemini enrichment failed:", e);
            // attach raw error to data for optional UI debug without marking error
            if (!cancelled) setData({ ...base, _aiEnrichError: String(e) });
          } else {
            setError(e as any);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    projectDataLoaded,
    projectKey,
    projectName,
    sprintName,
    rawIssues,
    recentlyResolved,
    projectMetrics,
    queryTimeRange,
  ]);

  return { data, isLoading, error };
};

export const useCodeIntelligence = () => {
  const projectDataLoaded = useDashboardStore((s) => s.projectDataLoaded);
  const codeIntelIssues = useDashboardStore((s) => s.codeIntelIssues);
  const data = useMemo(
    () =>
      projectDataLoaded ? calculateCodeIntelligence(codeIntelIssues) : null,
    [projectDataLoaded, codeIntelIssues],
  );
  return { data, isLoading: !projectDataLoaded, error: null };
};
