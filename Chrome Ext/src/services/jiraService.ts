import type { JiraIssue, JiraUser, JiraProject } from "../types";
import { apiLogger } from "../utils/apiLogger";

function shouldUseDevProxy(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

function toRequestUrl(baseUrl: string, url: string): string {
  if (!shouldUseDevProxy()) return url;
  const parsed = new URL(url);
  return `/jira-proxy${parsed.pathname}${parsed.search}`;
}

function buildFetchOptions(
  authToken: string | null,
  baseUrl: string,
): RequestInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (authToken) headers["Authorization"] = `Basic ${authToken}`;
  if (shouldUseDevProxy()) headers["x-jira-base-url"] = baseUrl;
  const opts: RequestInit = { method: "GET", headers };
  if (!authToken) opts.credentials = "include";
  return opts;
}

function authHeaders(authToken: string | null): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (authToken) h["Authorization"] = `Basic ${authToken}`;
  return h;
}

// Extract plain text from Jira ADF (Atlassian Document Format) description
function extractAdfText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content))
    return (n.content as unknown[]).map(extractAdfText).join(" ");
  return "";
}

function mapIssue(issue: Record<string, unknown>): JiraIssue {
  const fields = issue.fields as Record<string, unknown>;
  const status = fields.status as Record<string, unknown>;
  const statusCategory = status?.statusCategory as Record<string, unknown>;
  const parentField = fields.parent as Record<string, unknown> | null;
  const parentFields = parentField?.fields as
    | Record<string, unknown>
    | undefined;

  const changelog = issue.changelog as Record<string, unknown> | undefined;
  const histories = (changelog?.histories as Record<string, unknown>[]) || [];
  const statusChanges: {
    from: string;
    to: string;
    date: string;
    by: string;
  }[] = [];
  let reopenCount = 0;
  let assigneeChanges = 0;

  for (const history of histories) {
    const items = (history.items as Record<string, unknown>[]) || [];
    const author =
      ((history.author as Record<string, unknown>)?.displayName as string) ||
      "";
    const created = (history.created as string) || "";
    for (const item of items) {
      if (item.field === "status") {
        const toStr = (item["toString"] as string) || "";
        statusChanges.push({
          from: (item["fromString"] as string) || "",
          to: toStr,
          date: created,
          by: author,
        });
        if (toStr.toLowerCase().includes("reopen")) reopenCount++;
      }
      if (item.field === "assignee") assigneeChanges++;
    }
  }

  return {
    id: (issue.id as string) || "",
    key: issue.key as string,
    summary: fields.summary as string,
    status: (status?.name as string) || "Unknown",
    statusCategory: (statusCategory?.name as string) || "Unknown",
    updated: fields.updated as string,
    created: (fields.created as string) || "",
    priority:
      ((fields.priority as Record<string, unknown>)?.name as string) || "",
    issueType:
      ((fields.issuetype as Record<string, unknown>)?.name as string) || "",
    project:
      ((fields.project as Record<string, unknown>)?.name as string) || "",
    projectKey:
      ((fields.project as Record<string, unknown>)?.key as string) || "",
    resolution:
      ((fields.resolution as Record<string, unknown>)?.name as string) || "",
    labels: (fields.labels as string[]) || [],
    assignee:
      ((fields.assignee as Record<string, unknown>)?.displayName as string) ||
      "Unassigned",
    components: ((fields.components as Record<string, unknown>[]) || []).map(
      (c) => c.name as string,
    ),
    reporter:
      ((fields.reporter as Record<string, unknown>)?.displayName as string) ||
      "",
    timeEstimate:
      typeof fields.timeoriginalestimate === "number"
        ? Math.round(fields.timeoriginalestimate / 3600)
        : 0,
    timeSpent:
      typeof fields.aggregatetimespent === "number"
        ? Math.round(fields.aggregatetimespent / 3600)
        : 0,
    resolved: (fields.resolutiondate as string) || null,
    storyPoints: (fields.customfield_10016 as number) || null,
    epic: (parentField?.key as string) || null,
    epicName: (parentFields?.summary as string) || null,
    sprint: (() => {
      const sf = fields.customfield_10020;
      if (Array.isArray(sf) && sf.length > 0)
        return (
          ((sf[sf.length - 1] as Record<string, unknown>)?.name as string) || ""
        );
      return "";
    })(),
    dueDate: (fields.duedate as string) || null,
    description: extractAdfText(fields.description),
    commentsCount:
      ((fields.comment as Record<string, unknown>)?.total as number) ?? 0,
    statusChanges,
    reopenCount,
    assigneeChanges,
    workratio: typeof fields.workratio === "number" ? fields.workratio : null,
    worklogs: (() => {
      const wl = fields.worklog as Record<string, unknown> | undefined;
      if (!wl) return [];
      const entries = (wl.worklogs as Record<string, unknown>[]) || [];
      return entries.map((e: Record<string, unknown>) => ({
        author:
          ((e.author as Record<string, unknown>)?.displayName as string) ||
          "Unknown",
        timeSpentSeconds: (e.timeSpentSeconds as number) || 0,
        started: (e.started as string) || "",
      }));
    })(),
  };
}

