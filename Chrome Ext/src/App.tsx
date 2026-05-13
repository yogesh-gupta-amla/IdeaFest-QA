import React, { useState, useEffect, useCallback, useRef } from "react";

/** Decode HTML entities returned by the APT API (e.g. &amp; → &) */
function decodeHtml(str: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}
import { useApp } from "./context/AppContext";
import QADashboard from "./pages/QADashboard";
import {
  storageGet,
  storageRemove,
  storageRemoveByPrefix,
  storageSet,
} from "./services/chromeStorage";
import {
  validateAuth,
  fetchProjects,
  fetchAllPages,
  fetchActiveSprint,
  fetchDevInfo,
} from "./services/jiraService";
import { computeMetrics } from "./services/metricsService";
import type {
  AuthMode,
  JiraUser,
  JiraProject,
  JiraIssue,
  Metrics,
  ManualEntry,
  QANote,
  SnapshotMetrics,
  Theme,
} from "./types";
import LoadingOverlay from "./components/common/LoadingOverlay";
import { useDashboardStore } from "./store/useStore";
import { QA_THEMES, applyTheme } from "./themes";
import Toast from "./components/common/Toast";
import type { QueryTimeRange } from "./utils/queryTimeRange";
import {
  getCreatedTimeRangeClause,
  getResolvedTimeRangeClause,
  getWorklogTimeRangeClause,
} from "./utils/queryTimeRange";
import type { DateRange } from "./utils/queryTimeRange";
import LandingScreen from "./components/Landing/LandingScreen";
import { generateAptToken, fetchAptProjects } from "./services/aptService";

/** Hardcoded Jira host — the dashboard only ever talks to the Amla tenant. */
const JIRA_URL = "https://amla.atlassian.net";

