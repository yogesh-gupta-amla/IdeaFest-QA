export type QueryTimeRange = "today" | "weekly";

export const QUERY_TIME_RANGE_OPTIONS: Array<{
  value: QueryTimeRange;
  label: string;
}> = [
  { value: "weekly", label: "Weekly" },
  { value: "today", label: "Today" },
];

export function getCreatedTimeRangeClause(timeRange: QueryTimeRange): string {
  return timeRange === "today" ? "created >= startOfDay()" : "created >= -7d";
}

export function getResolvedTimeRangeClause(timeRange: QueryTimeRange): string {
  return timeRange === "today" ? "resolved >= startOfDay()" : "resolved >= -7d";
}

export function getTimeRangeLabel(timeRange: QueryTimeRange): string {
  return timeRange === "today" ? "Today" : "Weekly";
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
  return projectKey
    ? `project = "${projectKey}" AND ${getCreatedTimeRangeClause(timeRange)} ORDER BY created DESC`
    : "";
}

export function applyExplorerTimeRange(
  jql: string,
  timeRange: QueryTimeRange,
): string {
  if (!jql.trim() || hasExplicitDateConstraint(jql)) {
    return jql.trim();
  }

  return appendClauseBeforeOrderBy(jql, getCreatedTimeRangeClause(timeRange));
}
