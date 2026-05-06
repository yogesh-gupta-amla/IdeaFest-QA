import React, { useState, useEffect, useCallback } from "react";
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
  const [pendingProject, setPendingProject] = useState<{
    key: string;
    name: string;
  } | null>(null);
  const { themeId, activeSection } = useDashboardStore();

  // Apply QA dashboard theme on first load
  useEffect(() => {
    const initial = QA_THEMES.find((t) => t.id === themeId);
    if (initial) applyTheme(initial);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise from storage on mount
  useEffect(() => {
    (async () => {
      const stored = await storageGet([
        "theme",
        "jiraUrl",
        "jiraEmail",
        "jiraTokenB64",
        "authMode",
        "lastActiveSection",
      ]);
      const t = (stored.theme as Theme) || "dark";
      setTheme(t);
      if (typeof stored.lastActiveSection === "string") {
        useDashboardStore
          .getState()
          .setActiveSection(stored.lastActiveSection as string);
      }
      if (stored.jiraUrl) setJiraUrl(stored.jiraUrl as string);
      if (stored.jiraTokenB64) setAuthToken(stored.jiraTokenB64 as string);
      if (stored.authMode) {
        const mode = stored.authMode as AuthMode;
        if (stored.jiraUrl && mode === "token" && stored.jiraTokenB64) {
          await attemptAutoConnect(
            stored.jiraUrl as string,
            stored.jiraTokenB64 as string,
          ).catch(async () => {
            setAuthMode("none");
            setAuthToken(null);
            setUser(null);
            await storageSet({ authMode: "none" });
          });
        } else {
          setAuthMode("none");
          setAuthToken(null);
          setUser(null);
          await storageSet({ authMode: "none" });
        }
      }
      setInitializing(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void storageSet({ lastActiveSection: activeSection });
  }, [activeSection]);

  const attemptAutoConnect = useCallback(
    async (url: string, token: string | null) => {
      const auth = await validateAuth(url, token);
      if (auth.success && auth.user) {
        await onConnected(url, auth.user, "token", token);
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
    async (url: string, email?: string, token?: string) => {
      const raw = url.trim().replace(/\/+$/, "");
      if (!raw) {
        showToast("Please enter a Jira URL", "error");
        return;
      }
      try {
        const u = new URL(raw);
        if (!u.hostname.endsWith(".atlassian.net")) {
          showToast("URL must be a *.atlassian.net domain", "error");
          return;
        }
      } catch {
        showToast("Invalid URL format", "error");
        return;
      }

      if (!email || !token) {
        showToast("Enter Atlassian email and API token", "error");
        return false;
      }

      const b64 = btoa(`${email}:${token}`);
      showToast("Authenticating with token…", "info");
      const auth = await validateAuth(raw, b64);
      if (auth.success && auth.user) {
        await storageSet({
          jiraUrl: raw,
          jiraEmail: email,
          jiraTokenB64: b64,
          authMode: "token",
        });
        await onConnected(raw, auth.user, "token", b64);
      } else {
        setAuthMode("none");
        setUser(null);
        showToast(auth.error || "Authentication failed", "error");
        return false;
      }
      return true;
    },
    [onConnected, showToast],
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
      store.setProjectDataLoaded(false);
      store.setRawIssues([]);
      store.setRecentlyResolved([]);
      store.setAgeingIssues([]);
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

      // Helper to inject an optional AND clause into JQL
      const and = (clause: string) => (clause ? ` AND ${clause}` : "");

      // ── Define all JQL queries ──
      // All queries use fetchAllPages (isLast loop) for full pagination.
      // Ageing is always lifetime (no date filter). Others respect Lifetime/Custom.
      const queries = {
        open: {
          jql: `project = "${projectKey}" AND resolution = Unresolved${and(createdClause)} ORDER BY priority ASC, created DESC`,
          label: "Open Issues",
        },
        created: {
          jql: `project = "${projectKey}"${and(createdClause)} ORDER BY priority ASC, created DESC`,
          label: "Created Issues",
        },
        resolved: {
          jql: `project = "${projectKey}"${and(resolvedClause)} ORDER BY resolved DESC`,
          label: "Resolved Issues",
        },
        recentResolved: {
          jql: `project = "${projectKey}"${and(resolvedClause)} ORDER BY resolved DESC`,
          label: "Recently Resolved",
        },
        ageing: {
          jql: `project = "${projectKey}" AND issuetype IN (Bug, Defect) AND priority IN (Blocker, Critical) AND status NOT IN (Done, "QA Done", Rejected, "Ready For Production", "Ready for QA", "Ready for Testing", "Ready For UAT") ORDER BY created DESC`,
          label: "Ageing Critical/Blockers",
        },
        activeIssues: {
          jql: `project = "${projectKey}" AND status NOT IN (Done, "QA Done", Rejected, "Ready For Production", "Ready for QA", "Ready for Testing", "Ready For UAT") AND issuetype IN (Bug, Defect) ORDER BY created DESC`,
          label: "Total Active Issues",
        },
        overburnt: {
          jql: `project = "${projectKey}" AND workratio > 100 AND status = Done AND issuetype IN (Bug, Defect, Task, Sub-task)${and(worklogClause)} ORDER BY updated DESC`,
          label: "Overburnt Items",
        },
        earlyCompletion: {
          jql: `project = "${projectKey}" AND status = Done AND timeoriginalestimate > 0${and(resolvedClause)} ORDER BY resolved DESC`,
          label: "Early Completions",
        },
        codeIntel: {
          jql: `project = "${projectKey}" AND status = Done AND issuetype IN (Story, Epic)${and(resolvedClause)} ORDER BY resolved DESC`,
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

  const handleQaNotesChange = useCallback((notes: QANote[]) => {
    setQaNotes(notes);
    storageSet({ qaNotes: notes as unknown as Record<string, unknown>[] });
  }, []);

  const handleDsrRecipientChange = useCallback((r: string) => {
    setDsrRecipient(r);
    storageSet({ dsrRecipient: r });
  }, []);

  if (initializing) {
    return <LoadingOverlay visible={true} text="Initializing…" />;
  }

  if (showQADashboard) {
    return (
      <>
        <LoadingOverlay
          visible={loading}
          text={loadingText}
          progress={loadingProgress}
        />
        <Toast toast={toast} />
        <QADashboard
          projects={projects}
          selectedProjectKey={selectedProjectKey}
          onLoadProject={handleLoadProject}
          onLogout={async () => {
            // Clear persisted auth + cached data
            await storageRemove([
              "jiraUrl",
              "jiraEmail",
              "jiraTokenB64",
              "authMode",
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
      />
      <Toast toast={toast} />
      <LandingScreen
        jiraUrl={jiraUrl}
        authMode={authMode}
        user={user}
        projects={projects}
        onConnect={handleConnect}
        onLoadProject={handleLoadProject}
      />
    </>
  );
}
