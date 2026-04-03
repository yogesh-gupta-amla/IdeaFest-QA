// background.ts — DSR Assistant Service Worker (Manifest V3)

// Open dashboard on icon click
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
});

// Message relay handler
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "VALIDATE_AUTH") {
    validateAuth(message.baseUrl, message.authToken).then(sendResponse);
    return true;
  }
  if (message.type === "FETCH_JIRA") {
    fetchJiraIssues(
      message.baseUrl,
      message.jql,
      message.maxResults || 100,
      message.authToken,
    ).then(sendResponse);
    return true;
  }
  if (message.type === "FETCH_PROJECTS") {
    fetchProjects(message.baseUrl, message.authToken).then(sendResponse);
    return true;
  }
  if (message.type === "FETCH_ACTIVE_SPRINT") {
    fetchActiveSprint(
      message.baseUrl,
      message.projectKey,
      message.authToken,
    ).then(sendResponse);
    return true;
  }
  if (message.type === "RUN_JQL") {
    runJqlQuery(
      message.baseUrl,
      message.jql,
      message.maxResults || 500,
      message.authToken,
    ).then(sendResponse);
    return true;
  }
  if (message.type === "FETCH_DEV_INFO") {
    fetchDevInfo(message.baseUrl, message.issueIds, message.authToken).then(
      sendResponse,
    );
    return true;
  }
});

function buildFetchOptions(authToken: string | null): RequestInit {
  const opts: RequestInit = {
    method: "GET",
    headers: { Accept: "application/json" } as Record<string, string>,
  };
  if (authToken) {
    (opts.headers as Record<string, string>)["Authorization"] =
      `Basic ${authToken}`;
  } else {
    opts.credentials = "include";
  }
  return opts;
}

async function validateAuth(baseUrl: string, authToken: string | null) {
  try {
    const res = await fetch(
      `${baseUrl}/rest/api/3/myself`,
      buildFetchOptions(authToken),
    );
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
      error: "Cannot reach Jira. Check the URL and your network.",
    };
  }
}

