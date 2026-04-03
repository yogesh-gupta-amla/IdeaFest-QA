import type { JiraIssue, JiraUser, JiraProject } from "../types";
import { apiLogger } from "../utils/apiLogger";

function sendMessage(msg: object): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(
          response || { success: false, error: "No response from background" },
        );
      }
    });
  });
}

function authHeaders(authToken: string | null): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (authToken) h["Authorization"] = `Basic ${authToken}`;
  return h;
}

const DASHBOARD_FIELDS =
  "summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components,reporter,timeoriginalestimate,aggregatetimespent,resolutiondate,parent,customfield_10016,customfield_10020,duedate,description,comment,worklog,workratio";

const EXPLORER_FIELDS =
  "summary,status,issuetype,priority,assignee,reporter,project,components,labels,created,updated,resolutiondate,duedate,resolution,fixVersions,customfield_10016,customfield_10020,aggregatetimespent,timeoriginalestimate,parent,subtasks";

/**
 * Fetch ALL pages of Jira issues for a JQL query using pagination.
 * Loops until `isLast === true`. Calls onProgress after each page.
 */
export async function fetchAllPages(
  baseUrl: string,
  jql: string,
  authToken: string | null,
  onProgress?: (fetched: number, total: number, label: string) => void,
  label = "issues",
  pageSize = 100,
): Promise<{
  success: boolean;
  issues?: JiraIssue[];
  total?: number;
  error?: string;
}> {
  const allIssues: JiraIssue[] = [];
  let startAt = 0;
  let isLast = false;
  let total = 0;

  while (!isLast) {
    const url = `${baseUrl}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${pageSize}&fields=${DASHBOARD_FIELDS}&expand=changelog`;
    const t0 = Date.now();

    const result = (await sendMessage({
      type: "FETCH_JIRA_PAGE",
      baseUrl,
      jql,
      startAt,
      pageSize,
      authToken,
    })) as {
      success: boolean;
      issues?: JiraIssue[];
      total?: number;
      startAt?: number;
      isLast?: boolean;
      error?: string;
    };

    apiLogger.log("FETCH_JIRA_PAGE", url, {
      headers: authHeaders(authToken),
      jql: `${jql} | page startAt=${startAt}, isLast=${result.isLast}, total=${result.total}`,
      durationMs: Date.now() - t0,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const pageIssues = result.issues || [];
    allIssues.push(...pageIssues);
    total = result.total || 0;
    isLast = result.isLast === true;
    startAt = result.startAt || startAt + pageIssues.length;

    if (onProgress) {
      onProgress(allIssues.length, total, label);
    }

    // Safety: if we got 0 issues back, stop to avoid infinite loop
    if (pageIssues.length === 0) break;
  }

  return { success: true, issues: allIssues, total };
}

export async function validateAuth(
  baseUrl: string,
  authToken: string | null,
): Promise<{ success: boolean; user?: JiraUser; error?: string }> {
  const url = `${baseUrl}/rest/api/3/myself`;
  const t0 = Date.now();
  const result = (await sendMessage({
    type: "VALIDATE_AUTH",
    baseUrl,
    authToken,
  })) as {
    success: boolean;
    user?: JiraUser;
    error?: string;
  };
  apiLogger.log("VALIDATE_AUTH", url, {
    headers: authHeaders(authToken),
    durationMs: Date.now() - t0,
  });
  return result;
}

export async function fetchProjects(
  baseUrl: string,
  authToken: string | null,
): Promise<{ success: boolean; projects?: JiraProject[]; error?: string }> {
  const url = `${baseUrl}/rest/api/3/project/search?maxResults=100&orderBy=name&status=live`;
  const t0 = Date.now();
  const result = (await sendMessage({
    type: "FETCH_PROJECTS",
    baseUrl,
    authToken,
  })) as {
    success: boolean;
    projects?: JiraProject[];
    error?: string;
  };
  apiLogger.log("FETCH_PROJECTS", url, {
    headers: authHeaders(authToken),
    durationMs: Date.now() - t0,
  });
  return result;
}

export async function fetchJiraIssues(
  baseUrl: string,
  jql: string,
  maxResults: number,
  authToken: string | null,
): Promise<{
  success: boolean;
  issues?: JiraIssue[];
  total?: number;
  error?: string;
}> {
  const params = new URLSearchParams({
    jql,
    maxResults: String(maxResults),
    fields: DASHBOARD_FIELDS,
    expand: "changelog",
  });
  const url = `${baseUrl}/rest/api/3/search/jql?${params}`;
  const t0 = Date.now();
  const result = (await sendMessage({
    type: "FETCH_JIRA",
    baseUrl,
    jql,
    maxResults,
    authToken,
  })) as {
    success: boolean;
    issues?: JiraIssue[];
    total?: number;
    error?: string;
  };
  apiLogger.log("FETCH_JIRA", url, {
    headers: authHeaders(authToken),
    jql,
    durationMs: Date.now() - t0,
  });
  return result;
}

export async function fetchActiveSprint(
  baseUrl: string,
  projectKey: string,
  authToken: string | null,
): Promise<{
  success: boolean;
  sprintName?: string;
  sprintGoal?: string;
  error?: string;
}> {
  const url = `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&type=scrum&maxResults=1`;
  const t0 = Date.now();
  const result = (await sendMessage({
    type: "FETCH_ACTIVE_SPRINT",
    baseUrl,
    projectKey,
    authToken,
  })) as {
    success: boolean;
    sprintName?: string;
    sprintGoal?: string;
    error?: string;
  };
  apiLogger.log("FETCH_ACTIVE_SPRINT", url, {
    headers: authHeaders(authToken),
    durationMs: Date.now() - t0,
  });
  return result;
}

export interface RawJiraIssue {
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  issueType: string;
  priority: string;
  assignee: string;
  reporter: string;
  project: string;
  projectKey: string;
  resolution: string;
  labels: string[];
  components: string[];
  sprint: string;
  created: string;
  updated: string;
  resolved: string | null;
  dueDate: string | null;
  storyPoints: number | null;
  timeSpent: number | null;
  timeEstimate: number | null;
  fixVersions: string[];
  epic: string | null;
}

export async function runJqlQuery(
  baseUrl: string,
  jql: string,
  maxResults: number,
  authToken: string | null,
): Promise<{
  success: boolean;
  issues?: RawJiraIssue[];
  total?: number;
  error?: string;
}> {
  const params = new URLSearchParams({
    jql,
    maxResults: String(maxResults),
    fields: EXPLORER_FIELDS,
  });
  const url = `${baseUrl}/rest/api/3/search/jql?${params}`;
  const t0 = Date.now();
  const result = (await sendMessage({
    type: "RUN_JQL",
    baseUrl,
    jql,
    maxResults,
    authToken,
  })) as {
    success: boolean;
    issues?: RawJiraIssue[];
    total?: number;
    error?: string;
  };
  apiLogger.log("RUN_JQL", url, {
    headers: authHeaders(authToken),
    jql,
    durationMs: Date.now() - t0,
  });
  return result;
}

export interface DevCommit {
  id: string;
  message: string;
  author: string;
  date: string;
  url: string;
  repo: string;
  files: string[];
}

export interface DevPullRequest {
  id: string;
  title: string;
  url: string;
  status: string;
  author: string;
}

export interface DevInfo {
  commits: DevCommit[];
  pullRequests: DevPullRequest[];
}

export async function fetchDevInfo(
  baseUrl: string,
  issueIds: string[],
  authToken: string | null,
): Promise<{
  success: boolean;
  devInfo?: Record<string, DevInfo>;
  error?: string;
}> {
  const url = `${baseUrl}/rest/dev-status/latest/issue/detail?issueId={issueId}&applicationType=GitHub&dataType=repository`;
  const t0 = Date.now();
  const result = (await sendMessage({
    type: "FETCH_DEV_INFO",
    baseUrl,
    issueIds,
    authToken,
  })) as {
    success: boolean;
    devInfo?: Record<string, DevInfo>;
    error?: string;
  };
  apiLogger.log("FETCH_DEV_INFO", url, {
    headers: authHeaders(authToken),
    jql: `issueIds: [${issueIds.slice(0, 5).join(", ")}${issueIds.length > 5 ? `, ... (${issueIds.length} total)` : ""}]`,
    durationMs: Date.now() - t0,
  });
  return result;
}
