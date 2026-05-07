import type { JiraIssue, JiraUser, JiraProject } from "../types";
import { apiLogger } from "../utils/apiLogger";

const PRODUCTION_JIRA_PROXY_PREFIX = (
  import.meta.env.VITE_JIRA_PROXY_PREFIX || "/jira-proxy"
).trim();

function shouldUseDevProxy(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
}

function normalizeProxyPrefix(prefix: string): string {
  if (!prefix) return "";
  const withLeadingSlash = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function getJiraProxyPrefix(): string | null {
  if (shouldUseDevProxy()) return "/jira-proxy";
  const normalized = normalizeProxyPrefix(PRODUCTION_JIRA_PROXY_PREFIX);
  return normalized || null;
}

function shouldUseJiraProxy(): boolean {
  return !!getJiraProxyPrefix();
}

function toRequestUrl(baseUrl: string, url: string): string {
  const proxyPrefix = getJiraProxyPrefix();
  if (!proxyPrefix) return url;
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.searchParams);
  if (!shouldUseDevProxy()) {
    // Header forwarding can be stripped by some hosts, so keep base URL as fallback.
    params.set("jiraBaseUrl", baseUrl);
  }
  const query = params.toString();
  return `${proxyPrefix}${parsed.pathname}${query ? `?${query}` : ""}`;
}

function buildFetchOptions(
  authToken: string | null,
  baseUrl: string,
): RequestInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  const useProxy = shouldUseJiraProxy();
  const useDevProxy = shouldUseDevProxy();
  if (authToken) {
    if (useProxy && !useDevProxy) {
      // Some managed hosts reject Authorization header on site endpoints.
      headers["x-jira-authorization"] = `Basic ${authToken}`;
    } else {
      headers["Authorization"] = `Basic ${authToken}`;
    }
  }
  if (useProxy) headers["x-jira-base-url"] = baseUrl;
  const opts: RequestInit = { method: "GET", headers };
  if (!authToken) opts.credentials = "include";
  return opts;
}

function authHeaders(authToken: string | null): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (authToken) h["Authorization"] = `Basic ${authToken}`;
  return h;
}

function shouldUseBackgroundRelay(): boolean {
  if (shouldUseDevProxy()) return false;
  return (
    typeof chrome !== "undefined" &&
    !!chrome.runtime?.id &&
    typeof chrome.runtime.sendMessage === "function"
  );
}

function getHostedWebCorsError(): string | null {
  if (typeof window === "undefined") return null;
  if (shouldUseBackgroundRelay() || shouldUseJiraProxy()) return null;
  return "Jira Cloud blocks direct browser calls from deployed websites due to CORS. Use a same-origin backend proxy route (default: /jira-proxy) and set VITE_JIRA_PROXY_PREFIX only if your proxy path is different.";
}

