export type QueryTimeRange = "oneday" | "thisweek" | "lastweek" | "all";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export const QUERY_TIME_RANGE_OPTIONS: Array<{
  value: QueryTimeRange;
  label: string;
}> = [
  { value: "oneday", label: "📅 One Day" },
  { value: "thisweek", label: "📆 This Week" },
  { value: "lastweek", label: "📋 Last Week" },
  { value: "all", label: "🔄 All" },
];

/** Returns the Monday of the current ISO week at 00:00 as YYYY-MM-DD */
function thisWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toISOString().split("T")[0];
}

/** Returns the Monday → Sunday of the previous ISO week */
function lastWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() + diff);
  const lastMon = new Date(thisMon);
  lastMon.setDate(thisMon.getDate() - 7);
  const lastSun = new Date(thisMon);
  lastSun.setDate(thisMon.getDate() - 1);
  return {
    from: lastMon.toISOString().split("T")[0],
    to: lastSun.toISOString().split("T")[0],
  };
}

export function getCreatedTimeRangeClause(
  timeRange: QueryTimeRange,
  _dateRange?: DateRange | null,
): string {
  switch (timeRange) {
    case "oneday":
      return "created >= startOfDay()";
    case "thisweek":
      return `created >= "${thisWeekStart()}"`;
    case "lastweek": {
      const lw = lastWeekRange();
      return `created >= "${lw.from}" AND created <= "${lw.to} 23:59"`;
    }
    case "all":
      return ""; // no date filter
  }
}

export function getResolvedTimeRangeClause(
  timeRange: QueryTimeRange,
  _dateRange?: DateRange | null,
): string {
  switch (timeRange) {
    case "oneday":
      return "resolved >= startOfDay()";
    case "thisweek":
      return `resolved >= "${thisWeekStart()}"`;
    case "lastweek": {
      const lw = lastWeekRange();
      return `resolved >= "${lw.from}" AND resolved <= "${lw.to} 23:59"`;
    }
    case "all":
      return "";
  }
}

export function getWorklogTimeRangeClause(
  timeRange: QueryTimeRange,
  _dateRange?: DateRange | null,
): string {
  switch (timeRange) {
    case "oneday":
      return "worklogDate >= startOfDay()";
    case "thisweek":
      return `worklogDate >= "${thisWeekStart()}"`;
    case "lastweek": {
      const lw = lastWeekRange();
      return `worklogDate >= "${lw.from}" AND worklogDate <= "${lw.to}"`;
    }
    case "all":
      return "";
  }
}

export function getTimeRangeLabel(
  timeRange: QueryTimeRange,
  _dateRange?: DateRange | null,
): string {
  switch (timeRange) {
    case "oneday":
      return "Today";
    case "thisweek":
      return "This Week";
    case "lastweek": {
      const lw = lastWeekRange();
      return `${lw.from} → ${lw.to}`;
    }
    case "all":
      return "All Time";
  }
}

export function appendClauseBeforeOrderBy(jql: string, clause: string): string {
  const trimmed = jql.trim();
  if (!trimmed) return clause;

  const orderByMatch = trimmed.match(/\s+order\s+by\s+/i);
  if (!orderByMatch || orderByMatch.index === undefined) {
    return `(${trimmed}) AND ${clause}`;
  }

  const index = orderByMatch.index;
  const beforeOrder = trimmed.slice(0, index).trim();
  const orderByPart = trimmed.slice(index).trim();
  return `(${beforeOrder}) AND ${clause} ${orderByPart}`;
}

export function hasExplicitDateConstraint(jql: string): boolean {
  return /\b(created|resolved|updated|statusCategoryChangedDate)\b\s*(>=|<=|=|>|<|!=|in|not in|was|changed)/i.test(
    jql,
  );
}

export function buildExplorerBaseJql(
  projectKey: string,
  timeRange: QueryTimeRange,
): string {
  if (!projectKey) return "";
  const clause = getCreatedTimeRangeClause(timeRange);
  return clause
    ? `project = "${projectKey}" AND ${clause} ORDER BY created DESC`
    : `project = "${projectKey}" ORDER BY created DESC`;
}

export function applyExplorerTimeRange(
  jql: string,
  timeRange: QueryTimeRange,
): string {
  if (!jql.trim() || hasExplicitDateConstraint(jql)) {
    return jql.trim();
  }
  const clause = getCreatedTimeRangeClause(timeRange);
  if (!clause) return jql.trim(); // all — no filter to inject
  return appendClauseBeforeOrderBy(jql, clause);
}
