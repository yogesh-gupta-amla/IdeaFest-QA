export type QueryTimeRange = "lastmonth" | "last6months";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export const QUERY_TIME_RANGE_OPTIONS: Array<{
  value: QueryTimeRange;
  label: string;
}> = [
  { value: "lastmonth", label: "📅 Last Month" },
  { value: "last6months", label: "📆 Last 6 Months" },
];

export const DEFAULT_QUERY_TIME_RANGE: QueryTimeRange = "lastmonth";

/** Days back covered by each range. Used for both JQL and client-side bucketing. */
export const TIME_RANGE_DAYS: Record<QueryTimeRange, number> = {
  lastmonth: 30,
  last6months: 180,
};

export function getCreatedTimeRangeClause(
  timeRange: QueryTimeRange,
  _dateRange?: DateRange | null,
): string {
  return `created >= -${TIME_RANGE_DAYS[timeRange]}d`;
}

export function getResolvedTimeRangeClause(
  timeRange: QueryTimeRange,
  _dateRange?: DateRange | null,
): string {
  return `resolved >= -${TIME_RANGE_DAYS[timeRange]}d`;
}

export function getWorklogTimeRangeClause(
  timeRange: QueryTimeRange,
  _dateRange?: DateRange | null,
): string {
  return `worklogDate >= -${TIME_RANGE_DAYS[timeRange]}d`;
}

export function getTimeRangeLabel(
  timeRange: QueryTimeRange,
  _dateRange?: DateRange | null,
): string {
  switch (timeRange) {
    case "lastmonth":
      return "Last Month";
    case "last6months":
      return "Last 6 Months";
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
  return `project = "${projectKey}" AND ${clause} ORDER BY created DESC`;
}

export function applyExplorerTimeRange(
  jql: string,
  timeRange: QueryTimeRange,
): string {
  if (!jql.trim() || hasExplicitDateConstraint(jql)) {
    return jql.trim();
  }
  const clause = getCreatedTimeRangeClause(timeRange);
  return appendClauseBeforeOrderBy(jql, clause);
}