function sendBackgroundMessage<T>(
  message: Record<string, unknown>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: T) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }
      if (response === undefined || response === null) {
        reject(
          new Error("No response from extension background service worker"),
        );
        return;
      }
      resolve(response);
    });
  });
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
  if (shouldUseBackgroundRelay()) {
    try {
      type FetchJiraPageResponse = {
        success: boolean;
        issues?: JiraIssue[];
        total?: number;
        startAt?: number;
        isLast?: boolean;
        nextPageToken?: string | null;
        error?: string;
      };

      const allIssues: JiraIssue[] = [];
      let startAt = 0;
      let total = 0;
      let isLast = false;
      let nextPageToken: string | null = null;

      while (!isLast) {
        const page: FetchJiraPageResponse =
          await sendBackgroundMessage<FetchJiraPageResponse>({
            type: "FETCH_JIRA_PAGE",
            baseUrl,
            jql,
            startAt,
            nextPageToken,
            pageSize,
            authToken,
          });

        if (!page.success) {
          return {
            success: false,
            error: page.error || "Failed to fetch Jira page",
          };
        }

        const pageIssues = page.issues || [];
        allIssues.push(...pageIssues);
        total = page.total || total;
        nextPageToken =
          typeof page.nextPageToken === "string" ? page.nextPageToken : null;
        isLast =
          !!page.isLast || (nextPageToken === null && pageIssues.length === 0);
        // If token-based pagination is used, we keep startAt for progress only.
        // Otherwise we advance by startAt.
        startAt = page.startAt ?? startAt + pageIssues.length;

        if (onProgress)
          onProgress(
            allIssues.length,
            Math.max(allIssues.length, total),
            label,
          );
        if (pageIssues.length === 0) break;
      }

      return { success: true, issues: allIssues, total };
    } catch {
      // Fallback to direct fetch path below.
    }
  }

  const hostedWebCorsError = getHostedWebCorsError();
  if (hostedWebCorsError) {
    return { success: false, error: hostedWebCorsError };
  }

  const allIssues: JiraIssue[] = [];
  let startAt = 0;
  let isLast = false;
  let total = 0;
  let nextPageToken: string | null = null;

  while (!isLast) {
    const params = new URLSearchParams({
      jql,
      maxResults: String(pageSize),
      fields: DASHBOARD_FIELDS,
      expand: "changelog",
    });
    if (nextPageToken) params.set("nextPageToken", nextPageToken);
    else params.set("startAt", String(startAt)); // fallback for older behavior
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
      const pageTotal = typeof data.total === "number" ? data.total : 0;
      const pageIssues: JiraIssue[] = (data.issues || []).map(mapIssue);
      const nextStartAt = startAt + pageIssues.length;
      const responseNextToken =
        typeof data.nextPageToken === "string" ? data.nextPageToken : null;
      const responseIsLast = data.isLast === true;
      // Prefer Jira's token + isLast when available; fallback to total/startAt.
      const pageIsLast = responseIsLast
        ? true
        : responseNextToken
          ? false
          : pageIssues.length === 0 || nextStartAt >= pageTotal;

      apiLogger.log("FETCH_JIRA_PAGE", url, {
        headers: authHeaders(authToken),
        jql: `${jql} | page startAt=${startAt}, isLast=${pageIsLast}, total=${pageTotal}`,
        durationMs: Date.now() - t0,
      });

      allIssues.push(...pageIssues);
      total = pageTotal || total;
      isLast = pageIsLast;
      nextPageToken = responseNextToken;
      startAt = nextStartAt;

      if (onProgress)
        onProgress(allIssues.length, Math.max(allIssues.length, total), label);
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
  if (shouldUseBackgroundRelay()) {
    try {
      return await sendBackgroundMessage<{
        success: boolean;
        user?: JiraUser;
        error?: string;
      }>({
        type: "VALIDATE_AUTH",
        baseUrl,
        authToken,
      });
    } catch {
      // Fallback to direct fetch path below.
    }
  }

  const hostedWebCorsError = getHostedWebCorsError();
  if (hostedWebCorsError) {
    return { success: false, error: hostedWebCorsError };
  }

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
  if (shouldUseBackgroundRelay()) {
    try {
      return await sendBackgroundMessage<{
        success: boolean;
        projects?: JiraProject[];
        error?: string;
      }>({
        type: "FETCH_PROJECTS",
        baseUrl,
        authToken,
      });
    } catch {
      // Fallback to direct fetch path below.
    }
  }

  const hostedWebCorsError = getHostedWebCorsError();
  if (hostedWebCorsError) {
    return { success: false, error: hostedWebCorsError };
  }

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
  if (shouldUseBackgroundRelay()) {
    try {
      return await sendBackgroundMessage<{
        success: boolean;
        issues?: JiraIssue[];
        total?: number;
        error?: string;
      }>({
        type: "FETCH_JIRA",
        baseUrl,
        jql,
        maxResults,
        authToken,
      });
    } catch {
      // Fallback to direct fetch path below.
    }
  }

  const hostedWebCorsError = getHostedWebCorsError();
  if (hostedWebCorsError) {
    return { success: false, error: hostedWebCorsError };
  }

  const fetchAll = maxResults <= 0;
  const PAGE_SIZE = fetchAll ? 100 : Math.min(maxResults, 100);
  const CAP = fetchAll ? Infinity : maxResults;
  let startAt = 0;
  let totalAvailable = Infinity;
  let nextPageToken: string | null = null;
  const allIssues: JiraIssue[] = [];

  try {
    while (startAt < totalAvailable && allIssues.length < CAP) {
      const params = new URLSearchParams({
        jql,
        maxResults: String(Math.min(PAGE_SIZE, CAP - allIssues.length)),
        fields: DASHBOARD_FIELDS,
        expand: "changelog",
      });
      if (nextPageToken) params.set("nextPageToken", nextPageToken);
      else params.set("startAt", String(startAt)); // fallback
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
      totalAvailable =
        typeof data.total === "number" ? data.total : totalAvailable;
      nextPageToken =
        typeof data.nextPageToken === "string" ? data.nextPageToken : null;
      const pageIssues: JiraIssue[] = (data.issues || []).map(mapIssue);
      allIssues.push(...pageIssues);
      if (data.isLast === true) break;
      if (pageIssues.length === 0) break;
      startAt += pageIssues.length;
      if (
        !nextPageToken &&
        totalAvailable !== Infinity &&
        startAt >= totalAvailable
      )
        break;
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
  if (shouldUseBackgroundRelay()) {
    try {
      return await sendBackgroundMessage<{
        success: boolean;
        sprintName?: string;
        sprintGoal?: string;
        error?: string;
      }>({
        type: "FETCH_ACTIVE_SPRINT",
        baseUrl,
        projectKey,
        authToken,
      });
    } catch {
      // Fallback to direct fetch path below.
    }
  }

  const hostedWebCorsError = getHostedWebCorsError();
  if (hostedWebCorsError) {
    return { success: false, error: hostedWebCorsError };
  }

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
  if (shouldUseBackgroundRelay()) {
    try {
      return await sendBackgroundMessage<{
        success: boolean;
        issues?: RawJiraIssue[];
        total?: number;
        error?: string;
      }>({
        type: "RUN_JQL",
        baseUrl,
        jql,
        maxResults,
        authToken,
      });
    } catch {
      // Fallback to direct fetch path below.
    }
  }

  const hostedWebCorsError = getHostedWebCorsError();
  if (hostedWebCorsError) {
    return { success: false, error: hostedWebCorsError };
  }

  try {
    const CAP = maxResults <= 0 ? Infinity : maxResults;
    const PAGE_SIZE = 100;
    const all: RawJiraIssue[] = [];
    let startAt = 0;
    let totalAvailable = Infinity;
    let nextPageToken: string | null = null;

    const t0 = Date.now();
    while (startAt < totalAvailable && all.length < CAP) {
      const params = new URLSearchParams({
        jql,
        maxResults: String(Math.min(PAGE_SIZE, CAP - all.length)),
        fields: EXPLORER_FIELDS,
      });
      if (nextPageToken) params.set("nextPageToken", nextPageToken);
      else params.set("startAt", String(startAt)); // fallback
      const url = `${baseUrl}/rest/api/3/search/jql?${params}`;
      const pageT0 = Date.now();

      const res = await fetch(
        toRequestUrl(baseUrl, url),
        buildFetchOptions(authToken, baseUrl),
      );

      apiLogger.log("RUN_JQL", url, {
        headers: authHeaders(authToken),
        jql: `${jql} | page startAt=${startAt}`,
        durationMs: Date.now() - pageT0,
      });

      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          error: `Jira API error (${res.status}): ${text.substring(0, 500)}`,
        };
      }

      const data = await res.json();
      totalAvailable =
        typeof data.total === "number" ? data.total : totalAvailable;
      nextPageToken =
        typeof data.nextPageToken === "string" ? data.nextPageToken : null;

      const issues: RawJiraIssue[] = (data.issues || []).map(
        (issue: Record<string, unknown>) => {
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
              ((f.priority as Record<string, unknown>)?.name as string) ||
              "None",
            assignee:
              ((f.assignee as Record<string, unknown>)
                ?.displayName as string) || "Unassigned",
            reporter:
              ((f.reporter as Record<string, unknown>)
                ?.displayName as string) || "",
            project:
              ((f.project as Record<string, unknown>)?.name as string) || "",
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
            fixVersions: (
              (f.fixVersions as Record<string, unknown>[]) || []
            ).map((v) => v.name as string),
            epic:
              ((f.parent as Record<string, unknown>)?.key as string) || null,
          };
        },
      );

      all.push(...issues);
      startAt += issues.length;
      if (data.isLast === true) break;
      if (issues.length === 0) break;
      if (
        !nextPageToken &&
        totalAvailable !== Infinity &&
        startAt >= totalAvailable
      )
        break;
    }

    apiLogger.log("RUN_JQL", `${baseUrl}/rest/api/3/search/jql`, {
      headers: authHeaders(authToken),
      jql: `${jql} | fetched=${all.length}, cap=${String(CAP)}`,
      durationMs: Date.now() - t0,
    });

    return {
      success: true,
      total: totalAvailable === Infinity ? all.length : totalAvailable,
      issues: all,
    };
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

const devStatusSupportCache = new Map<string, "available" | "unavailable">();

export async function fetchDevInfo(
  baseUrl: string,
  issueIds: string[],
  authToken: string | null,
): Promise<{
  success: boolean;
  devInfo?: Record<string, DevInfo>;
  error?: string;
}> {
  if (shouldUseBackgroundRelay()) {
    try {
      return await sendBackgroundMessage<{
        success: boolean;
        devInfo?: Record<string, DevInfo>;
        error?: string;
      }>({
        type: "FETCH_DEV_INFO",
        baseUrl,
        issueIds,
        authToken,
      });
    } catch {
      // Fallback to direct fetch path below.
    }
  }

  const hostedWebCorsError = getHostedWebCorsError();
  if (hostedWebCorsError) {
    return { success: false, error: hostedWebCorsError };
  }

  const emptyByIssue = () => {
    const empty: Record<string, DevInfo> = {};
    for (const issueId of issueIds) {
      empty[issueId] = { commits: [], pullRequests: [] };
    }
    return empty;
  };

  const supportKey = `${baseUrl}::${authToken ? "token" : "session"}`;
  if (devStatusSupportCache.get(supportKey) === "unavailable") {
    return { success: true, devInfo: emptyByIssue() };
  }

  const isUnsupportedStatus = (status: number) =>
    status === 401 || status === 403 || status === 404;

  const fetchIssueDevStatus = async (issueId: string) => {
    const empty = { issueId, commits: [], pullRequests: [] };
    try {
      const primaryDevStatusUrl = `${baseUrl}/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=GitHub&dataType=repository`;
      const res = await fetch(
        toRequestUrl(baseUrl, primaryDevStatusUrl),
        buildFetchOptions(authToken, baseUrl),
      );
      if (res.ok) {
        return {
          data: parseDevStatusResponse(issueId, await res.json()),
          unsupported: false,
        };
      }

      const fallbackDevStatusUrl = `${baseUrl}/rest/dev-status/1.0/issue/detail?issueId=${issueId}&applicationType=stash&dataType=repository`;
      const res2 = await fetch(
        toRequestUrl(baseUrl, fallbackDevStatusUrl),
        buildFetchOptions(authToken, baseUrl),
      );
      if (res2.ok) {
        return {
          data: parseDevStatusResponse(issueId, await res2.json()),
          unsupported: false,
        };
      }

      return {
        data: empty,
        unsupported:
          isUnsupportedStatus(res.status) && isUnsupportedStatus(res2.status),
      };
    } catch {
      return { data: empty, unsupported: false };
    }
  };

  const t0 = Date.now();
  const results: Record<string, DevInfo> = {};
  const BATCH = 10;
  try {
    if (issueIds.length > 0 && !devStatusSupportCache.has(supportKey)) {
      const probe = await fetchIssueDevStatus(issueIds[0]);
      if (probe.unsupported) {
        devStatusSupportCache.set(supportKey, "unavailable");
        return { success: true, devInfo: emptyByIssue() };
      }
      devStatusSupportCache.set(supportKey, "available");
      results[probe.data.issueId] = {
        commits: probe.data.commits,
        pullRequests: probe.data.pullRequests,
      };
    }

    const pendingIds = issueIds.filter((id) => !results[id]);
    for (let i = 0; i < pendingIds.length; i += BATCH) {
      const batch = pendingIds.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(fetchIssueDevStatus));
      for (const r of batchResults) {
        if (r.unsupported) {
          devStatusSupportCache.set(supportKey, "unavailable");
        }
      }
      for (const r of batchResults)
        results[r.data.issueId] = {
          commits: r.data.commits,
          pullRequests: r.data.pullRequests,
        };

      if (devStatusSupportCache.get(supportKey) === "unavailable") {
        for (const issueId of pendingIds) {
          if (!results[issueId]) {
            results[issueId] = { commits: [], pullRequests: [] };
          }
        }
        break;
      }
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