async function fetchProjects(baseUrl: string, authToken: string | null) {
  try {
    const res = await fetch(
      `${baseUrl}/rest/api/3/project/search?maxResults=100&orderBy=name&status=live`,
      buildFetchOptions(authToken),
    );
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

async function fetchActiveSprint(
  baseUrl: string,
  projectKey: string,
  authToken: string | null,
) {
  try {
    for (const boardType of ["scrum", "kanban"]) {
      const boardRes = await fetch(
        `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&type=${boardType}&maxResults=1`,
        buildFetchOptions(authToken),
      );
      if (!boardRes.ok) continue;
      const boardData = await boardRes.json();
      const boards = boardData.values || [];
      if (boards.length === 0) continue;
      const boardId = boards[0].id;
      const sprintRes = await fetch(
        `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active&maxResults=1`,
        buildFetchOptions(authToken),
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

// Extract plain text from Jira ADF (Atlassian Document Format) description
function extractAdfText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (n.type === "text" && typeof n.text === "string") return n.text;
  if (Array.isArray(n.content))
    return (n.content as unknown[]).map(extractAdfText).join(" ");
  return "";
}

async function fetchJiraIssues(
  baseUrl: string,
  jql: string,
  maxResults: number,
  authToken: string | null,
) {
  try {
    const fields = [
      "summary",
      "status",
      "updated",
      "created",
      "priority",
      "assignee",
      "issuetype",
      "project",
      "resolution",
      "labels",
      "components",
      "reporter",
      "timeoriginalestimate",
      "aggregatetimespent",
      "resolutiondate",
      "parent",
      "customfield_10016",
      "customfield_10020",
      "duedate",
      "description",
      "comment",
      "worklog",
      "workratio",
    ].join(",");
    const fieldsStr = fields;

    const headers: Record<string, string> = { Accept: "application/json" };
    if (authToken) headers["Authorization"] = `Basic ${authToken}`;

    const fetchOpts: RequestInit = { method: "GET", headers };
    if (!authToken) fetchOpts.credentials = "include";

    // Paginate through all results (cap at 2000 to prevent runaway)
    const PAGE_SIZE = Math.min(maxResults, 100);
    const CAP = maxResults;
    let startAt = 0;
    let totalAvailable = Infinity;
    const allRawIssues: Record<string, unknown>[] = [];

    while (startAt < totalAvailable && allRawIssues.length < CAP) {
      const pageParams = new URLSearchParams({
        jql,
        maxResults: String(Math.min(PAGE_SIZE, CAP - allRawIssues.length)),
        fields: fieldsStr,
        expand: "changelog",
        startAt: String(startAt),
      });
      const res = await fetch(
        `${baseUrl}/rest/api/3/search/jql?${pageParams}`,
        fetchOpts,
      );
      if (!res.ok) {
        const text = await res.text();
        return {
          success: false,
          error: `Jira API error (${res.status}): ${text.substring(0, 200)}`,
        };
      }
      const data = await res.json();
      totalAvailable = data.total ?? 0;
      const pageIssues = data.issues || [];
      allRawIssues.push(...pageIssues);
      if (pageIssues.length === 0) break;
      startAt += pageIssues.length;
    }

    const issues = allRawIssues.map((issue: Record<string, unknown>) => {
      const fields = issue.fields as Record<string, unknown>;
      const status = fields.status as Record<string, unknown>;
      const statusCategory = status?.statusCategory as Record<string, unknown>;
      const parentField = fields.parent as Record<string, unknown> | null;
      const parentFields = parentField?.fields as
        | Record<string, unknown>
        | undefined;

      // ── Parse changelog ──────────────────────────────────────────────────
      const changelog = issue.changelog as Record<string, unknown> | undefined;
      const histories =
        (changelog?.histories as Record<string, unknown>[]) || [];
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
          ((history.author as Record<string, unknown>)
            ?.displayName as string) || "";
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
        key: issue.key,
        summary: fields.summary,
        status: (status?.name as string) || "Unknown",
        statusCategory: (statusCategory?.name as string) || "Unknown",
        updated: fields.updated,
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
          ((fields.resolution as Record<string, unknown>)?.name as string) ||
          "",
        labels: (fields.labels as string[]) || [],
        assignee:
          ((fields.assignee as Record<string, unknown>)
            ?.displayName as string) || "Unassigned",
        components: (
          (fields.components as Record<string, unknown>[]) || []
        ).map((c) => c.name as string),
        reporter:
          ((fields.reporter as Record<string, unknown>)
            ?.displayName as string) || "",
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
              ((sf[sf.length - 1] as Record<string, unknown>)
                ?.name as string) || ""
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
        workratio:
          typeof fields.workratio === "number" ? fields.workratio : null,
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
    });
    return { success: true, total: totalAvailable, issues };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Network error: ${(err as Error).message}`,
    };
  }
}

async function runJqlQuery(
  baseUrl: string,
  jql: string,
  maxResults: number,
  authToken: string | null,
) {
  try {
    const fields = [
      "summary",
      "status",
      "issuetype",
      "priority",
      "assignee",
      "reporter",
      "project",
      "components",
      "labels",
      "created",
      "updated",
      "resolutiondate",
      "duedate",
      "resolution",
      "fixVersions",
      "customfield_10016",
      "customfield_10020",
      "aggregatetimespent",
      "timeoriginalestimate",
      "parent",
      "subtasks",
    ].join(",");
    const params = new URLSearchParams({
      jql,
      maxResults: String(maxResults),
      fields,
    });
    const res = await fetch(
      `${baseUrl}/rest/api/3/search/jql?${params.toString()}`,
      buildFetchOptions(authToken),
    );
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
      if (Array.isArray(sprintField) && sprintField.length > 0) {
        sprint =
          ((sprintField[sprintField.length - 1] as Record<string, unknown>)
            ?.name as string) || "";
      }
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

// ── Fetch dev-status (linked commits/PRs) for a batch of issue IDs ────────
async function fetchDevInfo(
  baseUrl: string,
  issueIds: string[],
  authToken: string | null,
) {
  const opts = buildFetchOptions(authToken);
  const results: Record<
    string,
    {
      commits: {
        id: string;
        message: string;
        author: string;
        date: string;
        url: string;
        repo: string;
        files: string[];
      }[];
      pullRequests: {
        id: string;
        title: string;
        url: string;
        status: string;
        author: string;
      }[];
    }
  > = {};

  // Process in batches of 10 to avoid flooding
  const BATCH = 10;
  for (let i = 0; i < issueIds.length; i += BATCH) {
    const batch = issueIds.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map(async (issueId) => {
        try {
          const res = await fetch(
            `${baseUrl}/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=GitHub&dataType=repository`,
            opts,
          );
          if (!res.ok) {
            // Try fallback for Jira Server/DC
            const res2 = await fetch(
              `${baseUrl}/rest/dev-status/1.0/issue/detail?issueId=${issueId}&applicationType=stash&dataType=repository`,
              opts,
            );
            if (!res2.ok) return { issueId, commits: [], pullRequests: [] };
            const data2 = await res2.json();
            return parseDevStatusResponse(issueId, data2);
          }
          const data = await res.json();
          return parseDevStatusResponse(issueId, data);
        } catch {
          return { issueId, commits: [], pullRequests: [] };
        }
      }),
    );
    for (const r of batchResults) {
      results[r.issueId] = { commits: r.commits, pullRequests: r.pullRequests };
    }
  }
  return { success: true, devInfo: results };
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
      const repoCommits = (repo.commits as Record<string, unknown>[]) || [];
      for (const c of repoCommits) {
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
      const repoPRs = (repo.pullRequests as Record<string, unknown>[]) || [];
      for (const pr of repoPRs) {
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