export default function App() {
  const {
    theme,
    setTheme,
    toast,
    showToast,
    loading,
    loadingText,
    loadingProgress,
    showLoading,
    hideLoading,
    setLoadingProgress,
    setLoadingText,
  } = useApp();

  // Auth state
  const [jiraUrl, setJiraUrl] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("none");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<JiraUser | null>(null);

  // Projects state
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProjectKey, setSelectedProjectKey] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("");

  // Dashboard state
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [prevMetrics, setPrevMetrics] = useState<SnapshotMetrics | null>(null);
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [qaNotes, setQaNotes] = useState<QANote[]>([]);
  const [dsrRecipient, setDsrRecipient] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [showQADashboard, setShowQADashboard] = useState(false);
  const [initializing, setInitializing] = useState(true);
  // Detect URL-param login synchronously so we can show a loader only for that flow
  const [isUrlParamLogin] = useState(() => {
    const p = new URLSearchParams(window.location.search);
    return !!(p.get("email") && p.get("jiraToken"));
  });
  const [pendingProject, setPendingProject] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const cancelRef = useRef(false);
  const { themeId, activeSection } = useDashboardStore();

  // Apply QA dashboard theme on first load
  useEffect(() => {
    const initial = QA_THEMES.find((t) => t.id === themeId);
    if (initial) applyTheme(initial);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Default Jira base URL — can be overridden via URL param or storage
  const DEFAULT_JIRA_URL =
    (import.meta.env.VITE_DEFAULT_JIRA_URL as string) ||
    "https://amla.atlassian.net";

  // Initialise from storage on mount; also handle iframe URL param auto-login
  useEffect(() => {
    (async () => {
      const stored = await storageGet([
        "theme",
        "aptToken",
        "aptEmail",
        "jiraToken",
        "jiraTokenB64",
        "jiraUrl",
        "lastActiveSection",
      ]);
      const t = (stored.theme as Theme) || "light";
      setTheme(t);
      if (typeof stored.lastActiveSection === "string") {
        useDashboardStore
          .getState()
          .setActiveSection(stored.lastActiveSection as string);
      }

      // ── Check for iframe URL params (email & jiraToken passed by parent app) ──
      const params = new URLSearchParams(window.location.search);
      const paramEmail = params.get("email");
      const paramJiraToken = params.get("jiraToken");
      const paramJiraUrl = params.get("jiraUrl");

      if (paramEmail && paramJiraToken) {
        // Remove tokens from URL immediately to avoid leaking them
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("email");
        cleanUrl.searchParams.delete("jiraToken");
        cleanUrl.searchParams.delete("jiraUrl");
        window.history.replaceState({}, "", cleanUrl.toString());

        const resolvedUrl =
          (paramJiraUrl || "").trim().replace(/\/+$/, "") || DEFAULT_JIRA_URL;
        const b64 = btoa(`${paramEmail.trim()}:${paramJiraToken.trim()}`);
        try {
          const aptToken = await generateAptToken(paramEmail.trim());
          await storageSet({
            aptToken,
            aptEmail: paramEmail.trim(),
            jiraToken: paramJiraToken.trim(),
            jiraTokenB64: b64,
            jiraUrl: resolvedUrl,
          });
          await attemptAutoConnect(
            paramEmail.trim(),
            b64,
            resolvedUrl,
            aptToken,
          );
          showToast(`Signed in as ${paramEmail.trim()}`, "success");
        } catch {
          // Fall through to stored-auth check below
        }
        setInitializing(false);
        return;
      }

      // ── Restore from stored credentials ──
      if (stored.aptEmail && stored.jiraTokenB64) {
        const storedUrl =
          (stored.jiraUrl as string | undefined) || DEFAULT_JIRA_URL;
        const storedEmail = stored.aptEmail as string;
        const storedB64 = stored.jiraTokenB64 as string;
        let aptToken = stored.aptToken as string | undefined;

        // Helper: try connect, and if APT token is expired regenerate it first
        const tryConnect = async () => {
          if (!aptToken) {
            // No stored APT token — generate fresh one
            aptToken = await generateAptToken(storedEmail);
            await storageSet({ aptToken });
          }
          try {
            await attemptAutoConnect(
              storedEmail,
              storedB64,
              storedUrl,
              aptToken!,
            );
          } catch {
            // APT token likely expired — regenerate and retry once
            aptToken = await generateAptToken(storedEmail);
            await storageSet({ aptToken });
            await attemptAutoConnect(
              storedEmail,
              storedB64,
              storedUrl,
              aptToken,
            );
          }
        };

        await tryConnect().catch(() => {
          setAuthMode("none");
          setUser(null);
        });
      }
      setInitializing(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void storageSet({ lastActiveSection: activeSection });
  }, [activeSection]);

  const attemptAutoConnect = useCallback(
    async (
      email: string,
      jiraTokenB64: string,
      jiraUrl: string,
      aptToken: string,
    ) => {
      const aptProjects = await fetchAptProjects(aptToken);
      const mapped: JiraProject[] = aptProjects.map((p) => ({
        id: p.project_key,
        key: p.project_key,
        name: decodeHtml(p.project_name),
        avatarUrl: "",
      }));
      const syntheticUser: JiraUser = {
        displayName: email,
        emailAddress: email,
        avatarUrl: "",
      };
      setUser(syntheticUser);
      setAuthMode("token");
      setAuthToken(jiraTokenB64);
      setJiraUrl(jiraUrl);
      setProjects(mapped);
      useDashboardStore
        .getState()
        .setJiraConfig(jiraUrl, jiraTokenB64, "token");

      const saved = await storageGet([
        "manualEntries",
        "qaNotes",
        "dsrRecipient",
        "lastProjectKey",
        "lastProjectName",
      ]);
      if (saved.manualEntries)
        setManualEntries(saved.manualEntries as ManualEntry[]);
      if (saved.qaNotes) setQaNotes(saved.qaNotes as QANote[]);
      if (saved.dsrRecipient) setDsrRecipient(saved.dsrRecipient as string);
      if (saved.lastProjectKey && saved.lastProjectName) {
        setPendingProject({
          key: saved.lastProjectKey as string,
          name: saved.lastProjectName as string,
        });
      }
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onConnected = useCallback(
    async (
      url: string,
      connectedUser: JiraUser,
      mode: AuthMode,
      token: string | null,
    ) => {
      setJiraUrl(url);
      setUser(connectedUser);
      setAuthMode(mode);
      setAuthToken(token);
      showToast(`Connected as ${connectedUser.displayName}`, "success");

      // Store auth config in QA store for components like JiraExplorer
      useDashboardStore.getState().setJiraConfig(url, token, mode);

      const result = await fetchProjects(url, token);
      if (result.success && result.projects) setProjects(result.projects);

      const saved = await storageGet([
        "manualEntries",
        "qaNotes",
        "dsrRecipient",
        "lastProjectKey",
        "lastProjectName",
      ]);
      if (saved.manualEntries)
        setManualEntries(saved.manualEntries as ManualEntry[]);
      if (saved.qaNotes) setQaNotes(saved.qaNotes as QANote[]);
      if (saved.dsrRecipient) setDsrRecipient(saved.dsrRecipient as string);
      if (saved.lastProjectKey && saved.lastProjectName) {
        setPendingProject({
          key: saved.lastProjectKey as string,
          name: saved.lastProjectName as string,
        });
      }
    },
    [showToast],
  );

  const handleConnect = useCallback(
    async (email: string, jiraToken: string, jiraUrl?: string) => {
      const trimmedEmail = email.trim();
      const trimmedToken = jiraToken.trim();
      const trimmedUrl =
        (jiraUrl || "").trim().replace(/\/+$/, "") ||
        (import.meta.env.VITE_DEFAULT_JIRA_URL as string) ||
        "https://amla.atlassian.net";

      if (!trimmedEmail || !trimmedEmail.includes("@")) {
        showToast("Please enter a valid email address", "error");
        return false;
      }
      if (!trimmedToken) {
        showToast("Please enter your Jira API token", "error");
        return false;
      }

      const jiraTokenB64 = btoa(`${trimmedEmail}:${trimmedToken}`);
      showToast("Generating APT token…", "info");
      try {
        const aptToken = await generateAptToken(trimmedEmail);
        await storageSet({
          aptToken,
          aptEmail: trimmedEmail,
          jiraToken: trimmedToken,
          jiraTokenB64,
          jiraUrl: trimmedUrl,
        });
        showToast("Loading projects…", "info");
        await attemptAutoConnect(
          trimmedEmail,
          jiraTokenB64,
          trimmedUrl,
          aptToken,
        );
        showToast(`Signed in as ${trimmedEmail}`, "success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg || "Sign in failed", "error");
        return false;
      }
      return true;
    },
    [attemptAutoConnect, showToast],
  );

  const handleLoadProject = useCallback(
    async (projectKey: string, projectName: string) => {
      const store = useDashboardStore.getState();
      const timeRange = store.queryTimeRange;
      const dateRange = store.dateRange;

      setSelectedProjectKey(projectKey);
      setSelectedProjectName(projectName);
      setShowDashboard(false);
      setMetrics(null);
      cancelRef.current = false;
      store.setProjectDataLoaded(false);
      store.setRawIssues([]);
      store.setRecentlyResolved([]);
      store.setAgeingIssues([]);
      store.setAgeingOver48Issues([]);
      store.setAgeingFreshIssues([]);
      store.setActiveIssues([]);
      store.setOverburntIssues([]);
      store.setEarlyCompletionIssues([]);
      store.setCodeIntelIssues([]);

      showLoading(`Fetching all data for ${projectKey}…`);

      const token = authMode === "token" ? authToken : null;

      // Progress callback — updates the loading overlay with live counts
      const onProgress = (fetched: number, total: number, label: string) => {
        setLoadingProgress({ fetched, total, label });
        setLoadingText(`Fetching ${label} for ${projectKey}…`);
      };

      // ── Build time-range clauses from the header selection ──
      const createdClause = getCreatedTimeRangeClause(timeRange, dateRange);
      const resolvedClause = getResolvedTimeRangeClause(timeRange, dateRange);
      const worklogClause = getWorklogTimeRangeClause(timeRange, dateRange);

      // ── Define all JQL queries ──
      // All queries use fetchAllPages (isLast loop) for full pagination.
      // The duration filter is mandatory (Last Month / Last 6 Months) to keep
      // each project's full fetch within a reasonable window.
      const queries = {
        open: {
          jql: `project = "${projectKey}" AND resolution = Unresolved AND ${createdClause} ORDER BY priority ASC, created DESC`,
          label: "Open Issues",
        },
        created: {
          jql: `project = "${projectKey}" AND ${createdClause} ORDER BY priority ASC, created DESC`,
          label: "Created Issues",
        },
        resolved: {
          jql: `project = "${projectKey}" AND ${resolvedClause} ORDER BY resolved DESC`,
          label: "Resolved Issues",
        },
        recentResolved: {
          jql: `project = "${projectKey}" AND ${resolvedClause} ORDER BY resolved DESC`,
          label: "Recently Resolved",
        },
        ageing: {
          // Q1 — Total active Critical/Blockers (Bug or Defect)
          jql: `project = "${projectKey}" AND issuetype IN (Bug, Defect) AND priority IN (Blocker, Critical) AND status NOT IN (Done, "QA Done", Rejected, "Ready For Production", "Ready for QA", "Ready for Testing", "Ready for UAT") ORDER BY created DESC`,
          label: "Ageing Critical/Blockers",
        },
        ageingOver48: {
          // Q2 — Bugs in Backlog/Open created within the last 48 hours
          jql: `project = "${projectKey}" AND issuetype = Bug AND status IN (Backlog, Open) AND priority IN (Blocker, Critical) AND created >= -48h ORDER BY created DESC`,
          label: "Reported in Last 48h",
        },
        ageingFresh: {
          // Q3 — Bugs/Defects in Backlog/Open created within the last 8 hours
          jql: `project = "${projectKey}" AND issuetype IN (Bug, Defect) AND status IN (Backlog, Open) AND priority IN (Blocker, Critical) AND created >= -8h ORDER BY created DESC`,
          label: "Fresh Bugs (Last 8h)",
        },
        activeIssues: {
          jql: `project = "${projectKey}" AND status NOT IN (Done, "QA Done", Rejected, "Ready For Production", "Ready for QA", "Ready for Testing", "Ready For UAT") AND issuetype IN (Bug, Defect) AND ${createdClause} ORDER BY created DESC`,
          label: "Total Active Issues",
        },
        overburnt: {
          jql: `project = "${projectKey}" AND workratio > 100 AND status = Done AND issuetype IN (Bug, Defect, Task, Sub-task) AND ${worklogClause} ORDER BY updated DESC`,
          label: "Overburnt Items",
        },
        earlyCompletion: {
          jql: `project = "${projectKey}" AND status = Done AND timeoriginalestimate > 0 AND ${resolvedClause} ORDER BY resolved DESC`,
          label: "Early Completions",
        },
        codeIntel: {
          jql: `project = "${projectKey}" AND status = Done AND issuetype IN (Story, Epic) AND ${resolvedClause} ORDER BY resolved DESC`,
          label: "Code Intelligence",
        },
      };

      // ── Fetch all queries sequentially with progress ──
      // Each uses fetchAllPages which loops until isLast === true
      const results: Record<
        string,
        {
          success: boolean;
          issues?: JiraIssue[];
          total?: number;
          error?: string;
        }
      > = {};

      for (const [key, q] of Object.entries(queries)) {
        setLoadingText(`Fetching ${q.label} for ${projectKey}…`);
        setLoadingProgress(null); // reset per-query progress
        results[key] = await fetchAllPages(
          jiraUrl,
          q.jql,
          token,
          onProgress,
          q.label,
        );

        // Abort early if user cancelled
        if (cancelRef.current) {
          hideLoading();
          return;
        }

        // Stop early if the first critical query fails
        if (key === "open" && !results[key].success) {
          hideLoading();
          showToast(results[key].error || "Failed to fetch issues", "error");
          return;
        }
      }

      // ── Fetch sprint info in parallel (it's a single lightweight call) ──
      setLoadingText(`Fetching sprint info for ${projectKey}…`);
      setLoadingProgress(null);
      const sprintResult = await fetchActiveSprint(jiraUrl, projectKey, token);

      // Abort early if user cancelled
      if (cancelRef.current) {
        hideLoading();
        return;
      }

      // ── Extract results ──
      const openIssues = results.open.issues || [];
      const todayCreated = results.created.success
        ? results.created.issues || []
        : [];
      const todayResolved = results.resolved.success
        ? results.resolved.issues || []
        : [];
      const recentlyResolved = results.recentResolved.success
        ? results.recentResolved.issues || []
        : [];
      const ageingIssues = results.ageing.success
        ? results.ageing.issues || []
        : [];
      const ageingOver48Issues = results.ageingOver48?.success
        ? results.ageingOver48.issues || []
        : [];
      const ageingFreshIssues = results.ageingFresh?.success
        ? results.ageingFresh.issues || []
        : [];
      const activeIssues = results.activeIssues.success
        ? results.activeIssues.issues || []
        : [];
      const overburntIssues = results.overburnt.success
        ? results.overburnt.issues || []
        : [];
      const earlyCompletionIssues = results.earlyCompletion.success
        ? results.earlyCompletion.issues || []
        : [];
      const codeIntelRawIssues = results.codeIntel.success
        ? results.codeIntel.issues || []
        : [];

      // ── Enrich code intel issues with dev-status (commits/PRs) ──
      setLoadingText(`Fetching dev info (commits/PRs)…`);
      setLoadingProgress(null);
      const codeIntelIssueIds = codeIntelRawIssues
        .filter((i) => i.id)
        .map((i) => i.id);
      let devInfoMap: Record<
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
      if (codeIntelIssueIds.length > 0) {
        try {
          const devResult = await fetchDevInfo(
            jiraUrl,
            codeIntelIssueIds,
            token,
          );
          if (devResult.success && devResult.devInfo) {
            devInfoMap = devResult.devInfo;
          }
        } catch {
          // Dev info is optional — continue without it
        }
      }
      const codeIntelIssues = codeIntelRawIssues.map((issue) => ({
        issueId: issue.id || "",
        issueKey: issue.key,
        summary: issue.summary,
        description: issue.description || "",
        labels: issue.labels || [],
        components: issue.components || [],
        assignee: issue.assignee,
        issueType: issue.issueType,
        priority: issue.priority,
        status: issue.status,
        resolved: issue.resolved || null,
        commits: devInfoMap[issue.id]?.commits || [],
        pullRequests: devInfoMap[issue.id]?.pullRequests || [],
      }));

      hideLoading();

      // Load snapshot for trends
      const todayStr = new Date().toISOString().slice(0, 10);
      const prevDate = new Date();
      prevDate.setDate(prevDate.getDate() - 1);
      const prevStr = prevDate.toISOString().slice(0, 10);
      const snapKey = (d: string) => `snap_${projectKey}_${d}`;
      const snaps = await storageGet([snapKey(prevStr), snapKey(todayStr)]);
      const prevM = (snaps[snapKey(prevStr)] as SnapshotMetrics) || null;
      setPrevMetrics(prevM);

      const m = computeMetrics(openIssues, todayCreated, todayResolved);
      setMetrics(m);
      setShowDashboard(true);

      // Store metrics in QA dashboard store
      store.setProjectData(projectKey, projectName, m, prevM);
      store.setRawIssues(openIssues);
      store.setRecentlyResolved(recentlyResolved);
      store.setAgeingIssues(ageingIssues);
      store.setAgeingOver48Issues(ageingOver48Issues);
      store.setAgeingFreshIssues(ageingFreshIssues);
      store.setActiveIssues(activeIssues);
      store.setOverburntIssues(overburntIssues);
      store.setEarlyCompletionIssues(earlyCompletionIssues);
      store.setCodeIntelIssues(codeIntelIssues);
      store.setProjectDataLoaded(true);
      store.setSprintInfo(
        sprintResult.sprintName || "",
        sprintResult.sprintGoal || "",
      );

      // Save today's snapshot
      storageSet({
        lastProjectKey: projectKey,
        lastProjectName: projectName,
        [snapKey(todayStr)]: {
          totalOpen: m.totalOpen,
          todayNew: m.todayNew,
          todayResolved: m.todayResolved,
          reopened: m.reopened,
          mustFix: m.mustFix,
          blocked: m.blocked,
        },
      });

      // Summary toast
      const totalFetched = Object.values(results).reduce(
        (sum, r) => sum + (r.issues?.length || 0),
        0,
      );
      showToast(
        `Loaded ${totalFetched.toLocaleString()} issues for ${projectKey}`,
        "success",
      );

      // Navigate to sidebar dashboard
      setShowQADashboard(true);
    },
    [
      authMode,
      authToken,
      jiraUrl,
      showLoading,
      hideLoading,
      showToast,
      setLoadingProgress,
      setLoadingText,
    ],
  );

  const handleCancel = useCallback(() => {
    cancelRef.current = true;
    hideLoading();
    setShowQADashboard(false);
  }, [hideLoading]);

  const handleTimeRangeChange = useCallback(
    async (timeRange: QueryTimeRange) => {
      const store = useDashboardStore.getState();
      store.setQueryTimeRange(timeRange);
      store.setDateRange(null);

      if (selectedProjectKey && selectedProjectName) {
        await handleLoadProject(selectedProjectKey, selectedProjectName);
      }
    },
    [handleLoadProject, selectedProjectKey, selectedProjectName],
  );

  const handleManualEntriesChange = useCallback((entries: ManualEntry[]) => {
    setManualEntries(entries);
    storageSet({
      manualEntries: entries as unknown as Record<string, unknown>[],
    });
  }, []);

  // Auto-load last project once auth state is ready after session restore
  useEffect(() => {
    if (!pendingProject || !user || !jiraUrl) return;
    const { key, name } = pendingProject;
    setPendingProject(null);
    handleLoadProject(key, name);
  }, [pendingProject, user, jiraUrl, handleLoadProject]);

  const handleRefreshProjects = useCallback(async () => {
    const stored = await storageGet(["aptToken"]);
    const token = stored.aptToken as string | undefined;
    if (!token) return;
    try {
      const aptProjects = await fetchAptProjects(token);
      const mapped = aptProjects.map((p) => ({
        id: p.project_key,
        key: p.project_key,
        name: decodeHtml(p.project_name),
        avatarUrl: "",
      }));
      setProjects(mapped);
    } catch {
      showToast("Failed to refresh projects", "error");
    }
  }, [showToast]);

  const handleQaNotesChange = useCallback((notes: QANote[]) => {
    setQaNotes(notes);
    storageSet({ qaNotes: notes as unknown as Record<string, unknown>[] });
  }, []);

  const handleDsrRecipientChange = useCallback((r: string) => {
    setDsrRecipient(r);
    storageSet({ dsrRecipient: r });
  }, []);

  if (initializing) {
    return isUrlParamLogin ? (
      <LoadingOverlay visible={true} text="Signing in…" />
    ) : null;
  }

  if (showQADashboard) {
    return (
      <>
        <LoadingOverlay
          visible={loading}
          text={loadingText}
          progress={loadingProgress}
          onCancel={handleCancel}
        />
        <Toast toast={toast} />
        <QADashboard
          projects={projects}
          selectedProjectKey={selectedProjectKey}
          onLoadProject={handleLoadProject}
          onRefreshProjects={handleRefreshProjects}
          onLogout={async () => {
            // Clear persisted auth + cached data
            await storageRemove([
              "aptToken",
              "aptEmail",
              "jiraToken",
              "jiraTokenB64",
              "jiraUrl",
              "lastProjectKey",
              "lastProjectName",
              "manualEntries",
              "qaNotes",
              "dsrRecipient",
            ]);
            await storageRemoveByPrefix(["snap_"]);

            // Reset in-memory auth + dashboard state
            setAuthMode("none");
            setAuthToken(null);
            setUser(null);
            setProjects([]);
            setSelectedProjectKey("");
            setSelectedProjectName("");
            setMetrics(null);
            setPrevMetrics(null);
            setManualEntries([]);
            setQaNotes([]);
            setDsrRecipient("");
            setPendingProject(null);

            useDashboardStore.getState().resetForLogout();

            setShowQADashboard(false);
            showToast("Logged out", "success");
          }}
          onTimeRangeChange={handleTimeRangeChange}
          onRefresh={() => {
            if (selectedProjectKey && selectedProjectName) {
              return handleLoadProject(selectedProjectKey, selectedProjectName);
            }
            return Promise.resolve();
          }}
          user={user}
          authMode={authMode}
        />
      </>
    );
  }

  return (
    <>
      <LoadingOverlay
        visible={loading}
        text={loadingText}
        progress={loadingProgress}
        onCancel={handleCancel}
      />
      <Toast toast={toast} />
      <LandingScreen
        authMode={authMode}
        user={user}
        projects={projects}
        onConnect={handleConnect}
        onLoadProject={handleLoadProject}
      />
    </>
  );
}
