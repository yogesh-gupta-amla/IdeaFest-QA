/*  background.js — DSR Assistant Service Worker (Manifest V3)
 *  Responsibilities:
 *    1. Open dashboard in a new tab when extension icon is clicked
 *    2. Relay Jira API requests from dashboard.js
 *    3. Support cookie-based auth (session) OR email+token auth (fallback)
 */

// ── Open dashboard on icon click ───────────────────────────
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

// ── Message handler — relay Jira API calls ─────────────────
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

// ── Build headers for a request ────────────────────────────
function buildFetchOptions(authToken) {
  const opts = { method: "GET", headers: { Accept: "application/json" } };
  if (authToken) {
    // Token auth: "email:api_token" base64
    opts.headers["Authorization"] = `Basic ${authToken}`;
  } else {
    // Cookie-based session auth
    opts.credentials = "include";
  }
  return opts;
}

// ── Validate user is logged into Jira ──────────────────────
async function validateAuth(baseUrl, authToken) {
  try {
    const url = `${baseUrl}/rest/api/3/myself`;
    const res = await fetch(url, buildFetchOptions(authToken));

    if (!res.ok) {
      return {
        success: false,
        error: `Auth failed (${res.status}). Check your credentials or login to Jira in your browser.`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      user: {
        displayName: data.displayName,
        emailAddress: data.emailAddress,
        avatarUrl: data.avatarUrls?.["48x48"] || "",
      },
    };
  } catch (err) {
    return {
      success: false,
      error: "Cannot reach Jira. Check the URL and your network.",
    };
  }
}

// ── Fetch projects ─────────────────────────────────────────
async function fetchProjects(baseUrl, authToken) {
  try {
    const url = `${baseUrl}/rest/api/3/project/search?maxResults=100&orderBy=name&status=live`;
    const res = await fetch(url, buildFetchOptions(authToken));

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Failed to fetch projects (${res.status}): ${text.substring(0, 200)}`,
      };
    }

    const data = await res.json();
    const projects = (data.values || []).map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      avatarUrl: p.avatarUrls?.["48x48"] || "",
    }));

    return { success: true, projects };
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

// ── Fetch active sprint for a project ────────────────────
async function fetchActiveSprint(baseUrl, projectKey, authToken) {
  try {
    // Try Scrum board first, then Kanban
    for (const boardType of ["scrum", "kanban"]) {
      const boardUrl = `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&type=${boardType}&maxResults=1`;
      const boardRes = await fetch(boardUrl, buildFetchOptions(authToken));
      if (!boardRes.ok) continue;
      const boardData = await boardRes.json();
      const boards = boardData.values || [];
      if (boards.length === 0) continue;

      const boardId = boards[0].id;
      const sprintUrl = `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active&maxResults=1`;
      const sprintRes = await fetch(sprintUrl, buildFetchOptions(authToken));
      if (!sprintRes.ok) continue;
      const sprintData = await sprintRes.json();
      const sprints = sprintData.values || [];
      if (sprints.length > 0) {
        return {
          success: true,
          sprintName: sprints[0].name,
          sprintGoal: sprints[0].goal || "",
        };
      }
    }
    return { success: true, sprintName: "", sprintGoal: "" };
  } catch (err) {
    return { success: false, sprintName: "", error: err.message };
  }
}

// ── Fetch issues via JQL search (new /search/jql endpoint) ─
async function fetchJiraIssues(baseUrl, jql, maxResults, authToken) {
  try {
    const params = new URLSearchParams({
      jql,
      maxResults: String(maxResults),
      fields:
        "summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components",
    });

    // Use the new /rest/api/3/search/jql endpoint (replaces deprecated /search)
    const url = `${baseUrl}/rest/api/3/search/jql?${params.toString()}`;
    const res = await fetch(url, buildFetchOptions(authToken));

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        error: `Jira API error (${res.status}): ${text.substring(0, 200)}`,
      };
    }

    const data = await res.json();
    const issues = (data.issues || []).map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name || "Unknown",
      statusCategory: issue.fields.status?.statusCategory?.name || "Unknown",
      updated: issue.fields.updated,
      created: issue.fields.created || "",
      priority: issue.fields.priority?.name || "",
      issueType: issue.fields.issuetype?.name || "",
      project: issue.fields.project?.name || "",
      projectKey: issue.fields.project?.key || "",
      resolution: issue.fields.resolution?.name || "",
      labels: issue.fields.labels || [],
      assignee: issue.fields.assignee?.displayName || "Unassigned",
      components: (issue.fields.components || []).map((c) => c.name),
    }));

    return { success: true, total: data.total, issues };
  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}
