import type { JiraIssue, JiraUser, JiraProject } from "../types";

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

export async function validateAuth(
  baseUrl: string,
  authToken: string | null,
): Promise<{ success: boolean; user?: JiraUser; error?: string }> {
  return sendMessage({ type: "VALIDATE_AUTH", baseUrl, authToken }) as Promise<{
    success: boolean;
    user?: JiraUser;
    error?: string;
  }>;
}

export async function fetchProjects(
  baseUrl: string,
  authToken: string | null,
): Promise<{ success: boolean; projects?: JiraProject[]; error?: string }> {
  return sendMessage({
    type: "FETCH_PROJECTS",
    baseUrl,
    authToken,
  }) as Promise<{
    success: boolean;
    projects?: JiraProject[];
    error?: string;
  }>;
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
  return sendMessage({
    type: "FETCH_JIRA",
    baseUrl,
    jql,
    maxResults,
    authToken,
  }) as Promise<{
    success: boolean;
    issues?: JiraIssue[];
    total?: number;
    error?: string;
  }>;
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
  return sendMessage({
    type: "FETCH_ACTIVE_SPRINT",
    baseUrl,
    projectKey,
    authToken,
  }) as Promise<{
    success: boolean;
    sprintName?: string;
    sprintGoal?: string;
    error?: string;
  }>;
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
  return sendMessage({
    type: "RUN_JQL",
    baseUrl,
    jql,
    maxResults,
    authToken,
  }) as Promise<{
    success: boolean;
    issues?: RawJiraIssue[];
    total?: number;
    error?: string;
  }>;
}
