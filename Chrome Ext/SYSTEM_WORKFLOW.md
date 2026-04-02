# InSights AI — System Workflow Document

> **Product**: InSights AI (DSR Assistant)
> **Type**: Chrome Extension (Manifest V3)
> **Stack**: React 18 · TypeScript · Vite · Ant Design 6 · Recharts · Zustand · jsPDF · html2canvas · SheetJS (xlsx)

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Data Flow Pipeline](#3-data-flow-pipeline)
4. [Authentication & Security](#4-authentication--security)
5. [Jira REST API Integration](#5-jira-rest-api-integration)
6. [JQL Queries — Complete Reference](#6-jql-queries--complete-reference)
7. [State Management](#7-state-management)
8. [AI & Analytics Engine](#8-ai--analytics-engine)
9. [Algorithms — Detailed Breakdown](#9-algorithms--detailed-breakdown)
10. [Page-by-Page Functional Reference](#10-page-by-page-functional-reference)
11. [Theming System](#11-theming-system)
12. [Export System](#12-export-system)
13. [Time Range System](#13-time-range-system)
14. [Sequence Diagrams](#14-sequence-diagrams)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome Extension (Manifest V3)                │
│                                                                  │
│  ┌──────────────┐     Chrome Messages     ┌──────────────────┐  │
│  │   React App  │ ◄─────────────────────► │  Service Worker  │  │
│  │  (index.html)│    sendMessage / onMsg   │  (background.ts) │  │
│  │              │                          │                  │  │
│  │  ┌────────┐  │                          │  REST API Calls  │  │
│  │  │ Zustand│  │                          │  to Jira Cloud   │  │
│  │  │ Store  │  │                          └────────┬─────────┘  │
│  │  └────────┘  │                                   │            │
│  │  ┌────────┐  │                                   ▼            │
│  │  │ Hooks  │  │                          ┌──────────────────┐  │
│  │  └────────┘  │                          │  Jira Cloud API  │  │
│  │  ┌────────┐  │                          │  *.atlassian.net │  │
│  │  │  Utils │  │                          └──────────────────┘  │
│  │  │(AI/Calc)│ │                                                │
│  │  └────────┘  │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

The extension follows a **two-process architecture**:

| Layer              | File            | Role                                                                                                                                                          |
| ------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Service Worker** | `background.ts` | Runs in Chrome's background context. Handles all HTTP requests to Jira Cloud REST APIs. Receives messages from the frontend via `chrome.runtime.sendMessage`. |
| **Frontend App**   | `src/` (React)  | Full SPA opened in a new tab when the extension icon is clicked. Contains all UI, state management, calculation/AI logic, and export functionality.           |

Communication between them is strictly via **Chrome runtime messaging** — the frontend never makes direct HTTP calls to Jira.

---

## 2. Technology Stack

| Category             | Technology                      | Purpose                                                                          |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| **Runtime**          | Chrome Extension Manifest V3    | Extension packaging, permissions, service worker lifecycle                       |
| **UI Framework**     | React 18.3                      | Component-based reactive UI                                                      |
| **Language**         | TypeScript                      | Type safety across the entire codebase                                           |
| **Build Tool**       | Vite 4                          | Dev server, HMR, production bundling                                             |
| **UI Library**       | Ant Design 6.3                  | Table, Card, Tag, Progress, Modal, Select, Tabs, and other UI primitives         |
| **Icons**            | Lucide React, @ant-design/icons | Icon sets                                                                        |
| **Charts**           | Recharts 2.13                   | BarChart, PieChart, LineChart, RadialBarChart for all dashboard visualizations   |
| **State Management** | Zustand 5                       | Lightweight global store with no boilerplate                                     |
| **Date Handling**    | dayjs                           | Date manipulation and formatting                                                 |
| **PDF Export**       | jsPDF + html2canvas             | Full-page PDF capture                                                            |
| **Excel Export**     | SheetJS (xlsx)                  | Issue-level data export to .xlsx                                                 |
| **Persistence**      | Chrome Storage API              | `chrome.storage.local` for auth credentials, selected project, theme, time range |

---

## 3. Data Flow Pipeline

### 3.1 High-Level Flow

```
User selects project / changes time range / clicks Refresh
                        │
                        ▼
                  App.tsx (loadProject)
                        │
          ┌─────────────┼──────────────┐
          │             │              │
          ▼             ▼              ▼
    7 parallel     Sprint info    Metrics
   JQL fetches     fetch          calculation
          │             │              │
          ▼             ▼              ▼
    Zustand Store (rawIssues, recentlyResolved,
                   ageingIssues, overburntIssues,
                   projectMetrics, sprintName)
                        │
                        ▼
          useQAData hook (per-page selectors)
          Reads store → transforms via qaCalculations
                        │
                        ▼
              QA Page Components
     (ProjectHealth, AgeingAnalysis, etc.)
```

### 3.2 Fetch Trigger Points

| Trigger                   | What Happens                                                |
| ------------------------- | ----------------------------------------------------------- |
| **Project selection**     | Full `loadProject()` — all 7 JQL queries + sprint + metrics |
| **Today/Weekly toggle**   | Full `loadProject()` re-run with new time range clause      |
| **Refresh (Sync) button** | Full `loadProject()` re-run with current settings           |
| **Tab change**            | **No refetch** — pages reuse store data through hooks       |
| **Jira Explorer "Run"**   | Separate on-demand `runJqlQuery()` for arbitrary user JQL   |

### 3.3 Data Transformation Chain

```
Jira REST API response (raw JSON)
        │
        ▼
background.ts — parses into JiraIssue interface
(includes changelog → statusChanges, reopenCount, assigneeChanges,
 worklog → worklogs array, workratio, description → plain text)
        │
        ▼
jiraToQA.ts — mapJiraToQAIssues()
Converts JiraIssue → QAIssue with:
  - SLA hours (computed per priority)
  - Normalized status
  - Module extraction from components
  - Environment extraction from labels
  - Worklog mapping (author, hours, date)
  - originalStatus preservation for ageing filters
        │
        ▼
qaCalculations.ts — domain-specific algorithms
(health scoring, ageing analysis, overburn classification, etc.)
        │
        ▼
React Components — render data with Ant Design + Recharts
```

---

## 4. Authentication & Security

### 4.1 Auth Modes

| Mode                         | How It Works                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Browser Session (Cookie)** | User is already logged into Jira in Chrome. Requests use `credentials: "include"` to send session cookies. No token stored.                                   |
| **API Token (Basic Auth)**   | User provides email + API token. Encoded as Base64 `email:token` and sent as `Authorization: Basic <encoded>` header. Token stored in `chrome.storage.local`. |

### 4.2 Auth Validation

On connection, the app calls `GET /rest/api/3/myself` to verify credentials. If successful, the user's display name, email, and avatar are returned.

### 4.3 Security Boundaries

- All Jira HTTP calls happen **only in the service worker** (`background.ts`), never in the frontend.
- `host_permissions` is scoped to `https://*.atlassian.net/` only.
- API tokens are stored in Chrome's encrypted `storage.local`, not in plain localStorage.
- No data leaves the browser — all AI/analytics processing is **client-side only**.

---

## 5. Jira REST API Integration

### 5.1 Endpoints Used

| #   | Endpoint                                                                         | Purpose                              | Called By             |
| --- | -------------------------------------------------------------------------------- | ------------------------------------ | --------------------- |
| 1   | `GET /rest/api/3/myself`                                                         | Validate auth credentials            | `validateAuth()`      |
| 2   | `GET /rest/api/3/project/search?maxResults=100&orderBy=name&status=live`         | List all projects                    | `fetchProjects()`     |
| 3   | `GET /rest/agile/1.0/board?projectKeyOrId={key}&type=scrum\|kanban&maxResults=1` | Find project board                   | `fetchActiveSprint()` |
| 4   | `GET /rest/agile/1.0/board/{boardId}/sprint?state=active&maxResults=1`           | Get active sprint                    | `fetchActiveSprint()` |
| 5   | `GET /rest/api/3/search/jql?jql=...&fields=...&expand=changelog`                 | Dashboard issue search (paginated)   | `fetchJiraIssues()`   |
| 6   | `GET /rest/api/3/search/jql?jql=...&fields=...`                                  | Explorer issue search (no changelog) | `runJqlQuery()`       |

### 5.2 Fields Requested

**Dashboard fetch** (`fetchJiraIssues`): summary, status, updated, created, priority, assignee, issuetype, project, resolution, labels, components, reporter, timeoriginalestimate, aggregatetimespent, resolutiondate, parent, customfield_10016 (story points), customfield_10020 (sprint), duedate, description, comment, worklog, workratio + `expand=changelog`

**Explorer fetch** (`runJqlQuery`): summary, status, issuetype, priority, assignee, reporter, project, components, labels, created, updated, resolutiondate, duedate, resolution, fixVersions, customfield_10016, customfield_10020, aggregatetimespent, timeoriginalestimate, parent, subtasks

### 5.3 Pagination

Dashboard fetches paginate in pages of 100, capped at `maxResults` (default varies by query type, up to 2000). Each page increments `startAt`. Loop breaks when all issues are retrieved or the cap is reached.

---

## 6. JQL Queries — Complete Reference

All queries are parameterized with `{projectKey}` and a time range clause from `queryTimeRange.ts`.

### 6.1 Time Range Clauses

| Range      | Created Clause            | Resolved Clause            |
| ---------- | ------------------------- | -------------------------- |
| **Weekly** | `created >= -7d`          | `resolved >= -7d`          |
| **Today**  | `created >= startOfDay()` | `resolved >= startOfDay()` |

### 6.2 Dashboard Queries (run in parallel on project load)

| #   | Name                  | JQL Template                                                                                                                                                                                                                                                 | Max Results | Store Target               |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | -------------------------- |
| 1   | **Open Issues**       | `project = "{key}" AND resolution = Unresolved AND {createdClause} ORDER BY priority ASC, created DESC`                                                                                                                                                      | 500         | `rawIssues`                |
| 2   | **Created in Range**  | `project = "{key}" AND {createdClause} ORDER BY priority ASC, created DESC`                                                                                                                                                                                  | 500         | merged into `rawIssues`    |
| 3   | **Resolved in Range** | `project = "{key}" AND {resolvedClause} ORDER BY resolved DESC`                                                                                                                                                                                              | 500         | merged into `rawIssues`    |
| 4   | **Recently Resolved** | `project = "{key}" AND {resolvedClause} ORDER BY resolved DESC`                                                                                                                                                                                              | 200         | `recentlyResolved`         |
| 5   | **Ageing Issues**     | `project = "{key}" AND issuetype IN (Bug, Defect) AND priority IN (Blocker, Critical) AND status NOT IN (Done, "QA Done", Rejected, "Ready For Production", "Ready for QA", "Ready for Testing", "Ready For UAT") AND {createdClause} ORDER BY created DESC` | 500         | `ageingIssues`             |
| 6   | **Overburnt Issues**  | `project = "{key}" AND workratio > 100 AND status = Done AND issuetype IN (Bug, Defect, Task, Sub-task) AND worklogDate >= -7d ORDER BY updated DESC` (weekly) or `worklogDate >= startOfDay()` (today)                                                      | 500         | `overburntIssues`          |
| 7   | **Active Sprint**     | Board + Sprint agile API calls (not JQL)                                                                                                                                                                                                                     | —           | `sprintName`, `sprintGoal` |

### 6.3 Jira Explorer Query (on-demand)

| Name              | JQL Template                                                           | Max Results |
| ----------------- | ---------------------------------------------------------------------- | ----------- |
| **Explorer Base** | `project = "{key}" AND {createdClause} ORDER BY created DESC`          | 500         |
| **Custom Query**  | User-entered JQL (auto-injected time range if no explicit date clause) | 500         |

---

## 7. State Management

### 7.1 Zustand Store (`useStore.ts`)

The app uses a single Zustand store (`useDashboardStore`) with these key slices:

| Slice                        | Type                  | Purpose                                              |
| ---------------------------- | --------------------- | ---------------------------------------------------- |
| `themeId`                    | string                | Active theme ID                                      |
| `activeSection`              | string                | Current tab/page (persisted to chrome.storage)       |
| `queryTimeRange`             | `"today" \| "weekly"` | Global time range selector                           |
| `projectKey` / `projectName` | string                | Selected Jira project                                |
| `projectMetrics`             | `Metrics`             | Computed metrics for the selected project            |
| `rawIssues`                  | `JiraIssue[]`         | Primary issue dataset (open + created + resolved)    |
| `recentlyResolved`           | `JiraIssue[]`         | Issues resolved in time range                        |
| `ageingIssues`               | `JiraIssue[]`         | Dedicated ageing JQL results                         |
| `overburntIssues`            | `JiraIssue[]`         | Dedicated overburnt JQL results                      |
| `projectDataLoaded`          | boolean               | Explicit load-complete flag                          |
| `filters`                    | `DashboardFilters`    | UI filters (severity, assignee, module, environment) |

### 7.2 Persistence Layer (`chromeStorage.ts`)

Uses `chrome.storage.local` for:

- Jira URL, auth token, auth mode
- Selected project key/name
- Active section (tab)
- Theme preference
- Time range selection

### 7.3 Data Hook (`useQAData.ts`)

Central bridge between raw store data and page-specific calculations:

```
useQAData() → {
  qaIssues           // All rawIssues mapped through jiraToQA
  ageingQAIssues     // Dedicated ageing issues mapped through jiraToQA
  overburntQAIssues  // Dedicated overburnt issues mapped through jiraToQA
  health             // calculateProjectHealth(qaIssues, resolved, timeRange)
  ageingAnalysis     // calculateAgeingAnalysis(ageingQAIssues)
  overburntAnalysis  // calculateOverburntAnalysis(overburntQAIssues)
  aiAnalysis         // generateFullAIAnalysis(projectKey, ...)
  ...other derived views
}
```

---

## 8. AI & Analytics Engine

### 8.1 Where AI Is Used

> **Important**: All AI/analytics in this system are **client-side rule-based engines**. No external LLM or ML model is called. The "AI" label refers to intelligent heuristic analysis that mimics AI-style reasoning.

| Module                         | File                                               | What It Does                                                                                                                                                                                     |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Project Health AI Judgment** | `ProjectHealth.tsx → analyzeHealthData()`          | GREEN/ORANGE classification with risk reasoning, severity spike detection, unit level leakage check, QA velocity assessment                                                                      |
| **AI Project Analysis**        | `aiAnalysis.ts → generateFullAIAnalysis()`         | Full structured output: health score (0-100), executive summary, headline recommendation, story-with-max-bugs KPI, immediate actions, risk predictions, resource optimization, prioritized fixes |
| **Ageing Risk Engine**         | `qaCalculations.ts → calculateAgeingAnalysis()`    | 48-hour SLA escalation, 8-hour fresh bug detection, risk scoring, module hotspot detection                                                                                                       |
| **Overburn Intelligence**      | `qaCalculations.ts → calculateOverburntAnalysis()` | Severity classification, worklog-based contributor analysis, assignee mismatch detection, root cause inference, AI headline generation                                                           |
| **Flow Impact Assessment**     | `qaCalculations.ts → calculateFlowImpact()`        | NLP keyword matching for functional/failure terms, domain-aware risk classification                                                                                                              |
| **Metrics Health (RAG)**       | `metricsService.ts → calculateHealth()`            | Weighted scoring system for Red/Amber/Green banner                                                                                                                                               |
| **Recommendation Generator**   | `qaCalculations.ts → generateAIRecommendations()`  | Top-3 prioritized recommendations from cross-cutting analysis                                                                                                                                    |

### 8.2 What "AI" Means Here

The AI engine is a **deterministic, rule-based analytical system** with these characteristics:

1. **No external API calls** — all processing happens in the browser
2. **No machine learning models** — uses heuristic scoring and threshold-based classification
3. **Structured reasoning** — applies domain rules (SLA thresholds, severity ratios, workload distribution) to produce insights
4. **Confidence scoring** — confidence levels (High/Medium/Low) are derived from sample size and signal strength, not statistical models
5. **Root cause inference** — pattern matching on issue attributes (reopen count, comment volume, status transitions) to identify likely causes

---

## 9. Algorithms — Detailed Breakdown

### 9.1 Project Health Score (0–100)

**File**: `qaCalculations.ts → calculateProjectHealth()`

```
Inputs:
  - Active issues (status NOT IN resolved/done)
  - Critical/Blocker count
  - SLA breach count
  - Reopened issue count
  - Closure rate (resolved / created in time range)

RED condition (any triggers RED):
  - Critical/Blocker ratio > 5% of total
  - Any SLA breach
  - Reopen ratio > 15%
  - Closure rate < 80%

Score formula:
  RED:   max(10, 60 - criticalCount×5 - slaBreachCount×8 - reopenCount×3)
  GREEN: min(95, 75 + (closureRate - 0.8) × 50)
```

### 9.2 Project Health AI Judgment (GREEN/ORANGE)

**File**: `ProjectHealth.tsx → analyzeHealthData()`

```
Three independent risk checks:

1. High Severity Spike:
   - Count Blocker + Critical in created-in-range issues
   - If > 40% of total → SPIKE DETECTED
   - Identify top impacted modules from component distribution

2. Unit Level Defect Leakage:
   - Count issues with label matching "unit level" (case-insensitive, normalized)
   - If > 10% of total → HIGH RISK

3. QA Velocity Assessment:
   - Count issues in "QA Done", "Ready For Testing", "Ready For Production"
   - Throughput: >30 = High, >15 = Medium, else Low
   - Imbalance: if completed < 50% of in-testing → LOW velocity

Decision:
  ORANGE if ANY of: highSeveritySpike OR unitLevelHigh OR qaVelocityLow
  GREEN  if NONE triggered
```

### 9.3 Ageing Analysis

**File**: `qaCalculations.ts → calculateAgeingAnalysis()`

```
SLA Hours by Priority:
  Blocker  → 4 hours
  Critical → 8 hours
  High     → 24 hours
  Medium   → 48 hours
  Low      → 72 hours

Ageing Status Classification:
  slaRatio = hoursElapsed / slaHours
  FRESH    → slaRatio < 0.5 (less than half SLA consumed)
  AT_RISK  → 0.5 ≤ slaRatio < 1.0 (approaching SLA)
  AGED     → slaRatio ≥ 1.0 (SLA breached)

  Override: if hours > 48 AND status IN (Backlog, Open) → escalate FRESH to AT_RISK

Risk Score (0–100):
  Base     = slaRatio × 50
  +20      if module IN high-risk modules (Checkout, Payment, Login, etc.)
  +20      if environment IN production environments
  +5×N     for each reopen count
  +10      if only 1 status change AND hours > 24 (stuck)

Three Query Categories (client-side filters):
  1. Reported >48 Hrs:        status IN (Backlog, Open) AND hoursElapsed > 48
  2. Total Critical/Blockers: all items from ageing fetch (broadest)
  3. Fresh Bugs:              status IN (Backlog, Open) AND hoursElapsed > 8
```

### 9.4 Overburn Severity Classification

**File**: `qaCalculations.ts → calculateOverburntAnalysis()`

```
Overburn Percentage:
  If workratio available from Jira → use directly
  Else → (timeSpent / originalEstimate) × 100

Severity Tiers:
  Moderate → 100–130%
  High     → 130–160%
  Critical → >160%

Contributor Analysis (from worklogs):
  - Build per-user time map from worklog entries
  - Identify top contributor and their % of total effort
  - Detect assignee vs actual contributor mismatch
  - Cross-issue aggregation: proportional excess attribution per user

Root Cause Inference:
  - reopenCount > 0             → "rework/reopened cycles"
  - assigneeChanges > 1         → "multiple handoffs"
  - contributorCount > 2        → "too many contributors"
  - statusChanges > 6           → "excessive status transitions"
  - commentsCount > 10          → "unclear requirements"
  - timeLogged > 2× estimate    → "severe underestimation"
  - None of above               → "general inefficiency or scope creep"

AI Headline Generation:
  Priority order:
  1. If >30% items have reopens    → "Reduce rework cycles to cut overburn by ~X%"
  2. If >20% have assignee mismatch → "Fix assignee-contributor alignment to save ~Xh"
  3. If >20% have multiple handoffs → "Stabilize task ownership to reduce overburn by ~X%"
  4. If critical items exist        → "Address N critically overburnt items to recover ~Xh"
  5. Default                        → "Improve estimation accuracy to reduce overburn"
```

### 9.5 Flow Impact Risk Assessment

**File**: `qaCalculations.ts → calculateFlowImpact()`

```
NLP Keyword Matching:
  Functional keywords: checkout, payment, login, authentication, api, integration,
                       database, migration, security, performance, deploy,
                       configuration, network
  Failure keywords:    crash, freeze, hang, timeout, unresponsive, 404, error,
                       500, corrupt, data loss, system

Domain Risk:
  High-risk domains: Checkout, Payment, Login

Sprint Risk Matrix:
  HIGH   → high priority AND high-risk domain
  MEDIUM → high priority OR (high-risk domain AND failure keyword)
  LOW    → has functional keyword
  NONE   → no signals

Release Impact Matrix:
  HIGH   → high priority AND failure keyword
  MEDIUM → high priority OR (failure keyword AND high-risk domain)
  LOW    → has functional keyword
  NONE   → no signals

Overall Risk = max(sprintRisk, releaseImpact)
```

### 9.6 Full AI Project Analysis

**File**: `aiAnalysis.ts → generateFullAIAnalysis()`

```
Health Score (0–100):
  Start at 70
  - High severity ratio penalty:     -(ratio × 30), capped at 25
  - Open issues penalty:             -(openCount × 0.3), capped at 15
  - Reopen rate penalty:             -(reopenRatio × 20), capped at 15
  - Missing estimates penalty:       -(missingRatio × 10), capped at 10
  - Closure rate bonus:              +(closureRate × 15), capped at 15
  - Resolved count bonus:            +(resolvedCount × 0.2), capped at 10
  Final: clamped to 0–100

Story-with-Max-Bugs KPI:
  - Group bugs by parent epic/component
  - Find the bucket with most issues
  - Infer root cause from: reopen patterns, severity concentration,
    comment traffic, missing estimates

Resource Utilization:
  - Count open issues per assignee
  - Calculate average workload
  - Overutilized: >1.5× average → burnout risk
  - Underutilized: <0.5× average → capacity available
  - Imbalance ratio: (max - min) / average

Confidence Level:
  High   → sample ≥ 12 OR strong signals ≥ 3
  Medium → sample ≥ 5 OR strong signals ≥ 1
  Low    → below both thresholds
```

### 9.7 Metrics Service Health (RAG Banner)

**File**: `metricsService.ts → calculateHealth()`

```
Weighted scoring system:
  Critical/Blocker > 5  → +4 (danger)
  Critical/Blocker > 0  → +2 (warning)
  Must-fix > 15         → +3 (danger)
  Must-fix > 5          → +1 (warning)
  Blocked > 10          → +3 (danger)
  Blocked > 3           → +1 (warning)
  Total open > 200      → +2 (warning)
  Total open > 100      → +1 (warning)
  New > 2× resolved     → +1 (warning)

Health status:
  score ≥ 6 → RED
  score ≥ 3 → YELLOW
  score < 3 → GREEN
```

---

## 10. Page-by-Page Functional Reference

### 10.1 Project Health

| Section                  | Source                                    | Description                                                            |
| ------------------------ | ----------------------------------------- | ---------------------------------------------------------------------- |
| Health Status Banner     | `metricsService.ts`                       | RED/YELLOW/GREEN with weighted score                                   |
| AI Health Analysis       | `ProjectHealth.tsx → analyzeHealthData()` | GREEN/ORANGE judgment with severity spike, unit leakage, QA velocity   |
| Defect Trend Chart       | `qaCalculations.ts`                       | Bar chart: created vs resolved per day (weekly) or per hour (today)    |
| Severity Distribution    | `qaCalculations.ts`                       | Pie chart: Blocker/Critical/High/Medium/Low                            |
| Daily Bug Creation Table | Component-level                           | Expandable table: Jira ID, Assignee, Priority, Status per period       |
| Three JQL Categories     | Component-level                           | Generic active bugs, Product Side (blocked), Launch Side (not blocked) |
| Key Risk Insights        | `analyzeHealthData()`                     | Top 5 data-driven risks                                                |
| RED Areas                | `analyzeHealthData()`                     | Top modules by high-severity concentration                             |
| Quality Concerns         | `analyzeHealthData()`                     | Unit level defect leakage analysis                                     |
| QA Velocity Insight      | `analyzeHealthData()`                     | Throughput assessment with imbalance detection                         |
| Recommended Actions      | `analyzeHealthData()`                     | 3–5 actionable recommendations                                         |

### 10.2 Ageing Analysis

| Section         | Source                      | Description                                                                      |
| --------------- | --------------------------- | -------------------------------------------------------------------------------- |
| Summary Cards   | `calculateAgeingAnalysis()` | Total Critical/Blockers, Reported >48 Hrs, Fresh Bugs, FRESH/AT_RISK/AGED counts |
| Category Tabs   | Component-level             | Switch between Total Critical/Blockers, Reported >48 Hrs, Fresh Bugs             |
| Issue Table     | Component-level             | Key, Summary, Priority, Status, Age (hours), SLA, Risk Score                     |
| Risk Insights   | `calculateAgeingAnalysis()` | SLA breach alerts, blocked items, module hotspots                                |
| Recommendations | `calculateAgeingAnalysis()` | Actionable steps to reduce ageing                                                |

### 10.3 Bug Leakage

| Section             | Source                  | Description                               |
| ------------------- | ----------------------- | ----------------------------------------- |
| Leaked Items        | `calculateBugLeakage()` | Issues that escaped earlier test phases   |
| Leakage by Phase    | Component-level         | Distribution across Dev → QA → UAT → Prod |
| Root Cause Analysis | Component-level         | Patterns in leaked bugs                   |

### 10.4 Flow Impact

| Section          | Source                  | Description                                                       |
| ---------------- | ----------------------- | ----------------------------------------------------------------- |
| Impact Matrix    | `calculateFlowImpact()` | Sprint risk × Release impact grid                                 |
| Keyword Analysis | NLP engine              | Functional + failure keyword detection                            |
| Domain Risk      | Rule-based              | High-risk domain flagging                                         |
| Issue Table      | Component-level         | Key, Summary, Sprint Risk, Release Impact, Overall Risk, Keywords |

### 10.5 Overburnt Items

| Section                   | Source                         | Description                                                              |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Severity Overview         | `calculateOverburntAnalysis()` | Moderate/High/Critical counts                                            |
| Executive Summary         | `calculateOverburntAnalysis()` | AI-generated narrative                                                   |
| AI Headline               | `calculateOverburntAnalysis()` | Top recommendation with impact % and confidence                          |
| Overburnt Details Tab     | Detailed analysis              | Per-issue: severity, overburn %, contributor, root cause, actionable fix |
| Contributor Analysis Tab  | Cross-issue                    | Top overburn contributors, assignee-mismatch detection                   |
| Additional Insights Tab   | Pattern analysis               | High-risk issue types, priority-based overburn, cycle time flags         |
| Resource Optimization Tab | Workload analysis              | Overutilized/underutilized resources with recommendations                |

### 10.6 Top Stories

| Section        | Source                  | Description                                                    |
| -------------- | ----------------------- | -------------------------------------------------------------- |
| Story Rankings | `calculateTopStories()` | Stories/epics ranked by bug count, critical count, reopen rate |
| Bug Density    | Calculation             | Bugs per story with severity breakdown                         |

### 10.7 AI Recommendations

| Section                 | Source          | Description                                                  |
| ----------------------- | --------------- | ------------------------------------------------------------ |
| Health Score Gauge      | `aiAnalysis.ts` | 0–100 radial gauge                                           |
| Executive Summary       | `aiAnalysis.ts` | AI-generated project summary                                 |
| Headline Recommendation | `aiAnalysis.ts` | Top action with impact % and confidence                      |
| Story-with-Max-Bugs KPI | `aiAnalysis.ts` | Highest bug-density story with root cause and recommendation |
| Immediate Actions       | `aiAnalysis.ts` | Severity-tagged action items                                 |
| Risks & Predictions     | `aiAnalysis.ts` | Probability-tagged risks with mitigation strategies          |
| Resource Suggestions    | `aiAnalysis.ts` | Overutilized/underutilized resource tables                   |
| Optimization Tips       | `aiAnalysis.ts` | Area-specific improvement recommendations                    |
| Resource Optimization   | `aiAnalysis.ts` | Problem → Current State → Action → Expected Outcome          |
| Prioritized Fixes       | `aiAnalysis.ts` | Top 3 ranked fixes with impact justification                 |

### 10.8 Jira Explorer

| Section              | Source              | Description                                          |
| -------------------- | ------------------- | ---------------------------------------------------- |
| JQL Editor           | Component-level     | Textarea with base JQL and custom query support      |
| Time Range Injection | `queryTimeRange.ts` | Auto-applies Today/Weekly if no explicit date clause |
| Results Table        | `runJqlQuery()`     | Full issue table with sorting, filtering, pagination |
| Quick Filters        | Component-level     | Priority, status, assignee filters                   |

### 10.9 Project Overview

| Section        | Source              | Description                                              |
| -------------- | ------------------- | -------------------------------------------------------- |
| Stats Grid     | `metricsService.ts` | Total open, today new, today resolved, blocked, critical |
| Status Summary | Store metrics       | Distribution by status category                          |
| Sprint Info    | Agile API           | Active sprint name and goal                              |

---

## 11. Theming System

**File**: `themes/index.ts`

The app ships with multiple themes, selectable from the header:

| Theme             | ID                 | Type  |
| ----------------- | ------------------ | ----- |
| Dark Professional | `dark-pro`         | Dark  |
| Light Enterprise  | `light-enterprise` | Light |
| Ocean Blue        | `ocean-blue`       | Dark  |
| Forest Green      | `forest-green`     | Dark  |

Each theme defines 15 CSS custom properties (`--qa-bg-primary`, `--qa-text-primary`, `--qa-accent`, etc.) plus an Ant Design algorithm override (dark/default). Theme selection is persisted to chrome.storage.

---

## 12. Export System

**File**: `utils/exportUtils.ts`

| Format    | Library             | Scope                                          |
| --------- | ------------------- | ---------------------------------------------- |
| **PNG**   | html2canvas         | Individual chart containers                    |
| **PDF**   | jsPDF + html2canvas | Full dashboard page (landscape A4, multi-page) |
| **Excel** | SheetJS (xlsx)      | Issue-level data tables per analysis type      |

Export functions: `downloadChartAsPNG()`, `exportDashboardToPDF()`, and per-page Excel exporters for QA issues, ageing items, bug leakage, and overburnt items.

---

## 13. Time Range System

**File**: `utils/queryTimeRange.ts`

The global Today/Weekly selector in the header controls all data:

| Function                                 | Purpose                                                      |
| ---------------------------------------- | ------------------------------------------------------------ |
| `getCreatedTimeRangeClause(range)`       | Returns `created >= startOfDay()` or `created >= -7d`        |
| `getResolvedTimeRangeClause(range)`      | Returns `resolved >= startOfDay()` or `resolved >= -7d`      |
| `appendClauseBeforeOrderBy(jql, clause)` | Injects a clause before ORDER BY in existing JQL             |
| `hasExplicitDateConstraint(jql)`         | Checks if JQL already has created/resolved/updated filter    |
| `applyExplorerTimeRange(jql, range)`     | Auto-injects time range into Explorer queries if not present |

When the time range changes, `App.tsx → loadProject()` re-runs all 7 dashboard queries with the new clauses.

---

## 14. Sequence Diagrams

### 14.1 Initial Load

```
User clicks extension icon
  → chrome.action.onClicked → opens index.html in new tab
  → React app mounts (App.tsx)
  → Reads chrome.storage.local for saved config
  → If auth + project saved:
      → loadProject(projectKey, timeRange)
      → 7 parallel fetchJiraIssues() calls via chrome.runtime.sendMessage
      → background.ts receives FETCH_JIRA messages
      → background.ts calls Jira REST API (paginated)
      → Results sent back to frontend
      → Store updated (rawIssues, recentlyResolved, ageingIssues, overburntIssues)
      → projectDataLoaded = true
      → useQAData hook recomputes all derived data
      → Active page renders
```

### 14.2 Project Switch

```
User selects new project from header dropdown
  → App.tsx saves projectKey to chrome.storage
  → loadProject(newProjectKey, currentTimeRange)
  → Same parallel fetch flow as initial load
  → Store updated with new project data
  → Active tab PRESERVED (not reset)
  → Page re-renders with new data
```

### 14.3 Time Range Change

```
User toggles Today/Weekly in header
  → Store: queryTimeRange updated
  → App.tsx: loadProject(currentProject, newTimeRange)
  → JQL clauses change (startOfDay() vs -7d)
  → Full refetch with new time window
  → All pages reflect new data on next render
```

### 14.4 Refresh/Sync

```
User clicks Sync button
  → Same as loadProject(currentProject, currentTimeRange)
  → Full refetch of all 7 queries with latest Jira data
  → Store replaced with fresh results
```

---

## Summary

InSights AI is a **fully client-side, rule-based analytics engine** packaged as a Chrome Extension. It fetches live Jira data through authenticated REST API calls, transforms that data through a chain of domain-specific algorithms, and presents actionable insights through a themed dashboard UI. All intelligence — health scoring, risk detection, overburn analysis, flow impact assessment, and recommendation generation — runs entirely in the browser with zero external AI/ML dependencies.
