export interface JiraIssue {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  updated: string;
  created: string;
  priority: string;
  issueType: string;
  project: string;
  projectKey: string;
  resolution: string;
  labels: string[];
  assignee: string;
  components: string[];
  reporter?: string;
  timeEstimate?: number;
  timeSpent?: number;
  resolved?: string | null;
  storyPoints?: number | null;
  epic?: string | null;
  epicName?: string | null;
  sprint?: string;
  dueDate?: string | null;
  // Live fields from changelog + comment (fetched via expand=changelog)
  description?: string;
  commentsCount?: number;
  statusChanges?: Array<{ from: string; to: string; date: string; by: string }>;
  reopenCount?: number;
  assigneeChanges?: number;
  workratio?: number | null;
  worklogs?: Array<{
    author: string;
    timeSpentSeconds: number;
    started: string;
  }>;
}

export interface JiraUser {
  displayName: string;
  emailAddress: string;
  avatarUrl: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  avatarUrl: string;
}

export interface Metrics {
  totalOpen: number;
  todayNew: number;
  todayResolved: number;
  reopened: number;
  mustFix: number;
  blocked: number;
  statusMap: Record<string, number>;
  priorityMap: Record<string, number>;
  typeMap: Record<string, number>;
  todayPriorityMap: Record<string, number>;
  mustFixStatusMap: Record<string, number>;
  mustFixIssues: JiraIssue[];
  bugCount: number;
  todayCreated: JiraIssue[];
  todayResolvedIssues: JiraIssue[];
  openIssues: JiraIssue[];
  componentOpenMap: Record<string, number>;
  componentBlockedMap: Record<string, number>;
}

export interface SnapshotMetrics {
  totalOpen: number;
  todayNew: number;
  todayResolved: number;
  reopened: number;
  mustFix: number;
  blocked: number;
}

export interface ManualEntry {
  id: string;
  jiraId: string;
  title: string;
  qaStatus: string;
  devOwner: string;
  qaOwner: string;
  openBugs: number;
  overallBugs: number;
  unitLevel: number;
  rejected: number;
}

export interface QANote {
  id: string;
  text: string;
}

export interface HealthReason {
  text: string;
  type: "danger" | "warning" | "success" | "info";
}

export interface HealthResult {
  health: "green" | "yellow" | "red";
  reasons: HealthReason[];
  score: number;
}

export type Theme = "dark" | "light" | "neon";
export type AuthMode = "none" | "session" | "token";
export type RAGStatus = "green" | "yellow" | "red" | null;
export type ToastType = "success" | "error" | "info" | "warning";