function parseDevStatusResponse(
  issueId: string,
  data: Record<string, unknown>,
) {
  const commits: {
    id: string;
    message: string;
    author: string;
    date: string;
    url: string;
    repo: string;
    files: string[];
  }[] = [];
  const pullRequests: {
    id: string;
    title: string;
    url: string;
    status: string;
    author: string;
  }[] = [];
  const detail = data.detail as Record<string, unknown>[] | undefined;
  if (Array.isArray(detail)) {
    for (const repo of detail) {
      const repoName =
        (repo.name as string) || (repo.repository as string) || "";
      for (const c of (repo.commits as Record<string, unknown>[]) || []) {
        commits.push({
          id: ((c.id as string) || "").substring(0, 12),
          message: (c.message as string) || "",
          author:
            ((c.author as Record<string, unknown>)?.name as string) ||
            (c.authorName as string) ||
            "",
          date: (c.authorTimestamp as string) || (c.date as string) || "",
          url: (c.url as string) || "",
          repo: repoName,
          files: (c.files as string[]) || [],
        });
      }
      for (const pr of (repo.pullRequests as Record<string, unknown>[]) || []) {
        pullRequests.push({
          id: String(pr.id || ""),
          title: (pr.name as string) || (pr.title as string) || "",
          url: (pr.url as string) || "",
          status: (pr.status as string) || "",
          author:
            ((pr.author as Record<string, unknown>)?.name as string) || "",
        });
      }
    }
  }
  return { issueId, commits, pullRequests };
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
    const params = new URLSearchParams({
      jql,
      maxResults: String(pageSize),
      fields: DASHBOARD_FIELDS,
      expand: "changelog",
      startAt: String(startAt),
    });
    const url = `${baseUrl}/rest/api/3/search/jql?${params}`;
    const t0 = Date.now();

    try {
      const res = await fetch(
        toRequestUrl(baseUrl, url),
        buildFetchOptions(authToken, baseUrl),
      );
      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          error: `Jira API error (${res.status}): ${text.substring(0, 200)}`,
        };
      }
      const data = await res.json();
      const pageTotal = data.total ?? 0;
      const pageIssues: JiraIssue[] = (data.issues || []).map(mapIssue);
      const nextStartAt = startAt + pageIssues.length;
      const pageIsLast = pageIssues.length === 0 || nextStartAt >= pageTotal;

      apiLogger.log("FETCH_JIRA_PAGE", url, {
        headers: authHeaders(authToken),
        jql: `${jql} | page startAt=${startAt}, isLast=${pageIsLast}, total=${pageTotal}`,
        durationMs: Date.now() - t0,
      });

      allIssues.push(...pageIssues);
      total = pageTotal;
      isLast = pageIsLast;
      startAt = nextStartAt;

      if (onProgress) onProgress(allIssues.length, total, label);
      if (pageIssues.length === 0) break;
    } catch (err: unknown) {
      return {
        success: false,
        error: `Network error: ${(err as Error).message}`,
      };
    }
  }

  return { success: true, issues: allIssues, total };
}

