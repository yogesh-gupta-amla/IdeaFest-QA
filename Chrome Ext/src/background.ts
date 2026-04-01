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

async function fetchJiraIssues(
  baseUrl: string,
  jql: string,
  maxResults: number,
  authToken: string | null,
) {
  try {
    const params = new URLSearchParams({
      jql,
      maxResults: String(maxResults),
      fields:
        "summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components",
    });
    const res = await fetch(
      `${baseUrl}/rest/api/3/search/jql?${params.toString()}`,
      buildFetchOptions(authToken),
    );
    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Jira API error (${res.status}): ${text.substring(0, 200)}`,
      };
    }
    const data = await res.json();
    const issues = (data.issues || []).map((issue: Record<string, unknown>) => {
      const fields = issue.fields as Record<string, unknown>;
      const status = fields.status as Record<string, unknown>;
      const statusCategory = status?.statusCategory as Record<string, unknown>;
      return {
        key: issue.key,
        summary: fields.summary,
        status: status?.name || "Unknown",
        statusCategory: statusCategory?.name || "Unknown",
        updated: fields.updated,
        created: fields.created || "",
        priority: (fields.priority as Record<string, unknown>)?.name || "",
        issueType: (fields.issuetype as Record<string, unknown>)?.name || "",
        project: (fields.project as Record<string, unknown>)?.name || "",
        projectKey: (fields.project as Record<string, unknown>)?.key || "",
        resolution: (fields.resolution as Record<string, unknown>)?.name || "",
        labels: fields.labels || [],
        assignee:
          (fields.assignee as Record<string, unknown>)?.displayName ||
          "Unassigned",
        components: (
          (fields.components as Record<string, unknown>[]) || []
        ).map((c) => c.name),
      };
    });
    return { success: true, total: data.total, issues };
  } catch (err: unknown) {
    return {
      success: false,
      error: `Network error: ${(err as Error).message}`,
    };
  }
}
