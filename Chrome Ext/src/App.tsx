import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "./context/AppContext";
import QADashboard from "./pages/QADashboard";
import { storageGet, storageSet } from "./services/chromeStorage";
import {
  validateAuth,
  fetchProjects,
  fetchJiraIssues,
} from "./services/jiraService";
import { computeMetrics } from "./services/metricsService";
import type {
  AuthMode,
  JiraUser,
  JiraProject,
  Metrics,
  ManualEntry,
  QANote,
  RAGStatus,
  SnapshotMetrics,
  Theme,
} from "./types";
import Header from "./components/Header/Header";
import ConnectionPanel from "./components/ConnectionPanel/ConnectionPanel";
import ProjectSelector from "./components/ProjectSelector/ProjectSelector";
import Dashboard from "./components/Dashboard/index";
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
  const [testingEnv] = useState("NP");
  const [sprintName] = useState("");
  const [ragOverride, setRagOverride] = useState<RAGStatus>(null);
  const [dsrRecipient, setDsrRecipient] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [showQADashboard, setShowQADashboard] = useState(true);
  const { themeId } = useDashboardStore();

  // Apply QA dashboard theme on first load
  useEffect(() => {
    const initial = QA_THEMES.find((t) => t.id === themeId);
    if (initial) applyTheme(initial);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise from storage on mount
  useEffect(() => {
    storageGet([
      "theme",
      "jiraUrl",
      "jiraEmail",
      "jiraTokenB64",
      "authMode",
    ]).then((stored) => {
      const t = (stored.theme as Theme) || "dark";
      setTheme(t);
      if (stored.jiraUrl) setJiraUrl(stored.jiraUrl as string);
      if (stored.jiraTokenB64) setAuthToken(stored.jiraTokenB64 as string);
      if (stored.authMode) {
        const mode = stored.authMode as AuthMode;
        setAuthMode(mode);
        if (stored.jiraUrl && (mode === "session" || mode === "token")) {
          attemptAutoConnect(
            stored.jiraUrl as string,
            mode === "token" ? (stored.jiraTokenB64 as string | null) : null,
          );
        }
      }
    });
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

      const result = await fetchProjects(url, token);
      if (result.success && result.projects) setProjects(result.projects);

      const saved = await storageGet([
        "manualEntries",
        "qaNotes",
        "dsrRecipient",
        "ragOverride",
      ]);
      if (saved.manualEntries)
        setManualEntries(saved.manualEntries as ManualEntry[]);
      if (saved.qaNotes) setQaNotes(saved.qaNotes as QANote[]);
      if (saved.dsrRecipient) setDsrRecipient(saved.dsrRecipient as string);
      if (saved.ragOverride !== undefined)
        setRagOverride((saved.ragOverride as RAGStatus) || null);
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

      showLoading(`Fetching all issues for ${projectKey}…`);

      const token = authMode === "token" ? authToken : null;

      const [openResult, todayResult, resolvedResult] = await Promise.all([
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
      setPrevMetrics((snaps[snapKey(prevStr)] as SnapshotMetrics) || null);

      const m = computeMetrics(openIssues, todayCreated, todayResolved);
      setMetrics(m);
      setShowDashboard(true);

      // Save today's snapshot
      storageSet({
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
    },
    [authMode, authToken, jiraUrl, showLoading, hideLoading, showToast],
  );

  const handleManualEntriesChange = useCallback((entries: ManualEntry[]) => {
    setManualEntries(entries);
    storageSet({
      manualEntries: entries as unknown as Record<string, unknown>[],
    });
  }, []);

  const handleQaNotesChange = useCallback((notes: QANote[]) => {
    setQaNotes(notes);
    storageSet({ qaNotes: notes as unknown as Record<string, unknown>[] });
  }, []);

  const handleRagOverride = useCallback((rag: RAGStatus) => {
    setRagOverride(rag);
    storageSet({ ragOverride: rag as unknown as Record<string, unknown> });
  }, []);

  const handleDsrRecipientChange = useCallback((r: string) => {
    setDsrRecipient(r);
    storageSet({ dsrRecipient: r });
  }, []);

  // Build the config panel rendered in the QA Dashboard's Configuration section
  const configPanel = (
    <div style={{ maxWidth: 700 }}>
      <ConnectionPanel
        initialUrl={jiraUrl}
        authMode={authMode}
        onConnect={handleConnect}
      />
      {user && (
        <ProjectSelector
          projects={projects}
          onLoadProject={handleLoadProject}
        />
      )}
      {showDashboard && metrics && (
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={() => setShowQADashboard(false)}
            style={{
              background:
                "linear-gradient(135deg, var(--qa-accent,#4f8ef7), #7c3aed)",
              border: "none",
              color: "#fff",
              padding: "10px 28px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              boxShadow: "0 4px 12px rgba(79,142,247,0.3)",
            }}
          >
            📊 View DSR Report
          </button>
        </div>
      )}
    </div>
  );

  if (showQADashboard) {
    return (
      <>
        <LoadingOverlay visible={loading} text={loadingText} />
        <Toast toast={toast} />
        <QADashboard
          onBack={() => setShowQADashboard(false)}
          configPanel={configPanel}
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
      <div className="container">
        <Header
          theme={theme}
          onThemeChange={setTheme}
          user={user}
          authMode={authMode}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "8px 16px 0",
          }}
        >
          <button
            onClick={() => setShowQADashboard(true)}
            style={{
              background: "linear-gradient(135deg, #4f8ef7, #7c3aed)",
              border: "none",
              color: "#fff",
              padding: "8px 18px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(79,142,247,0.3)",
            }}
          >
            🧪 QA Analytics Dashboard
          </button>
        </div>

        <ConnectionPanel
          initialUrl={jiraUrl}
          authMode={authMode}
          onConnect={handleConnect}
        />

        {user && (
          <ProjectSelector
            projects={projects}
            onLoadProject={handleLoadProject}
          />
        )}

        {showDashboard && metrics && (
          <Dashboard
            metrics={metrics}
            prevMetrics={prevMetrics}
            selectedProjectKey={selectedProjectKey}
            selectedProjectName={selectedProjectName}
            manualEntries={manualEntries}
            qaNotes={qaNotes}
            testingEnv={testingEnv}
            sprintName={sprintName}
            ragOverride={ragOverride}
            dsrRecipient={dsrRecipient}
            onManualEntriesChange={handleManualEntriesChange}
            onQaNotesChange={handleQaNotesChange}
            onRagOverrideChange={handleRagOverride}
            onDsrRecipientChange={handleDsrRecipientChange}
          />
        )}
      </div>
    </>
  );
}