export async function validateAuth(
  baseUrl: string,
  authToken: string | null,
): Promise<{ success: boolean; user?: JiraUser; error?: string }> {
  const url = `${baseUrl}/rest/api/3/myself`;
  const t0 = Date.now();
  try {
    const res = await fetch(
      toRequestUrl(baseUrl, url),
      buildFetchOptions(authToken, baseUrl),
    );
    apiLogger.log("VALIDATE_AUTH", url, {
      headers: authHeaders(authToken),
      durationMs: Date.now() - t0,
    });
    if (!res.ok)
      return {
        success: false,
        error: `Auth failed (${res.status}). Check your credentials.`,
      };
    const data = await res.json();
    return {
      success: true,
      user: {
        displayName: data.displayName,
        emailAddress: data.emailAddress,
        avatarUrl: data.avatarUrls?.["48x48"] || "",
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Cannot reach Jira. Check the URL and your network.`,
    };
  }
}

export async function fetchProjects(
  baseUrl: string,
  authToken: string | null,
): Promise<{ success: boolean; projects?: JiraProject[]; error?: string }> {
  const url = `${baseUrl}/rest/api/3/project/search?maxResults=100&orderBy=name&status=live`;
  const t0 = Date.now();
  try {
    const res = await fetch(
      toRequestUrl(baseUrl, url),
      buildFetchOptions(authToken, baseUrl),
    );
    apiLogger.log("FETCH_PROJECTS", url, {
      headers: authHeaders(authToken),
      durationMs: Date.now() - t0,
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Failed to fetch projects (${res.status}): ${text.substring(0, 200)}`,
      };
    }
    const data = await res.json();
    const projects = (data.values || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      avatarUrl: (p.avatarUrls as Record<string, string>)?.["48x48"] || "",
    }));
    return { success: true, projects };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Network error: ${(err as Error).message}`,
    };
  }
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
  const fetchAll = maxResults <= 0;
  const PAGE_SIZE = fetchAll ? 100 : Math.min(maxResults, 100);
  const CAP = fetchAll ? Infinity : maxResults;
  let startAt = 0;
  let totalAvailable = Infinity;
  const allIssues: JiraIssue[] = [];

  try {
    while (startAt < totalAvailable && allIssues.length < CAP) {
      const params = new URLSearchParams({
        jql,
        maxResults: String(Math.min(PAGE_SIZE, CAP - allIssues.length)),
        fields: DASHBOARD_FIELDS,
        expand: "changelog",
        startAt: String(startAt),
      });
      const url = `${baseUrl}/rest/api/3/search/jql?${params}`;
      const t0 = Date.now();
      const res = await fetch(
        toRequestUrl(baseUrl, url),
        buildFetchOptions(authToken, baseUrl),
      );
      apiLogger.log("FETCH_JIRA", url, {
        headers: authHeaders(authToken),
        jql,
        durationMs: Date.now() - t0,
      });
      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          error: `Jira API error (${res.status}): ${text.substring(0, 200)}`,
        };
      }
      const data = await res.json();
      totalAvailable = data.total ?? 0;
      const pageIssues: JiraIssue[] = (data.issues || []).map(mapIssue);
      allIssues.push(...pageIssues);
      if (pageIssues.length === 0) break;
      startAt += pageIssues.length;
    }
    return {
      success: true,
      issues: allIssues,
      total: totalAvailable === Infinity ? allIssues.length : totalAvailable,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Network error: ${(err as Error).message}`,
    };
  }
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
  try {
    for (const boardType of ["scrum", "kanban"]) {
      const boardUrl = `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&type=${boardType}&maxResults=1`;
      const t0 = Date.now();
      const boardRes = await fetch(
        toRequestUrl(baseUrl, boardUrl),
        buildFetchOptions(authToken, baseUrl),
      );
      apiLogger.log("FETCH_ACTIVE_SPRINT", boardUrl, {
        headers: authHeaders(authToken),
        durationMs: Date.now() - t0,
      });
      if (!boardRes.ok) continue;
      const boardData = await boardRes.json();
      const boards = boardData.values || [];
      if (boards.length === 0) continue;
      const boardId = boards[0].id;
      const sprintUrl = `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active&maxResults=1`;
      const sprintRes = await fetch(
        toRequestUrl(baseUrl, sprintUrl),
        buildFetchOptions(authToken, baseUrl),
      );
      if (!sprintRes.ok) continue;
      const sprintData = await sprintRes.json();
      const sprints = sprintData.values || [];
      if (sprints.length > 0)
        return {
          success: true,
          sprintName: sprints[0].name,
          sprintGoal: sprints[0].goal || "",
        };
    }
    return { success: true, sprintName: "", sprintGoal: "" };
  } catch (err: unknown) {
    return { success: false, sprintName: "", error: (err as Error).message };
  }
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
  try {
    const res = await fetch(
      toRequestUrl(baseUrl, url),
      buildFetchOptions(authToken, baseUrl),
    );
    apiLogger.log("RUN_JQL", url, {
      headers: authHeaders(authToken),
      jql,
      durationMs: Date.now() - t0,
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Jira API error (${res.status}): ${text.substring(0, 500)}`,
      };
    }
    const data = await res.json();
    const issues = (data.issues || []).map((issue: Record<string, unknown>) => {
      const f = issue.fields as Record<string, unknown>;
      const status = f.status as Record<string, unknown>;
      const statusCat = status?.statusCategory as Record<string, unknown>;
      const sprintField = f.customfield_10020;
      let sprint = "";
      if (Array.isArray(sprintField) && sprintField.length > 0)
        sprint =
          ((sprintField[sprintField.length - 1] as Record<string, unknown>)
            ?.name as string) || "";
      return {
        key: issue.key as string,
        summary: (f.summary as string) || "",
        status: (status?.name as string) || "Unknown",
        statusCategory: (statusCat?.name as string) || "Unknown",
        issueType:
          ((f.issuetype as Record<string, unknown>)?.name as string) || "",
        priority:
          ((f.priority as Record<string, unknown>)?.name as string) || "None",
        assignee:
          ((f.assignee as Record<string, unknown>)?.displayName as string) ||
          "Unassigned",
        reporter:
          ((f.reporter as Record<string, unknown>)?.displayName as string) ||
          "",
        project: ((f.project as Record<string, unknown>)?.name as string) || "",
        projectKey:
          ((f.project as Record<string, unknown>)?.key as string) || "",
        resolution:
          ((f.resolution as Record<string, unknown>)?.name as string) ||
          "Unresolved",
        labels: (f.labels as string[]) || [],
        components: ((f.components as Record<string, unknown>[]) || []).map(
          (c) => c.name as string,
        ),
        sprint,
        created: (f.created as string) || "",
        updated: (f.updated as string) || "",
        resolved: (f.resolutiondate as string) || null,
        dueDate: (f.duedate as string) || null,
        storyPoints: (f.customfield_10016 as number) || null,
        timeSpent: (f.aggregatetimespent as number) || null,
        timeEstimate: (f.timeoriginalestimate as number) || null,
        fixVersions: ((f.fixVersions as Record<string, unknown>[]) || []).map(
          (v) => v.name as string,
        ),
        epic: ((f.parent as Record<string, unknown>)?.key as string) || null,
      };
    });
    return { success: true, total: data.total as number, issues };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Network error: ${(err as Error).message}`,
    };
  }
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
  const t0 = Date.now();
  const results: Record<string, DevInfo> = {};
  const BATCH = 10;
  try {
    for (let i = 0; i < issueIds.length; i += BATCH) {
      const batch = issueIds.slice(i, i + BATCH);
      const batchResults = await Promise.all(
        batch.map(async (issueId) => {
          try {
            const primaryDevStatusUrl = `${baseUrl}/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=GitHub&dataType=repository`;
            const res = await fetch(
              toRequestUrl(baseUrl, primaryDevStatusUrl),
              buildFetchOptions(authToken, baseUrl),
            );
            if (!res.ok) {
              const fallbackDevStatusUrl = `${baseUrl}/rest/dev-status/1.0/issue/detail?issueId=${issueId}&applicationType=stash&dataType=repository`;
              const res2 = await fetch(
                toRequestUrl(baseUrl, fallbackDevStatusUrl),
                buildFetchOptions(authToken, baseUrl),
              );
              if (!res2.ok) return { issueId, commits: [], pullRequests: [] };
              return parseDevStatusResponse(issueId, await res2.json());
            }
            return parseDevStatusResponse(issueId, await res.json());
          } catch {
            return { issueId, commits: [], pullRequests: [] };
          }
        }),
      );
      for (const r of batchResults)
        results[r.issueId] = {
          commits: r.commits,
          pullRequests: r.pullRequests,
        };
    }
    apiLogger.log("FETCH_DEV_INFO", `${baseUrl}/rest/dev-status/...`, {
      headers: authHeaders(authToken),
      jql: `issueIds: [${issueIds.slice(0, 5).join(", ")}${issueIds.length > 5 ? `, ... (${issueIds.length} total)` : ""}]`,
      durationMs: Date.now() - t0,
    });
    return { success: true, devInfo: results };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Network error: ${(err as Error).message}`,
    };
  }
}
