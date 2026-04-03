import React, { useEffect } from "react";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDashboardStore } from "../store/useStore";
import { getAntdTheme, getThemeById, applyTheme } from "../themes";
import QALayout from "../components/Layout/QALayout";
import ProjectHealth from "../components/QA/ProjectHealth";
import AgeingAnalysis from "../components/QA/AgeingAnalysis";
import TopStories from "../components/QA/TopStories";
import BugLeakage from "../components/QA/BugLeakage";
import OverburntItems from "../components/QA/OverburntItems";
import FlowImpact from "../components/QA/FlowImpact";
import AIRecommendations from "../components/QA/AIRecommendations";
import JiraExplorer from "../components/QA/JiraExplorer";
import EarlyCompletions from "../components/QA/EarlyCompletions";
import CodeIntelligence from "../components/QA/CodeIntelligence";
import type { AuthMode, JiraUser } from "../types";
import type { QueryTimeRange } from "../utils/queryTimeRange";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const SECTION_MAP: Record<string, React.ReactNode> = {
  health: <ProjectHealth />,
  ageing: <AgeingAnalysis />,
  "top-stories": <TopStories />,
  leakage: <BugLeakage />,
  overburnt: <OverburntItems />,
  flow: <FlowImpact />,
  "early-completions": <EarlyCompletions />,
  "code-intel": <CodeIntelligence />,
  ai: <AIRecommendations />,
  explorer: <JiraExplorer />,
};

interface QADashboardInnerProps {
  onBack?: () => void;
  user?: JiraUser | null;
  authMode?: AuthMode;
  projects?: import("../types").JiraProject[];
  selectedProjectKey?: string;
  onLoadProject?: (key: string, name: string) => void;
  onRefresh?: () => Promise<void> | void;
  onTimeRangeChange?: (timeRange: QueryTimeRange) => Promise<void> | void;
}

const QADashboardInner: React.FC<QADashboardInnerProps> = ({
  onBack,
  user,
  authMode,
  projects,
  selectedProjectKey,
  onLoadProject,
  onRefresh,
  onTimeRangeChange,
}) => {
  const { themeId, activeSection } = useDashboardStore();
  const themeConfig = getThemeById(themeId);
  const antdTheme = getAntdTheme(themeConfig);

  // Apply CSS vars on mount and theme change
  useEffect(() => {
    applyTheme(themeConfig);
  }, [themeConfig]);

  return (
    <ConfigProvider theme={antdTheme}>
      <QALayout
        onBack={onBack}
        user={user}
        authMode={authMode}
        projects={projects}
        selectedProjectKey={selectedProjectKey}
        onProjectChange={onLoadProject}
        onRefresh={onRefresh}
        onTimeRangeChange={onTimeRangeChange}
      >
        {SECTION_MAP[activeSection] ?? <ProjectHealth />}
      </QALayout>
    </ConfigProvider>
  );
};

interface QADashboardProps {
  onBack?: () => void;
  user?: JiraUser | null;
  authMode?: AuthMode;
  projects?: import("../types").JiraProject[];
  selectedProjectKey?: string;
  onLoadProject?: (key: string, name: string) => void;
  onRefresh?: () => Promise<void> | void;
  onTimeRangeChange?: (timeRange: QueryTimeRange) => Promise<void> | void;
}

const QADashboard: React.FC<QADashboardProps> = ({
  onBack,
  user,
  authMode,
  projects,
  selectedProjectKey,
  onLoadProject,
  onRefresh,
  onTimeRangeChange,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <QADashboardInner
        onBack={onBack}
        user={user}
        authMode={authMode}
        projects={projects}
        selectedProjectKey={selectedProjectKey}
        onLoadProject={onLoadProject}
        onRefresh={onRefresh}
        onTimeRangeChange={onTimeRangeChange}
      />
    </QueryClientProvider>
  );
};

export default QADashboard;
