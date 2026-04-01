# Jira API Queries — Overview Tab

All queries are executed via `chrome.runtime.sendMessage({ type: "FETCH_JIRA" / "FETCH_ACTIVE_SPRINT" })` in `background.ts`.

---

## 1. Open Issues (StatsGrid · HealthBanner)

**Purpose:** Primary dataset for all Overview metrics — total open count, priority breakdown, status breakdown, issue type breakdown, must-fix list, blocked count, reopened count, component maps.

```
project = "<projectKey>" AND resolution = Unresolved ORDER BY priority ASC, created DESC
```

- Max results: **500**
- Fields fetched: `summary, status, updated, created, priority, assignee, issuetype, project, resolution, labels, components, reporter, timeoriginalestimate, aggregatetimespent, resolutiondate, parent, customfield_10016 (story points), customfield_10020 (sprint), duedate`

---

## 2. Today's Created Issues (StatsGrid — "Today's Reported" card)

**Purpose:** Count of new issues created today, plus today's priority breakdown.

```
project = "<projectKey>" AND created >= startOfDay() ORDER BY priority ASC
```

- Max results: **200**

---

## 3. Today's Resolved Issues (StatsGrid — "Today's Verified" card)

**Purpose:** Count of issues resolved/closed today.

```
project = "<projectKey>" AND resolved >= startOfDay() ORDER BY resolved DESC
```

- Max results: **200**

---

## 4. Active Sprint (HealthBanner — sprint name & goal)

**Endpoint:** `GET /rest/agile/1.0/board?projectKeyOrId=<projectKey>&type=scrum&maxResults=1`  
then: `GET /rest/agile/1.0/board/<boardId>/sprint?state=active&maxResults=1`

**Purpose:** Fetches the name and goal of the currently active sprint for display in the health banner. Falls back to kanban if no scrum board is found. Returns empty strings if no active sprint exists.

---

## Metrics Derived from Open Issues

| Metric               | Derivation                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Total Open**       | `openIssues.length`                                                                                          |
| **Today's Reported** | `todayCreated.length`                                                                                        |
| **Today's Verified** | `todayResolved.length`                                                                                       |
| **Must Fix**         | Issues where `priority IN (Highest, Critical, Blocker)` OR `labels` contains `must-fix / must_fix / mustfix` |
| **Blocked**          | Issues where `status` contains `block / impediment / waiting`                                                |
| **Reopened**         | Issues where `status` contains `reopen`                                                                      |
| **Bug Count**        | Issues where `issueType IN (Bug, Defect)`                                                                    |
| **Health (RAG)**     | Calculated automatically by `calculateHealth()` in `metricsService.ts` based on counts above                 |

---

## Authentication

All requests use one of two auth modes set during login:

- **Session auth:** `credentials: "include"` (browser Jira session cookie)
- **Token auth:** `Authorization: Basic <base64(email:apiToken)>` header

The active mode is stored in `useDashboardStore.authMode`.
