export type Priority = "Blocker" | "Critical" | "High" | "Medium" | "Low";
export type IssueStatus =
  | "Open"
  | "In Progress"
  | "In Review"
  | "Resolved"
  | "Closed"
  | "Reopened";
export type Environment =
  | "Production"
  | "Staging"
  | "NPR"
  | "Non-Prod"
  | "Development";
export type AgeingStatus = "FRESH" | "AT_RISK" | "AGED";
export type HealthStatus = "GREEN" | "RED";
export type RiskLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export interface StatusChange {
  from: IssueStatus;
  to: IssueStatus;
  date: string;
  by: string;
}

export interface QAIssue {
  id: string;
  key: string;
  summary: string;
  description: string;
  priority: Priority;
  status: IssueStatus;
  assignee: string;
  reporter: string;
  created: string;
  updated: string;
  resolved?: string;
  module: string;
  environment: Environment;
  storyKey?: string;
  storyTitle?: string;
  labels: string[];
  timeEstimate: number;
  timeLogged: number;
  commentsCount: number;
  statusChanges: StatusChange[];
  reopenCount: number;
  assigneeChanges: number;
  slaHours: number;
}

export interface TrendPoint {
  date: string;
  created: number;
  resolved: number;
  open: number;
}

export interface SeverityBucket {
  name: string;
  value: number;
  color: string;
}

export interface ProjectHealthResult {
  status: HealthStatus;
  score: number;
  summary: string;
  keyDrivers: string[];
  totalIssues: number;
  criticalBlockerCount: number;
  highSeverityCount: number;
  slaBreachCount: number;
  reopenedCount: number;
  defectTrend: TrendPoint[];
  severityDistribution: SeverityBucket[];
  closureRate: number;
  creationRate: number;
}

export interface AgeingItem {
  issue: QAIssue;
  hoursElapsed: number;
  slaHours: number;
  ageingStatus: AgeingStatus;
  isEscalated: boolean;
  riskScore: number;
  slaBreach: boolean;
}

export interface AgeingBucket {
  status: AgeingStatus;
  count: number;
  color: string;
}

export interface TopStory {
  storyKey: string;
  storyTitle: string;
  bugCount: number;
  bugs: QAIssue[];
  criticalCount: number;
  highCount: number;
}

export interface BugLeakageItem {
  issue: QAIssue;
  leakageType: string;
  detectedIn: string;
}

export interface OverburntItem {
  issue: QAIssue;
  overburntReasons: string[];
  riskLevel: "High" | "Medium";
  overburntScore: number;
}

export interface FlowImpactItem {
  issue: QAIssue;
  keywords: string[];
  domain: string;
  sprintRisk: RiskLevel;
  releaseImpact: RiskLevel;
  overallRisk: RiskLevel;
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  bugCount: number;
  storyName: string;
  impactPercent: number;
  priority: "Critical" | "High" | "Medium";
  action: string;
  category: string;
}

export interface DashboardFilters {
  dateRange: [string, string] | null;
  severity: Priority[];
  assignee: string[];
  environment: string[];
  module: string[];
}

export interface ThemeConfig {
  id: string;
  name: string;
  icon: string;
  isDark: boolean;
  primaryColor: string;
  cssVars: Record<string, string>;
}
