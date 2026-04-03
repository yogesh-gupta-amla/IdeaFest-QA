/**
 * API Logger — Generates cURL commands for every Jira API call made by the extension.
 *
 * Usage:
 *   import { apiLogger } from './apiLogger';
 *   apiLogger.log('VALIDATE_AUTH', url, { method: 'GET', headers });
 *   apiLogger.getAll();   // returns all logged cURLs
 *   apiLogger.clear();
 *   apiLogger.print();    // console.table of all calls
 */

export interface ApiLogEntry {
  id: number;
  timestamp: string;
  label: string;
  method: string;
  url: string;
  curl: string;
  jql?: string;
  durationMs?: number;
}

let logEntries: ApiLogEntry[] = [];
let nextId = 1;

function buildCurl(
  method: string,
  url: string,
  headers: Record<string, string>,
): string {
  let cmd = `curl -X ${method}`;
  for (const [k, v] of Object.entries(headers)) {
    // Mask auth tokens in the logged cURL
    const safeVal =
      k.toLowerCase() === "authorization" ? `Basic <YOUR_TOKEN>` : v;
    cmd += ` \\\n  -H "${k}: ${safeVal}"`;
  }
  cmd += ` \\\n  "${url}"`;
  return cmd;
}

export const apiLogger = {
  log(
    label: string,
    url: string,
    opts: {
      method?: string;
      headers?: Record<string, string>;
      jql?: string;
      durationMs?: number;
    } = {},
  ): ApiLogEntry {
    const method = opts.method || "GET";
    const headers = opts.headers || { Accept: "application/json" };
    const entry: ApiLogEntry = {
      id: nextId++,
      timestamp: new Date().toISOString(),
      label,
      method,
      url,
      curl: buildCurl(method, url, headers),
      jql: opts.jql,
      durationMs: opts.durationMs,
    };
    logEntries.push(entry);
    return entry;
  },

  getAll(): ApiLogEntry[] {
    return [...logEntries];
  },

  getLast(n = 1): ApiLogEntry[] {
    return logEntries.slice(-n);
  },

  clear(): void {
    logEntries = [];
    nextId = 1;
  },

  print(): void {
    if (logEntries.length === 0) {
      console.log("[apiLogger] No API calls recorded.");
      return;
    }
    console.group(`[apiLogger] ${logEntries.length} API call(s) recorded`);
    for (const e of logEntries) {
      console.groupCollapsed(
        `#${e.id} ${e.label} (${e.durationMs ?? "?"}ms) — ${e.timestamp}`,
      );
      console.log(e.curl);
      if (e.jql) console.log("JQL:", e.jql);
      console.groupEnd();
    }
    console.groupEnd();
  },

  /** Export all entries as a single copyable text block */
  exportText(): string {
    const lines: string[] = [
      "# DSR Tool — API Call Log",
      `# Exported: ${new Date().toISOString()}`,
      `# Total Calls: ${logEntries.length}`,
      "",
    ];
    for (const e of logEntries) {
      lines.push(`## #${e.id} ${e.label}`);
      lines.push(`Timestamp: ${e.timestamp}`);
      if (e.durationMs !== undefined) lines.push(`Duration: ${e.durationMs}ms`);
      if (e.jql) lines.push(`JQL: ${e.jql}`);
      lines.push("");
      lines.push(e.curl);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
    return lines.join("\n");
  },
};

// ─────────────────────────────────────────────────────────────────────
// Reference cURL Templates
// ─────────────────────────────────────────────────────────────────────
//
// Below are cURL templates for every Jira REST endpoint this extension uses.
// Replace {{BASE_URL}} with your Jira instance URL (e.g., https://yourco.atlassian.net)
// Replace {{AUTH_TOKEN}} with your Base64-encoded email:api-token
// Replace {{PROJECT_KEY}} with the Jira project key (e.g., Z10LMC)
//
// ─── 1. Validate Auth (GET /rest/api/3/myself) ────────────────────────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/myself"
//
// ─── 2. Fetch Projects (GET /rest/api/3/project/search) ───────────────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/project/search?maxResults=100&orderBy=name&status=live"
//
// ─── 3a. Fetch Boards (GET /rest/agile/1.0/board) ─────────────────────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/agile/1.0/board?projectKeyOrId={{PROJECT_KEY}}&type=scrum&maxResults=1"
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/agile/1.0/board?projectKeyOrId={{PROJECT_KEY}}&type=kanban&maxResults=1"
//
// ─── 3b. Fetch Active Sprint (GET /rest/agile/1.0/board/{boardId}/sprint) ─────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/agile/1.0/board/{{BOARD_ID}}/sprint?state=active&maxResults=1"
//
// ─── 4. Open Issues — Dashboard (GET /rest/api/3/search/jql) ──────────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/search/jql?jql=project%20%3D%20%22{{PROJECT_KEY}}%22%20AND%20resolution%20%3D%20Unresolved%20AND%20created%20%3E%3D%20-7d%20ORDER%20BY%20priority%20ASC%2C%20created%20DESC&maxResults=100&fields=summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components,reporter,timeoriginalestimate,aggregatetimespent,resolutiondate,parent,customfield_10016,customfield_10020,duedate,description,comment,worklog,workratio&expand=changelog"
//
// ─── 5. Created Issues — Dashboard (GET /rest/api/3/search/jql) ───────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/search/jql?jql=project%20%3D%20%22{{PROJECT_KEY}}%22%20AND%20created%20%3E%3D%20-7d%20ORDER%20BY%20priority%20ASC%2C%20created%20DESC&maxResults=200&fields=summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components,reporter,timeoriginalestimate,aggregatetimespent,resolutiondate,parent,customfield_10016,customfield_10020,duedate,description,comment,worklog,workratio&expand=changelog"
//
// ─── 6. Resolved Issues — Dashboard (GET /rest/api/3/search/jql) ──────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/search/jql?jql=project%20%3D%20%22{{PROJECT_KEY}}%22%20AND%20resolved%20%3E%3D%20-7d%20ORDER%20BY%20resolved%20DESC&maxResults=200&fields=summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components,reporter,timeoriginalestimate,aggregatetimespent,resolutiondate,parent,customfield_10016,customfield_10020,duedate,description,comment,worklog,workratio&expand=changelog"
//
// ─── 7. Recently Resolved — Dashboard (GET /rest/api/3/search/jql) ────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/search/jql?jql=project%20%3D%20%22{{PROJECT_KEY}}%22%20AND%20resolved%20%3E%3D%20-7d%20ORDER%20BY%20resolved%20DESC&maxResults=500&fields=summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components,reporter,timeoriginalestimate,aggregatetimespent,resolutiondate,parent,customfield_10016,customfield_10020,duedate,description,comment,worklog,workratio&expand=changelog"
//
// ─── 8. Ageing Critical/Blockers (GET /rest/api/3/search/jql) ─────────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/search/jql?jql=project%20%3D%20%22{{PROJECT_KEY}}%22%20AND%20issuetype%20IN%20(Bug%2C%20Defect)%20AND%20priority%20IN%20(Blocker%2C%20Critical)%20AND%20status%20NOT%20IN%20(Done%2C%20%22QA%20Done%22%2C%20Rejected%2C%20%22Ready%20For%20Production%22%2C%20%22Ready%20for%20QA%22%2C%20%22Ready%20for%20Testing%22%2C%20%22Ready%20For%20UAT%22)%20AND%20created%20%3E%3D%20-7d%20ORDER%20BY%20created%20DESC&maxResults=500&fields=summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components,reporter,timeoriginalestimate,aggregatetimespent,resolutiondate,parent,customfield_10016,customfield_10020,duedate,description,comment,worklog,workratio&expand=changelog"
//
// ─── 9. Overburnt Items (GET /rest/api/3/search/jql) ──────────────────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/search/jql?jql=project%20%3D%20%22{{PROJECT_KEY}}%22%20AND%20workratio%20%3E%20100%20AND%20status%20%3D%20Done%20AND%20issuetype%20IN%20(Bug%2C%20Defect%2C%20Task%2C%20Sub-task)%20AND%20worklogDate%20%3E%3D%20-7d%20ORDER%20BY%20updated%20DESC&maxResults=500&fields=summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components,reporter,timeoriginalestimate,aggregatetimespent,resolutiondate,parent,customfield_10016,customfield_10020,duedate,description,comment,worklog,workratio&expand=changelog"
//
// ─── 10. Early Completions (GET /rest/api/3/search/jql) ───────────────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/search/jql?jql=project%20%3D%20%22{{PROJECT_KEY}}%22%20AND%20status%20%3D%20Done%20AND%20timeoriginalestimate%20%3E%200%20AND%20resolved%20%3E%3D%20-7d%20ORDER%20BY%20resolved%20DESC&maxResults=500&fields=summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components,reporter,timeoriginalestimate,aggregatetimespent,resolutiondate,parent,customfield_10016,customfield_10020,duedate,description,comment,worklog,workratio&expand=changelog"
//
// ─── 11. Code Intelligence (GET /rest/api/3/search/jql) ───────────────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/search/jql?jql=project%20%3D%20%22{{PROJECT_KEY}}%22%20AND%20status%20%3D%20Done%20AND%20issuetype%20IN%20(Story%2C%20Task%2C%20Sub-task%2C%20Epic%2C%20Bug%2C%20Defect)%20AND%20resolved%20%3E%3D%20-7d%20ORDER%20BY%20resolved%20DESC&maxResults=300&fields=summary,status,updated,created,priority,assignee,issuetype,project,resolution,labels,components,reporter,timeoriginalestimate,aggregatetimespent,resolutiondate,parent,customfield_10016,customfield_10020,duedate,description,comment,worklog,workratio&expand=changelog"
//
// ─── 12. Dev Status — Linked Commits/PRs (GET /rest/dev-status/latest/issue/detail) ──
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/dev-status/latest/issue/detail?issueId={{ISSUE_ID}}&applicationType=GitHub&dataType=repository"
//
// Fallback for Jira Server/DC:
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/dev-status/1.0/issue/detail?issueId={{ISSUE_ID}}&applicationType=stash&dataType=repository"
//
// ─── 13. Jira Explorer — Custom JQL (GET /rest/api/3/search/jql) ──────────────
//
// curl -X GET \
//   -H "Accept: application/json" \
//   -H "Authorization: Basic {{AUTH_TOKEN}}" \
//   "{{BASE_URL}}/rest/api/3/search/jql?jql={{YOUR_CUSTOM_JQL_URL_ENCODED}}&maxResults=500&fields=summary,status,issuetype,priority,assignee,reporter,project,components,labels,created,updated,resolutiondate,duedate,resolution,fixVersions,customfield_10016,customfield_10020,aggregatetimespent,timeoriginalestimate,parent,subtasks"
//
// ─────────────────────────────────────────────────────────────────────
