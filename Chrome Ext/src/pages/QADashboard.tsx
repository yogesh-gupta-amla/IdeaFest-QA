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
import type { AuthMode, JiraUser } from "../types";

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
  ai: <AIRecommendations />,
};

interface QADashboardInnerProps {
  onBack?: () => void;
  configPanel?: React.ReactNode;
  user?: JiraUser | null;
  authMode?: AuthMode;
}

const QADashboardInner: React.FC<QADashboardInnerProps> = ({
  onBack,
  configPanel,
  user,
  authMode,
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
        configPanel={configPanel}
        user={user}
        authMode={authMode}
      >
        {SECTION_MAP[activeSection] ?? <ProjectHealth />}
      </QALayout>
    </ConfigProvider>
  );
};

interface QADashboardProps {
  onBack?: () => void;
  configPanel?: React.ReactNode;
  user?: JiraUser | null;
  authMode?: AuthMode;
}

const QADashboard: React.FC<QADashboardProps> = ({
  onBack,
  configPanel,
  user,
  authMode,
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <QADashboardInner
        onBack={onBack}
        configPanel={configPanel}
        user={user}
        authMode={authMode}
      />
    </QueryClientProvider>
  );
};

export default QADashboard;
