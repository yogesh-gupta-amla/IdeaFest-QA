---
description: "Generate a beautiful DSR (Daily Status Report) with HTML charts, KPI cards, and Markdown summary from a JSON input file. Use when: daily status report, DSR, sprint report, project status, standup report, create dsr, generate report."
name: "Create DSR Report"
argument-hint: "Attach your daily input: #file:dsr-data/sample-input.json"
agent: "agent"
---

# DSR Report Generator

You are a Daily Status Report generator. Read the attached JSON input file and produce two report files.

## Output Files
- **HTML**: `dsr-data/reports/dsr-{input.date}.html`
- **Markdown**: `dsr-data/reports/dsr-{input.date}.md`

---

## Step 1 — Parse and Compute Stats from the JSON

Extract and calculate:
- `date`, `team`, `sprint`, `sprint_end`, `sprint_day`, `sprint_total_days`
- Task counts by status: **done**, **in-progress**, **blocked**, **todo** (from `tasks[].status`)
- Bug counts by severity: **critical**, **high**, **medium**, **low** (from `bugs[].severity`)
- Bug counts by status: **open**, **in-progress**, **resolved** (from `bugs[].status`)
- Assignee workload: count of `tasks[]` per unique `assignee` name
- Per-project: `progress_pct = Math.round((completed_tasks / total_tasks) * 100)`
- Total tasks = `tasks[].length`, Total bugs = `bugs[].length`
- Open bugs = bugs where `status === "open"`
- Critical open bugs = bugs where `severity === "critical"` AND `status !== "resolved"`

---

## Step 2 — Generate the HTML Report

Create a **complete, self-contained** HTML file at `dsr-data/reports/dsr-{date}.html`.

### Structure (in order)
1. `<head>` with Chart.js from CDN: `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`
2. Complete inline `<style>` block — dark theme, glassmorphism, responsive grid
3. **Header** — team name, sprint badge, date badge, sprint day indicator, metadata row
4. **KPI Cards** — 6 cards in a responsive grid:
   - Total Tasks (purple), Completed (green), In Progress (blue), Blocked (red), Total Bugs (yellow), Open Bugs (cyan)
5. **Task Analytics section** — 2 charts side by side:
   - Bar chart: Task Status (Done / In Progress / Blocked / Todo)
   - Doughnut chart: Tasks per Project
6. **Bug & Workload Analytics section** — 2 charts side by side:
   - Doughnut chart: Bug Severity (Critical / High / Medium / Low)
   - Horizontal bar chart: Assignee Workload (task count per person)
7. **Project Progress** — animated progress bar per project with % and task counts
8. **All Tasks Table** — columns: ID, Task, Project, Assignee (with avatar initials), Status badge, Priority badge
9. **Bug Tracker Table** — columns: ID, Bug, Project, Severity badge, Assignee, Status badge, Reported date
10. **Blockers & Risks** — card per blocker with red (open) or yellow (investigating) left border
11. **Team Members Grid** — avatar circle + name + role per member
12. **Footer** — generated timestamp, usage hint

### Design System
```css
/* Color tokens */
--bg: #0a0a1a
--surface: rgba(255,255,255,0.04)  /* card backgrounds */
--border: rgba(255,255,255,0.08)
--text: #e2e8f0
--text-muted: #94a3b8
--purple: #8b5cf6
--indigo: #6366f1
--blue: #3b82f6
--cyan: #06b6d4
--green: #10b981
--yellow: #f59e0b
--orange: #f97316
--red: #ef4444
```

**Status badge classes:**
- `.status-done` → green (#10b981 background tint, border, text)
- `.status-in-progress` → blue tint
- `.status-blocked` → red tint
- `.status-todo` → gray tint
- `.status-open` → red tint
- `.status-resolved` → green tint
- `.status-investigating` → yellow tint

**Priority badge classes:**
- `.priority-critical` → red, `.priority-high` → orange, `.priority-medium` → yellow, `.priority-low` → green

**Card effects:** `backdrop-filter: blur(10px)`, gradient top-border on KPI cards, `translateY(-3px)` on hover

**Progress bars:** shimmer animation, color by health:
- `>= 60%` → green-to-cyan gradient
- `40–59%` → yellow-to-orange gradient
- `< 40%` → red gradient

**Avatar:** `width:28px; height:28px; border-radius:50%; background: gradient; font-size:0.65rem; font-weight:700;`

### Chart.js Configuration
```js
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";
```

Chart data examples (replace with actual computed values):
```js
// 1. Task Status Bar Chart
{ type: 'bar', data: { labels: ['Done','In Progress','Blocked','Todo'], datasets: [{ data: [DONE_COUNT, IP_COUNT, BLOCKED_COUNT, TODO_COUNT], backgroundColor: ['rgba(16,185,129,0.7)','rgba(59,130,246,0.7)','rgba(239,68,68,0.7)','rgba(107,114,128,0.7)'], borderRadius: 6 }] } }

// 2. Tasks by Project Doughnut
{ type: 'doughnut', options: { cutout: '60%' } }

// 3. Bug Severity Doughnut
{ type: 'doughnut', options: { cutout: '60%' } }
// colors: critical=#ef4444, high=#f97316, medium=#f59e0b, low=#10b981

// 4. Assignee Workload
{ type: 'bar', options: { indexAxis: 'y' } }
```

---

## Step 3 — Generate the Markdown Report

Create `dsr-data/reports/dsr-{date}.md` with these sections:

```markdown
# 📊 Daily Status Report — {team}
## {sprint} · {date}
---
## 🏷 Report Summary
| Field | Value |
...

## 📈 Sprint KPIs
| Metric | Count | % |
...

## 🚀 Project Progress
| Project | Status | Progress | Tasks | Deadline |
...

## ✅ Tasks by Project
(one table per project)

## 🐛 Bug Tracker
| ID | Bug | Severity | Project | Assignee | Status | Reported |
...

## 👥 Assignee Workload
| Assignee | Role | Tasks |
...

## 🚧 Blockers & Risks
(blockquote card per blocker with title, description, owner, impact, status)

## 👨‍💼 Team Members
| Name | Role |
...
```

---

## Notes
- All counts must be **computed from the actual JSON data** — do not use placeholder values
- HTML must be completely self-contained (only external dependency: Chart.js CDN)
- Avatar initials = first letter of first name + first letter of last name
- After creating both files, confirm the output paths to the user
