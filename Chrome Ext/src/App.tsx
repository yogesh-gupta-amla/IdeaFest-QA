import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "./context/AppContext";
import QADashboard from "./pages/QADashboard";
import { storageGet, storageSet } from "./services/chromeStorage";
import {
  validateAuth,
  fetchProjects,
  fetchJiraIssues,
  fetchActiveSprint,
} from "./services/jiraService";
import { computeMetrics } from "./services/metricsService";
import type {
  AuthMode,
  JiraUser,
  JiraProject,
  Metrics,
  ManualEntry,
  QANote,
  SnapshotMetrics,
  Theme,
} from "./types";
import LandingScreen from "./components/Landing/LandingScreen";
import LoadingOverlay from "./components/common/LoadingOverlay";
import { useDashboardStore } from "./store/useStore";
import { QA_THEMES, applyTheme } from "./themes";
import Toast from "./components/common/Toast";

export default function App() {
  const {
    theme,
    setTheme,
    toast,
    showToast,
    loading,
    loadingText,
    showLoading,
    hideLoading,
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
  const { themeId } = useDashboardStore();

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
      ]);
      const t = (stored.theme as Theme) || "dark";
      setTheme(t);
      if (stored.jiraUrl) setJiraUrl(stored.jiraUrl as string);
      if (stored.jiraTokenB64) setAuthToken(stored.jiraTokenB64 as string);
      if (stored.authMode) {
        const mode = stored.authMode as AuthMode;
        setAuthMode(mode);
        if (stored.jiraUrl && (mode === "session" || mode === "token")) {
          await attemptAutoConnect(
            stored.jiraUrl as string,
            mode === "token" ? (stored.jiraTokenB64 as string | null) : null,
          ).catch(() => {});
        }
      }
      setInitializing(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const attemptAutoConnect = useCallback(
    async (url: string, token: string | null) => {
      const auth = await validateAuth(url, token);
      if (auth.success && auth.user) {
        await onConnected(url, auth.user, token ? "token" : "session", token);
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

      if (email && token) {
        // Token auth
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
          showToast(auth.error || "Authentication failed", "error");
        }
      } else {
        // Session auth
        showToast("Checking browser session…", "info");
        const auth = await validateAuth(raw, null);
        if (auth.success && auth.user) {
          await storageSet({
            jiraUrl: raw,
            authMode: "session",
            jiraTokenB64: null,
          });
          await onConnected(raw, auth.user, "session", null);
        } else {
          showToast(
            "Session not found — enter email & API token below",
            "error",
          );
          return false;
        }
      }
      return true;
    },
    [onConnected, showToast],
  );

  const handleLoadProject = useCallback(
    async (projectKey: string, projectName: string) => {
      setSelectedProjectKey(projectKey);
      setSelectedProjectName(projectName);
      setShowDashboard(false);
      setMetrics(null);
      useDashboardStore.getState().setRawIssues([]);

      showLoading(`Fetching all issues for ${projectKey}…`);

      const token = authMode === "token" ? authToken : null;

      const [openResult, todayResult, resolvedResult, sprintResult] =
        await Promise.all([
          fetchJiraIssues(
            jiraUrl,
            `project = "${projectKey}" AND resolution = Unresolved ORDER BY priority ASC, created DESC`,
            500,
            token,
          ),
          fetchJiraIssues(
            jiraUrl,
            `project = "${projectKey}" AND created >= startOfDay() ORDER BY priority ASC`,
            200,
            token,
          ),
          fetchJiraIssues(
            jiraUrl,
            `project = "${projectKey}" AND resolved >= startOfDay() ORDER BY resolved DESC`,
            200,
            token,
          ),
          fetchActiveSprint(jiraUrl, projectKey, token),
        ]);

      hideLoading();

      if (!openResult.success) {
        showToast(openResult.error || "Failed to fetch issues", "error");
        return;
      }

      const openIssues = openResult.issues || [];
      const todayCreated = todayResult.success ? todayResult.issues || [] : [];
      const todayResolved = resolvedResult.success
        ? resolvedResult.issues || []
        : [];

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

      // Store metrics in QA dashboard store and navigate to overview tab
      const store = useDashboardStore.getState();
      store.setProjectData(projectKey, projectName, m, prevM);
      store.setRawIssues(openIssues);
      store.setSprintInfo(
        sprintResult.sprintName || "",
        sprintResult.sprintGoal || "",
      );
      store.setActiveSection("overview");

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

      showToast(
        `Loaded ${openIssues.length} open issues for ${projectKey}`,
        "success",
      );

      // Navigate to sidebar dashboard
      setShowQADashboard(true);
    },
    [authMode, authToken, jiraUrl, showLoading, hideLoading, showToast],
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
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#0d1117",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid #334155",
            borderTop: "3px solid #6366f1",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      </div>
    );
  }

  if (showQADashboard) {
    return (
      <>
        <LoadingOverlay visible={loading} text={loadingText} />
        <Toast toast={toast} />
        <QADashboard
          projects={projects}
          selectedProjectKey={selectedProjectKey}
          onLoadProject={handleLoadProject}
          user={user}
          authMode={authMode}
        />
      </>
    );
  }

  return (
    <>
      <LoadingOverlay visible={loading} text={loadingText} />
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
