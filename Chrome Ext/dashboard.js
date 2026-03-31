/* ═══════════════════════════════════════════════════════════
   DSR Assistant v2.0 — dashboard.js
   Project-level QA Dashboard
   Health indicators, charts, tables, DSR generation, export
   ═══════════════════════════════════════════════════════════ */

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    root: document.documentElement,
    loadingOverlay: $("#loading-overlay"),
    loadingText: $(".loading-text"),
    toast: $("#toast"),
    jiraUrl: $("#jira-url"),
    connectionDot: $("#connection-status"),
    userBadge: $("#user-badge"),
    btnConnect: $("#btn-connect"),
    tokenSection: $("#token-auth-section"),
    jiraEmail: $("#jira-email"),
    jiraToken: $("#jira-token"),
    btnTokenConnect: $("#btn-token-connect"),
    authModeBadge: $("#auth-mode-badge"),
    authModeText: $("#auth-mode-text"),
    projectSection: $("#project-section"),
    projectSelect: $("#project-select"),
    btnLoadProject: $("#btn-load-project"),
    dashboardBody: $("#dashboard-body"),
    // Health banner
    healthBanner: $("#health-banner"),
    healthDot: $("#health-dot"),
    healthProjectName: $("#health-project-name"),
    healthLabel: $("#health-label"),
    healthReasons: $("#health-reasons"),
    healthDate: $("#health-date"),
    healthTotalCount: $("#health-total-count"),
    // Highlights
    highlightsList: $("#highlights-list"),
    // Stats
    valTotalOpen: $("#val-total-open"),
    valTodayNew: $("#val-today-new"),
    valTodayResolved: $("#val-today-resolved"),
    valReopened: $("#val-reopened"),
    valMustFix: $("#val-must-fix"),
    valBlocked: $("#val-blocked"),
    // Tables
    statusSummaryBody: $("#status-summary-body"),
    mustfixBody: $("#mustfix-body"),
    mustfixCount: $("#mustfix-count"),
    mustfixEmpty: $("#mustfix-empty"),
    openIssuesBody: $("#open-issues-body"),
    openCount: $("#open-count"),
    openEmpty: $("#open-empty"),
    // Charts
    chartOpenStatus: $("#chart-open-status"),
    chartOpenPriority: $("#chart-open-priority"),
    chartTodayPriority: $("#chart-today-priority"),
    chartMustfix: $("#chart-mustfix"),
    // DSR
    dsrSection: $("#dsr-section"),
    dsrOutput: $("#dsr-output"),
    btnCopy: $("#btn-copy"),
    btnCopyHtml: $("#btn-copy-html"),
    // Export
    exportSection: $("#export-section"),
    btnExportPng: $("#btn-export-png"),
    btnExportPdf: $("#btn-export-pdf"),
    // Multi-project overview
    multiProjectSection: $("#multi-project-section"),
    projectHealthGrid: $("#project-health-grid"),
    btnLoadAll: $("#btn-load-all"),
    overviewHint: $("#overview-hint"),
    // Manual QA table
    manualBody: $("#manual-body"),
    btnAddManual: $("#btn-add-manual"),
    manualEmpty: $("#manual-empty"),
    // QA Notes
    qaNotesListEl: $("#qa-notes-list"),
    btnAddNote: $("#btn-add-note"),
    notesEmpty: $("#notes-empty"),
    // DSR recipient
    dsrRecipient: $("#dsr-recipient"),
    btnRegenerate: $("#btn-regenerate"),
    // Testing context
    testingEnvEl: $("#testing-env"),
    sprintNameEl: $("#sprint-name"),
    btnDetectSprint: $("#btn-detect-sprint"),
    // Health meta extra badges
    healthEnvBadge: $("#health-env-badge"),
    healthSprintBadge: $("#health-sprint-badge"),
    // RAG override buttons
    ragBtnAuto: $("#rag-btn-auto"),
    ragBtnGreen: $("#rag-btn-green"),
    ragBtnYellow: $("#rag-btn-yellow"),
    ragBtnRed: $("#rag-btn-red"),
    // Trend indicators
    trendTotalOpen: $("#trend-total-open"),
    trendTodayNew: $("#trend-today-new"),
    trendTodayResolved: $("#trend-today-resolved"),
    trendReopened: $("#trend-reopened"),
    trendMustFix: $("#trend-must-fix"),
    trendBlocked: $("#trend-blocked"),
  };

  // ── State ──────────────────────────────────────────────
  let currentTheme = "dark";
  let savedUrl = "";
  let authToken = null;
  let authMode = "none";
  let selectedProjectKey = "";
  let selectedProjectName = "";
  let chartInstances = {};
  let lastMetrics = null;
  let allIssues = [];
  let manualEntries = [];
  let qaNotes = [];
  let allProjectsList = [];
  let testingEnv = "NP"; // Current testing environment
  let sprintName = ""; // Sprint / release name
  let ragOverride = null; // null=auto | "green"|"yellow"|"red"
  let prevMetrics = null; // Yesterday's snapshot for trend arrows

  // ══════════════════════════════════════════════════════════
  //  A. INIT
  // ══════════════════════════════════════════════════════════
  document.addEventListener("DOMContentLoaded", async () => {
    const stored = await chromeStorageGet([
      "theme",
      "jiraUrl",
      "jiraEmail",
      "jiraTokenB64",
      "authMode",
    ]);

    if (stored.theme) currentTheme = stored.theme;
    if (stored.jiraUrl) {
      savedUrl = stored.jiraUrl;
      dom.jiraUrl.value = savedUrl;
    }
    if (stored.jiraEmail) dom.jiraEmail.value = stored.jiraEmail;
    if (stored.jiraTokenB64) authToken = stored.jiraTokenB64;
    if (stored.authMode) authMode = stored.authMode;

    applyTheme(currentTheme);
    bindEvents();

    if (savedUrl && (authMode === "session" || authMode === "token")) {
      attemptAutoConnect();
    }
  });

  // ══════════════════════════════════════════════════════════
  //  B. THEME
  // ══════════════════════════════════════════════════════════
  function applyTheme(theme) {
    currentTheme = theme;
    dom.root.setAttribute("data-theme", theme);
    $$(".theme-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === theme);
    });
    if (lastMetrics) recolorCharts();
    chromeStorageSet({ theme });
  }

  // ══════════════════════════════════════════════════════════
  //  C. EVENTS
  // ══════════════════════════════════════════════════════════
  function bindEvents() {
    $$(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
    });

    dom.btnConnect.addEventListener("click", connectWithSession);
    dom.btnTokenConnect.addEventListener("click", connectWithToken);
    dom.btnLoadProject.addEventListener("click", loadProjectDashboard);
    dom.btnLoadAll.addEventListener("click", loadMultiProjectOverview);

    dom.btnAddManual.addEventListener("click", addManualEntry);
    dom.btnAddNote.addEventListener("click", addQaNote);
    dom.btnRegenerate.addEventListener("click", () => {
      if (lastMetrics) generateDsrText(lastMetrics);
    });

    dom.btnCopy.addEventListener("click", copyDsr);
    dom.btnCopyHtml.addEventListener("click", copyDsrHtml);
    dom.btnExportPng.addEventListener("click", exportPng);
    dom.btnExportPdf.addEventListener("click", exportPdf);

    // Testing context
    if (dom.testingEnvEl) {
      dom.testingEnvEl.addEventListener("change", () => {
        testingEnv = dom.testingEnvEl.value;
        chromeStorageSet({ testingEnv });
        if (dom.healthEnvBadge)
          dom.healthEnvBadge.textContent = "\uD83C\uDF0E " + testingEnv;
        if (lastMetrics) generateDsrText(lastMetrics);
      });
    }
    if (dom.sprintNameEl) {
      dom.sprintNameEl.addEventListener("input", () => {
        sprintName = dom.sprintNameEl.value;
        chromeStorageSet({ sprintName });
      });
      dom.sprintNameEl.addEventListener("blur", () => {
        if (lastMetrics) {
          if (dom.healthSprintBadge)
            dom.healthSprintBadge.textContent = sprintName
              ? "\uD83C\uDFC3 " + sprintName
              : "";
          generateDsrText(lastMetrics);
        }
      });
    }
    if (dom.btnDetectSprint) {
      dom.btnDetectSprint.addEventListener("click", detectActiveSprint);
    }

    // RAG override
    [dom.ragBtnAuto, dom.ragBtnGreen, dom.ragBtnYellow, dom.ragBtnRed].forEach(
      (btn) => {
        if (!btn) return;
        btn.addEventListener("click", () => {
          const val = btn.dataset.rag;
          ragOverride = val === "auto" ? null : val;
          chromeStorageSet({ ragOverride });
          updateRagOverrideUI();
          if (lastMetrics) {
            renderHealthBanner(lastMetrics);
            generateDsrText(lastMetrics);
          }
          showToast(
            ragOverride
              ? "Health overridden to \u2018" +
                  ragOverride.toUpperCase() +
                  "\u2019"
              : "Health status reset to Auto",
            "info",
          );
        });
      },
    );
  }

  // ── Sprint auto-detect ────────────────────────────────────
  async function detectActiveSprint() {
    if (!selectedProjectKey) {
      showToast("Select a project first", "error");
      return;
    }
    const btn = dom.btnDetectSprint;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Detecting…";
    }
    try {
      const result = await sendMessage({
        type: "FETCH_ACTIVE_SPRINT",
        baseUrl: savedUrl,
        projectKey: selectedProjectKey,
        authToken: authMode === "token" ? authToken : null,
      });
      if (result.success && result.sprintName) {
        sprintName = result.sprintName;
        if (dom.sprintNameEl) dom.sprintNameEl.value = sprintName;
        chromeStorageSet({ sprintName });
        if (dom.healthSprintBadge)
          dom.healthSprintBadge.textContent = "\uD83C\uDFC3 " + sprintName;
        showToast("Sprint detected: " + sprintName, "success");
        if (lastMetrics) generateDsrText(lastMetrics);
      } else {
        showToast("No active sprint found. Enter it manually.", "info");
      }
    } catch (e) {
      showToast("Could not detect sprint", "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> Detect Sprint';
      }
    }
  }

  // ── RAG override UI sync ──────────────────────────────────
  function updateRagOverrideUI() {
    [dom.ragBtnAuto, dom.ragBtnGreen, dom.ragBtnYellow, dom.ragBtnRed].forEach(
      (btn) => {
        if (!btn) return;
        const isActive =
          (ragOverride === null && btn.dataset.rag === "auto") ||
          btn.dataset.rag === ragOverride;
        btn.classList.toggle("rag-active", isActive);
      },
    );
  }

  // ══════════════════════════════════════════════════════════
  //  D. CONNECTION FLOW
  // ══════════════════════════════════════════════════════════
  async function attemptAutoConnect() {
    dom.connectionDot.className = "status-dot loading";
    const token = authMode === "token" ? authToken : null;
    const auth = await sendMessage({
      type: "VALIDATE_AUTH",
      baseUrl: savedUrl,
      authToken: token,
    });
    if (auth.success) {
      onConnected(auth.user, authMode === "token" ? "token" : "session");
    } else {
      dom.connectionDot.className = "status-dot disconnected";
      authMode = "none";
    }
  }

  async function connectWithSession() {
    const raw = dom.jiraUrl.value.trim().replace(/\/+$/, "");
    if (!validateUrl(raw)) return;

    savedUrl = raw;
    dom.jiraUrl.value = raw;
    await chromeStorageSet({ jiraUrl: raw });

    dom.connectionDot.className = "status-dot loading";
    showToast("Checking browser session\u2026", "info");

    const auth = await sendMessage({
      type: "VALIDATE_AUTH",
      baseUrl: raw,
      authToken: null,
    });

    if (auth.success) {
      authToken = null;
      authMode = "session";
      await chromeStorageSet({ authMode: "session", jiraTokenB64: null });
      dom.tokenSection.classList.add("hidden");
      onConnected(auth.user, "session");
    } else {
      dom.connectionDot.className = "status-dot disconnected";
      dom.tokenSection.classList.remove("hidden");
      showToast(
        "Session not found \u2014 enter email & API token below",
        "error",
      );
    }
  }

  async function connectWithToken() {
    const raw = dom.jiraUrl.value.trim().replace(/\/+$/, "");
    if (!validateUrl(raw)) return;

    const email = dom.jiraEmail.value.trim();
    const token = dom.jiraToken.value.trim();
    if (!email || !token) {
      showToast("Enter both email and API token", "error");
      return;
    }

    savedUrl = raw;
    dom.connectionDot.className = "status-dot loading";
    showToast("Authenticating with token\u2026", "info");

    const b64 = btoa(email + ":" + token);
    const auth = await sendMessage({
      type: "VALIDATE_AUTH",
      baseUrl: raw,
      authToken: b64,
    });

    if (auth.success) {
      authToken = b64;
      authMode = "token";
      await chromeStorageSet({
        jiraUrl: raw,
        jiraEmail: email,
        jiraTokenB64: b64,
        authMode: "token",
      });
      onConnected(auth.user, "token");
    } else {
      dom.connectionDot.className = "status-dot disconnected";
      showToast(auth.error || "Authentication failed", "error");
    }
  }

  async function onConnected(user, mode) {
    dom.connectionDot.className = "status-dot connected";
    dom.userBadge.textContent = user.displayName;
    dom.userBadge.classList.add("visible");

    dom.authModeText.textContent =
      mode === "session"
        ? "\uD83D\uDD12 Session Auth"
        : "\uD83D\uDD11 Token Auth";
    dom.authModeBadge.classList.remove("hidden");

    showToast("Connected as " + user.displayName, "success");
    await loadProjects();
    dom.projectSection.classList.remove("hidden");

    // Load saved manual entries and notes
    const saved = await chromeStorageGet([
      "manualEntries",
      "qaNotes",
      "dsrRecipient",
      "testingEnv",
      "sprintName",
      "ragOverride",
    ]);
    if (saved.manualEntries) manualEntries = saved.manualEntries;
    if (saved.qaNotes) qaNotes = saved.qaNotes;
    if (saved.dsrRecipient) dom.dsrRecipient.value = saved.dsrRecipient;
    if (saved.testingEnv) {
      testingEnv = saved.testingEnv;
      if (dom.testingEnvEl) dom.testingEnvEl.value = testingEnv;
    }
    if (saved.sprintName) {
      sprintName = saved.sprintName;
      if (dom.sprintNameEl) dom.sprintNameEl.value = sprintName;
    }
    if (saved.ragOverride !== undefined) {
      ragOverride = saved.ragOverride || null;
      updateRagOverrideUI();
    }

    // Auto-save recipient on change
    dom.dsrRecipient.addEventListener("input", () => {
      chromeStorageSet({ dsrRecipient: dom.dsrRecipient.value });
    });
  }

  function validateUrl(raw) {
    if (!raw) {
      showToast("Please enter a Jira URL", "error");
      return false;
    }
    try {
      const url = new URL(raw);
      if (!url.hostname.endsWith(".atlassian.net")) {
        showToast("URL must be a *.atlassian.net domain", "error");
        return false;
      }
    } catch (e) {
      showToast("Invalid URL format", "error");
      return false;
    }
    return true;
  }

  // ══════════════════════════════════════════════════════════
  //  E. PROJECT LOADING
  // ══════════════════════════════════════════════════════════
  async function loadProjects() {
    const result = await sendMessage({
      type: "FETCH_PROJECTS",
      baseUrl: savedUrl,
      authToken: authMode === "token" ? authToken : null,
    });

    dom.projectSelect.innerHTML =
      '<option value="">— Choose a project —</option>';

    if (result.success && result.projects.length > 0) {
      allProjectsList = result.projects;
      result.projects.forEach((p) => {
        const opt = document.createElement("option");
        opt.value = p.key;
        opt.textContent = p.name + " (" + p.key + ")";
        dom.projectSelect.appendChild(opt);
      });
    }
  }

  // ══════════════════════════════════════════════════════════
  //  F. LOAD PROJECT DASHBOARD
  // ══════════════════════════════════════════════════════════
  async function loadProjectDashboard() {
    selectedProjectKey = dom.projectSelect.value;
    if (!selectedProjectKey) {
      showToast("Please select a project first", "error");
      return;
    }

    selectedProjectName =
      dom.projectSelect.options[dom.projectSelect.selectedIndex].textContent;

    showLoading("Fetching all issues for " + selectedProjectKey + "\u2026");

    const token = authMode === "token" ? authToken : null;

    // Fetch all open issues (non-resolved) for the project
    const openResult = await sendMessage({
      type: "FETCH_JIRA",
      baseUrl: savedUrl,
      jql:
        'project = "' +
        selectedProjectKey +
        '" AND resolution = Unresolved ORDER BY priority ASC, created DESC',
      maxResults: 500,
      authToken: token,
    });

    if (!openResult.success) {
      hideLoading();
      showToast(openResult.error || "Failed to fetch issues", "error");
      return;
    }

    // Fetch today's created issues
    const todayResult = await sendMessage({
      type: "FETCH_JIRA",
      baseUrl: savedUrl,
      jql:
        'project = "' +
        selectedProjectKey +
        '" AND created >= startOfDay() ORDER BY priority ASC',
      maxResults: 200,
      authToken: token,
    });

    // Fetch today's resolved issues
    const resolvedResult = await sendMessage({
      type: "FETCH_JIRA",
      baseUrl: savedUrl,
      jql:
        'project = "' +
        selectedProjectKey +
        '" AND resolved >= startOfDay() ORDER BY resolved DESC',
      maxResults: 200,
      authToken: token,
    });

    hideLoading();

    const openIssues = openResult.issues || [];
    const todayCreated = todayResult.success ? todayResult.issues || [] : [];
    const todayResolved = resolvedResult.success
      ? resolvedResult.issues || []
      : [];

    allIssues = openIssues;

    // Load previous snapshot for trend arrows
    const todayStr = new Date().toISOString().slice(0, 10);
    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 1);
    const prevStr = prevDate.toISOString().slice(0, 10);
    const snapKey = (d) => "snap_" + selectedProjectKey + "_" + d;
    const snaps = await chromeStorageGet([snapKey(prevStr), snapKey(todayStr)]);
    prevMetrics = snaps[snapKey(prevStr)] || null;

    // Compute all metrics
    const metrics = computeMetrics(openIssues, todayCreated, todayResolved);
    lastMetrics = metrics;

    // Save today's snapshot (fire-and-forget)
    chromeStorageSet({
      [snapKey(todayStr)]: {
        totalOpen: metrics.totalOpen,
        todayNew: metrics.todayNew,
        todayResolved: metrics.todayResolved,
        reopened: metrics.reopened,
        mustFix: metrics.mustFix,
        blocked: metrics.blocked,
      },
    });

    // Render everything
    renderHealthBanner(metrics);
    renderHighlights(metrics);
    renderStats(metrics);
    renderStatusSummaryTable(metrics);
    renderCharts(metrics);
    renderMustFixTable(metrics.mustFixIssues);
    renderOpenIssuesTable(openIssues);
    generateDsrText(metrics);

    // Show sections
    dom.dashboardBody.classList.remove("hidden");
    dom.dsrSection.classList.remove("hidden");
    dom.exportSection.classList.remove("hidden");

    // Render manual entries and notes for this project
    renderManualEntries();
    renderQaNotes();

    showToast(
      "Loaded " + openIssues.length + " open issues for " + selectedProjectKey,
      "success",
    );
  }

  // ══════════════════════════════════════════════════════════
  //  F2. MULTI-PROJECT HEALTH OVERVIEW
  // ══════════════════════════════════════════════════════════
  async function loadMultiProjectOverview() {
    if (allProjectsList.length === 0) {
      showToast("No projects found. Connect to Jira first.", "error");
      return;
    }

    dom.multiProjectSection.classList.remove("hidden");
    dom.projectHealthGrid.innerHTML = "";

    // Show loading cards for each project
    allProjectsList.forEach((p) => {
      const card = document.createElement("div");
      card.className = "project-health-card";
      card.id = "phc-" + p.key;
      card.innerHTML =
        '<div class="phc-header"><div class="phc-title"><span class="phc-name">' +
        escapeHtml(p.name) +
        '</span><span class="phc-key">' +
        escapeHtml(p.key) +
        '</span></div></div><div class="phc-loading"><span class="mini-spinner"></span>Loading…</div>';
      dom.projectHealthGrid.appendChild(card);
    });

    showToast(
      "Loading health data for " + allProjectsList.length + " projects…",
      "info",
    );

    // Fetch data for each project sequentially to avoid rate limits
    const token = authMode === "token" ? authToken : null;

    for (const project of allProjectsList) {
      try {
        const openResult = await sendMessage({
          type: "FETCH_JIRA",
          baseUrl: savedUrl,
          jql:
            'project = "' +
            project.key +
            '" AND resolution = Unresolved ORDER BY priority ASC',
          maxResults: 500,
          authToken: token,
        });

        const todayResult = await sendMessage({
          type: "FETCH_JIRA",
          baseUrl: savedUrl,
          jql:
            'project = "' +
            project.key +
            '" AND created >= startOfDay() ORDER BY priority ASC',
          maxResults: 200,
          authToken: token,
        });

        const resolvedResult = await sendMessage({
          type: "FETCH_JIRA",
          baseUrl: savedUrl,
          jql:
            'project = "' +
            project.key +
            '" AND resolved >= startOfDay() ORDER BY resolved DESC',
          maxResults: 200,
          authToken: token,
        });

        const openIssues = openResult.success ? openResult.issues || [] : [];
        const todayCreated = todayResult.success
          ? todayResult.issues || []
          : [];
        const todayResolved = resolvedResult.success
          ? resolvedResult.issues || []
          : [];

        const metrics = computeMetrics(openIssues, todayCreated, todayResolved);
        renderProjectHealthCard(project, metrics);
      } catch (err) {
        renderProjectHealthCardError(project, err.message || "Failed to load");
      }
    }

    showToast("All project health data loaded!", "success");
  }

  function renderProjectHealthCard(project, metrics) {
    const card = document.getElementById("phc-" + project.key);
    if (!card) return;

    const { health, reasons } = calculateHealth(metrics);
    const healthLabels = {
      green: "HEALTHY",
      yellow: "AT RISK",
      red: "CRITICAL",
    };

    card.className = "project-health-card phc-" + health;

    let reasonsHtml = "";
    reasons.slice(0, 3).forEach((r) => {
      reasonsHtml +=
        '<span class="phc-reason r-' +
        r.type +
        '">' +
        escapeHtml(r.text) +
        "</span>";
    });

    card.innerHTML =
      '<div class="phc-header">' +
      '<div class="phc-title">' +
      '<span class="phc-dot"></span>' +
      '<span class="phc-name">' +
      escapeHtml(project.name) +
      "</span>" +
      '<span class="phc-key">' +
      escapeHtml(project.key) +
      "</span>" +
      "</div>" +
      '<span class="phc-health-tag">' +
      healthLabels[health] +
      "</span>" +
      "</div>" +
      '<div class="phc-stats">' +
      '<div class="phc-stat"><div class="phc-stat-val">' +
      metrics.totalOpen +
      '</div><div class="phc-stat-label">Open</div></div>' +
      '<div class="phc-stat"><div class="phc-stat-val">' +
      metrics.todayNew +
      '</div><div class="phc-stat-label">New Today</div></div>' +
      '<div class="phc-stat"><div class="phc-stat-val' +
      (metrics.mustFix > 0 ? " phc-danger" : "") +
      '">' +
      metrics.mustFix +
      '</div><div class="phc-stat-label">Must Fix</div></div>' +
      '<div class="phc-stat"><div class="phc-stat-val' +
      (metrics.blocked > 0 ? " phc-danger" : "") +
      '">' +
      metrics.blocked +
      '</div><div class="phc-stat-label">Blocked</div></div>' +
      "</div>" +
      '<div class="phc-reasons">' +
      reasonsHtml +
      "</div>";

    // Click card to drill into project
    card.addEventListener("click", () => {
      dom.projectSelect.value = project.key;
      loadProjectDashboard();
      card.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function renderProjectHealthCardError(project, msg) {
    const card = document.getElementById("phc-" + project.key);
    if (!card) return;
    card.innerHTML =
      '<div class="phc-header"><div class="phc-title">' +
      '<span class="phc-name">' +
      escapeHtml(project.name) +
      "</span>" +
      '<span class="phc-key">' +
      escapeHtml(project.key) +
      "</span>" +
      "</div></div>" +
      '<div class="phc-loading" style="color:var(--danger)">Failed: ' +
      escapeHtml(msg) +
      "</div>";
  }

  // ══════════════════════════════════════════════════════════
  //  F3. MANUAL QA TESTING TABLE
  // ══════════════════════════════════════════════════════════
  function addManualEntry() {
    manualEntries.push({
      id: Date.now().toString(36),
      jiraId: "",
      title: "",
      qaStatus: "WIP",
      devOwner: "",
      qaOwner: "",
      openBugs: 0,
      overallBugs: 0,
      unitLevel: 0,
      rejected: 0,
    });
    saveManualEntries();
    renderManualEntries();
  }

  function removeManualEntry(id) {
    manualEntries = manualEntries.filter((e) => e.id !== id);
    saveManualEntries();
    renderManualEntries();
  }

  function updateManualEntry(id, field, value) {
    const entry = manualEntries.find((e) => e.id === id);
    if (entry) {
      entry[field] = value;
      saveManualEntries();
    }
  }

  function saveManualEntries() {
    chromeStorageSet({ manualEntries });
  }

  function renderManualEntries() {
    if (manualEntries.length === 0) {
      dom.manualBody.innerHTML = "";
      dom.manualEmpty.classList.remove("hidden");
      return;
    }
    dom.manualEmpty.classList.add("hidden");

    dom.manualBody.innerHTML = manualEntries
      .map((e) => {
        const statusOptions = ["Not Started", "WIP", "Done", "Blocked"]
          .map(
            (s) =>
              '<option value="' +
              s +
              '"' +
              (e.qaStatus === s ? " selected" : "") +
              ">" +
              s +
              "</option>",
          )
          .join("");

        return (
          "<tr>" +
          '<td><input class="editable-cell" value="' +
          escapeAttr(e.jiraId) +
          '" data-id="' +
          e.id +
          '" data-field="jiraId" placeholder="ABC-123" /></td>' +
          '<td><input class="editable-cell" value="' +
          escapeAttr(e.title) +
          '" data-id="' +
          e.id +
          '" data-field="title" placeholder="Feature/Module name" /></td>' +
          '<td><select class="editable-cell cell-select" data-id="' +
          e.id +
          '" data-field="qaStatus">' +
          statusOptions +
          "</select></td>" +
          '<td><input class="editable-cell" value="' +
          escapeAttr(e.devOwner) +
          '" data-id="' +
          e.id +
          '" data-field="devOwner" placeholder="Dev name" /></td>' +
          '<td><input class="editable-cell" value="' +
          escapeAttr(e.qaOwner) +
          '" data-id="' +
          e.id +
          '" data-field="qaOwner" placeholder="QA name" /></td>' +
          '<td><input type="number" class="editable-cell cell-number" value="' +
          e.openBugs +
          '" min="0" data-id="' +
          e.id +
          '" data-field="openBugs" /></td>' +
          '<td><input type="number" class="editable-cell cell-number" value="' +
          e.overallBugs +
          '" min="0" data-id="' +
          e.id +
          '" data-field="overallBugs" /></td>' +
          '<td><input type="number" class="editable-cell cell-number" value="' +
          e.unitLevel +
          '" min="0" data-id="' +
          e.id +
          '" data-field="unitLevel" /></td>' +
          '<td><input type="number" class="editable-cell cell-number" value="' +
          e.rejected +
          '" min="0" data-id="' +
          e.id +
          '" data-field="rejected" /></td>' +
          '<td><button class="btn-remove-row" data-id="' +
          e.id +
          '" title="Remove entry">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          "</button></td>" +
          "</tr>"
        );
      })
      .join("");

    // Bind events for editable cells
    dom.manualBody.querySelectorAll(".editable-cell").forEach((el) => {
      el.addEventListener("change", (e) => {
        const val =
          el.type === "number" ? parseInt(el.value, 10) || 0 : el.value;
        updateManualEntry(el.dataset.id, el.dataset.field, val);
      });
    });

    dom.manualBody.querySelectorAll(".btn-remove-row").forEach((btn) => {
      btn.addEventListener("click", () => removeManualEntry(btn.dataset.id));
    });
  }

  function escapeAttr(str) {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ══════════════════════════════════════════════════════════
  //  F4. QA NOTES & ACTION ITEMS
  // ══════════════════════════════════════════════════════════
  function addQaNote() {
    qaNotes.push({ id: Date.now().toString(36), text: "" });
    saveQaNotes();
    renderQaNotes();
    // Focus the new note input
    const inputs = dom.qaNotesListEl.querySelectorAll(".qa-note-input");
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
  }

  function removeQaNote(id) {
    qaNotes = qaNotes.filter((n) => n.id !== id);
    saveQaNotes();
    renderQaNotes();
  }

  function saveQaNotes() {
    chromeStorageSet({ qaNotes });
  }

  function renderQaNotes() {
    if (qaNotes.length === 0) {
      dom.qaNotesListEl.innerHTML = "";
      dom.notesEmpty.classList.remove("hidden");
      return;
    }
    dom.notesEmpty.classList.add("hidden");

    dom.qaNotesListEl.innerHTML = qaNotes
      .map(
        (n) =>
          '<div class="qa-note-item">' +
          '<span class="qa-note-bullet">•</span>' +
          '<input class="qa-note-input" value="' +
          escapeAttr(n.text) +
          '" data-id="' +
          n.id +
          '" placeholder="Type a note or action item…" />' +
          '<button class="qa-note-remove" data-id="' +
          n.id +
          '" title="Remove">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          "</button>" +
          "</div>",
      )
      .join("");

    dom.qaNotesListEl.querySelectorAll(".qa-note-input").forEach((el) => {
      el.addEventListener("input", () => {
        const note = qaNotes.find((n) => n.id === el.dataset.id);
        if (note) {
          note.text = el.value;
          saveQaNotes();
        }
      });
    });

    dom.qaNotesListEl.querySelectorAll(".qa-note-remove").forEach((btn) => {
      btn.addEventListener("click", () => removeQaNote(btn.dataset.id));
    });
  }

  // ══════════════════════════════════════════════════════════
  //  G. COMPUTE METRICS
  // ══════════════════════════════════════════════════════════
  function computeMetrics(openIssues, todayCreated, todayResolved) {
    const today = new Date().toISOString().slice(0, 10);

    // Status breakdown of open issues
    const statusMap = {};
    const priorityMap = {};
    const typeMap = {};
    let blockedCount = 0;
    let reopenedCount = 0;
    const mustFixIssues = [];

    openIssues.forEach((issue) => {
      // Status buckets
      const statusCat = classifyStatus(issue);
      statusMap[statusCat] = (statusMap[statusCat] || 0) + 1;

      // Priority buckets
      const prio = normalizePriority(issue.priority);
      priorityMap[prio] = (priorityMap[prio] || 0) + 1;

      // Type buckets
      const type = issue.issueType || "Other";
      typeMap[type] = (typeMap[type] || 0) + 1;

      // Blocked
      const sLow = (issue.status || "").toLowerCase();
      if (
        sLow.includes("block") ||
        sLow.includes("impediment") ||
        sLow.includes("waiting")
      ) {
        blockedCount++;
      }

      // Reopened (heuristic: status contains "reopen")
      if (sLow.includes("reopen")) {
        reopenedCount++;
      }

      // Must-fix: Highest or Critical priority, or has must-fix / must_fix label
      const pLow = (issue.priority || "").toLowerCase();
      const labels = (issue.labels || []).map((l) => l.toLowerCase());
      if (
        pLow === "highest" ||
        pLow === "critical" ||
        pLow === "blocker" ||
        labels.includes("must-fix") ||
        labels.includes("must_fix") ||
        labels.includes("mustfix")
      ) {
        mustFixIssues.push(issue);
      }
    });

    // Today's created by priority
    const todayPriorityMap = {};
    todayCreated.forEach((issue) => {
      const prio = normalizePriority(issue.priority);
      todayPriorityMap[prio] = (todayPriorityMap[prio] || 0) + 1;
    });

    // Must-fix by status
    const mustFixStatusMap = {};
    mustFixIssues.forEach((issue) => {
      const statusCat = classifyStatus(issue);
      mustFixStatusMap[statusCat] = (mustFixStatusMap[statusCat] || 0) + 1;
    });

    // Bug count (open issues of type Bug)
    const bugCount = openIssues.filter((i) => {
      const t = (i.issueType || "").toLowerCase();
      return t === "bug" || t === "defect";
    }).length;

    // Component breakdown
    const componentOpenMap = {};
    const componentBlockedMap = {};
    openIssues.forEach((issue) => {
      const comps =
        issue.components && issue.components.length > 0
          ? issue.components
          : null;
      if (!comps) return;
      comps.forEach((comp) => {
        componentOpenMap[comp] = (componentOpenMap[comp] || 0) + 1;
        const sLow = (issue.status || "").toLowerCase();
        if (
          sLow.includes("block") ||
          sLow.includes("impediment") ||
          sLow.includes("waiting")
        ) {
          componentBlockedMap[comp] = (componentBlockedMap[comp] || 0) + 1;
        }
      });
    });

    return {
      totalOpen: openIssues.length,
      todayNew: todayCreated.length,
      todayResolved: todayResolved.length,
      reopened: reopenedCount,
      mustFix: mustFixIssues.length,
      blocked: blockedCount,
      statusMap,
      priorityMap,
      typeMap,
      todayPriorityMap,
      mustFixStatusMap,
      mustFixIssues,
      bugCount,
      todayCreated,
      todayResolved,
      openIssues,
      componentOpenMap,
      componentBlockedMap,
    };
  }

  function classifyStatus(issue) {
    const cat = (issue.statusCategory || "").toLowerCase();
    if (cat === "done" || cat === "complete") return "Done";
    if (cat === "in progress") return "In Progress";

    const s = (issue.status || "").toLowerCase();
    if (["done", "closed", "resolved", "complete"].some((k) => s.includes(k)))
      return "Done";
    if (
      ["in progress", "in review", "in development", "dev", "review"].some(
        (k) => s.includes(k),
      )
    )
      return "In Progress";
    if (["block", "impediment", "waiting"].some((k) => s.includes(k)))
      return "Blocked";
    if (s.includes("backlog")) return "Backlog";
    if (s.includes("reopen")) return "Reopened";
    return "Open";
  }

  function normalizePriority(p) {
    const low = (p || "").toLowerCase();
    if (low === "highest" || low === "critical" || low === "blocker")
      return "Highest";
    if (low === "high") return "High";
    if (low === "medium" || low === "normal") return "Medium";
    if (low === "low") return "Low";
    if (low === "lowest" || low === "trivial") return "Lowest";
    return "Medium";
  }

  // ══════════════════════════════════════════════════════════
  //  H. HEALTH CALCULATION
  // ══════════════════════════════════════════════════════════
  function calculateHealth(metrics) {
    let score = 0; // 0 = green, >=3 = yellow, >=6 = red
    const reasons = [];

    // Critical / Blocker bugs
    const critCount = metrics.priorityMap["Highest"] || 0;
    if (critCount > 5) {
      score += 4;
      reasons.push({
        text: critCount + " critical/blocker issues open",
        type: "danger",
      });
    } else if (critCount > 0) {
      score += 2;
      reasons.push({
        text: critCount + " critical/blocker issues open",
        type: "warning",
      });
    }

    // Must-fix count
    if (metrics.mustFix > 15) {
      score += 3;
      reasons.push({
        text: metrics.mustFix + " must-fix issues pending",
        type: "danger",
      });
    } else if (metrics.mustFix > 5) {
      score += 1;
      reasons.push({
        text: metrics.mustFix + " must-fix issues pending",
        type: "warning",
      });
    }

    // Blocked count
    if (metrics.blocked > 10) {
      score += 3;
      reasons.push({
        text: metrics.blocked + " issues blocked",
        type: "danger",
      });
    } else if (metrics.blocked > 3) {
      score += 1;
      reasons.push({
        text: metrics.blocked + " issues blocked",
        type: "warning",
      });
    }

    // Total open relative size (large backlog)
    if (metrics.totalOpen > 200) {
      score += 2;
      reasons.push({
        text: metrics.totalOpen + " total open issues (high backlog)",
        type: "warning",
      });
    } else if (metrics.totalOpen > 100) {
      score += 1;
      reasons.push({
        text: metrics.totalOpen + " total open issues",
        type: "warning",
      });
    }

    // Today's new > resolved (incoming > outgoing)
    if (metrics.todayNew > 0 && metrics.todayNew > metrics.todayResolved * 2) {
      score += 1;
      reasons.push({
        text:
          "New issues (" +
          metrics.todayNew +
          ") outpacing resolved (" +
          metrics.todayResolved +
          ")",
        type: "warning",
      });
    }

    // Positive signals
    if (critCount === 0) {
      reasons.push({ text: "No critical/blocker issues", type: "success" });
    }
    if (metrics.blocked === 0) {
      reasons.push({ text: "No blocked issues", type: "success" });
    }
    if (metrics.todayResolved > metrics.todayNew && metrics.todayResolved > 0) {
      reasons.push({
        text:
          "Resolving faster than incoming (" +
          metrics.todayResolved +
          " resolved today)",
        type: "success",
      });
    }

    let health;
    if (score >= 6) health = "red";
    else if (score >= 3) health = "yellow";
    else health = "green";

    return { health, reasons, score };
  }

  // ══════════════════════════════════════════════════════════
  //  I. RENDER HEALTH BANNER
  // ══════════════════════════════════════════════════════════
  function renderHealthBanner(metrics) {
    const { health: autoHealth, reasons } = calculateHealth(metrics);
    const health = ragOverride || autoHealth;

    dom.healthBanner.className = "health-banner fade-in health-" + health;
    dom.healthProjectName.textContent = selectedProjectName;

    const labels = { green: "HEALTHY", yellow: "AT RISK", red: "CRITICAL" };
    dom.healthLabel.textContent =
      labels[health] + (ragOverride ? " \u25CA Override" : "");

    // Reasons tags
    dom.healthReasons.innerHTML = "";
    reasons.forEach((r) => {
      const tag = document.createElement("span");
      tag.className = "health-reason-tag tag-" + r.type;
      tag.textContent = r.text;
      dom.healthReasons.appendChild(tag);
    });
    if (ragOverride) {
      const tag = document.createElement("span");
      tag.className = "health-reason-tag tag-warning";
      tag.textContent = "\u270F\uFE0F Manual override active";
      dom.healthReasons.appendChild(tag);
    }

    // Meta
    dom.healthDate.textContent =
      "\uD83D\uDCC5 " +
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    dom.healthTotalCount.textContent =
      "\uD83D\uDCCA " + metrics.totalOpen + " open issues";

    // Env + Sprint badges
    const currentEnv =
      (dom.testingEnvEl && dom.testingEnvEl.value) || testingEnv;
    const currentSprint =
      (dom.sprintNameEl && dom.sprintNameEl.value.trim()) || sprintName;
    if (dom.healthEnvBadge) {
      dom.healthEnvBadge.textContent = "\uD83C\uDF0E Env: " + currentEnv;
    }
    if (dom.healthSprintBadge) {
      dom.healthSprintBadge.textContent = currentSprint
        ? "\uD83C\uDFC3 " + currentSprint
        : "";
    }

    // Sync override UI
    updateRagOverrideUI();
  }

  // ══════════════════════════════════════════════════════════
  //  J. RENDER HIGHLIGHTS
  // ══════════════════════════════════════════════════════════
  function renderHighlights(metrics) {
    const items = [];

    // Must fix
    if (metrics.mustFix > 0) {
      items.push({
        icon: "\u26A0\uFE0F",
        text:
          "From the " +
          selectedProjectKey +
          " side, there are " +
          metrics.mustFix +
          " (Issues) must-fix bugs related to functional defects that require resolution.",
        type: "danger",
      });
    }

    // Blocked
    if (metrics.blocked > 0) {
      items.push({
        icon: "\uD83D\uDD12",
        text:
          metrics.blocked +
          " issues are currently blocked and need immediate attention.",
        type: "warning",
      });
    }

    // Today's activity
    if (metrics.todayNew > 0) {
      items.push({
        icon: "\uD83D\uDCDD",
        text:
          metrics.todayNew +
          " new issues reported today" +
          (metrics.todayResolved > 0
            ? ", " + metrics.todayResolved + " verified/resolved."
            : "."),
        type: "info",
      });
    }

    // Bug count
    if (metrics.bugCount > 0) {
      items.push({
        icon: "\uD83D\uDC1B",
        text:
          metrics.bugCount + " open bugs in the project across all priorities.",
        type: "info",
      });
    }

    // Positive
    if (metrics.todayResolved > metrics.todayNew && metrics.todayResolved > 0) {
      items.push({
        icon: "\u2705",
        text:
          "Good progress! More issues resolved (" +
          metrics.todayResolved +
          ") than created (" +
          metrics.todayNew +
          ") today.",
        type: "success",
      });
    }

    // Action items
    if (metrics.blocked > 0 || metrics.mustFix > 0) {
      items.push({
        icon: "\uD83D\uDCCB",
        text: "Perform regression & adhoc testing. Focus on must-fix and blocked items.",
        type: "info",
      });
    }

    dom.highlightsList.innerHTML = "";
    items.forEach((item) => {
      const div = document.createElement("div");
      div.className = "highlight-item highlight-" + item.type;
      div.innerHTML =
        '<span class="highlight-icon">' +
        item.icon +
        "</span>" +
        '<span class="highlight-text">' +
        escapeHtml(item.text) +
        "</span>";
      dom.highlightsList.appendChild(div);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  K. RENDER STATS
  // ══════════════════════════════════════════════════════════
  function renderStats(metrics) {
    animateCounter(dom.valTotalOpen, metrics.totalOpen);
    animateCounter(dom.valTodayNew, metrics.todayNew);
    animateCounter(dom.valTodayResolved, metrics.todayResolved);
    animateCounter(dom.valReopened, metrics.reopened);
    animateCounter(dom.valMustFix, metrics.mustFix);
    animateCounter(dom.valBlocked, metrics.blocked);

    if (prevMetrics) {
      // higherIsBad = true → more is bad (red up / green down)
      // higherIsBad = false → more is good (green up / red down)
      renderTrend(
        dom.trendTotalOpen,
        metrics.totalOpen,
        prevMetrics.totalOpen,
        true,
      );
      renderTrend(
        dom.trendTodayNew,
        metrics.todayNew,
        prevMetrics.todayNew,
        true,
      );
      renderTrend(
        dom.trendTodayResolved,
        metrics.todayResolved,
        prevMetrics.todayResolved,
        false,
      );
      renderTrend(
        dom.trendReopened,
        metrics.reopened,
        prevMetrics.reopened,
        true,
      );
      renderTrend(dom.trendMustFix, metrics.mustFix, prevMetrics.mustFix, true);
      renderTrend(dom.trendBlocked, metrics.blocked, prevMetrics.blocked, true);
    } else {
      // Clear any old trend indicators
      [
        dom.trendTotalOpen,
        dom.trendTodayNew,
        dom.trendTodayResolved,
        dom.trendReopened,
        dom.trendMustFix,
        dom.trendBlocked,
      ].forEach((el) => {
        if (el) el.textContent = "";
      });
    }
  }

  function renderTrend(el, current, prev, higherIsBad) {
    if (!el) return;
    if (prev === undefined || prev === null || current === prev) {
      el.textContent = "";
      return;
    }
    const diff = current - prev;
    const isUp = diff > 0;
    const isBad = higherIsBad ? isUp : !isUp;
    el.className = "stat-trend trend-" + (isBad ? "bad" : "good");
    el.textContent =
      (isUp ? "\u2191" : "\u2193") + " " + Math.abs(diff) + " vs prev";
  }

  // ══════════════════════════════════════════════════════════
  //  L. RENDER STATUS SUMMARY TABLE
  // ══════════════════════════════════════════════════════════
  function renderStatusSummaryTable(metrics) {
    // Single row: Bug Count for the project
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Issue types breakdown
    const types = Object.keys(metrics.typeMap).sort();
    let html = "";

    // Add a summary row first
    html +=
      "<tr>" +
      "<td><strong>" +
      escapeHtml(selectedProjectKey) +
      " (All)</strong></td>" +
      "<td><strong>" +
      metrics.totalOpen +
      "</strong></td>" +
      "<td><strong>" +
      metrics.todayNew +
      "</strong></td>" +
      "<td><strong>" +
      metrics.todayResolved +
      "</strong></td>" +
      "<td><strong>" +
      metrics.reopened +
      "</strong></td>" +
      "<td><strong>" +
      metrics.mustFix +
      "</strong></td>" +
      "<td><strong>" +
      metrics.blocked +
      "</strong></td>" +
      "</tr>";

    // Break down by issue type
    types.forEach((type) => {
      const typeIssues = metrics.openIssues.filter(
        (i) => (i.issueType || "Other") === type,
      );
      const typeTodayNew = metrics.todayCreated.filter(
        (i) => (i.issueType || "Other") === type,
      ).length;
      const typeTodayResolved = metrics.todayResolved.filter(
        (i) => (i.issueType || "Other") === type,
      ).length;
      const typeBlocked = typeIssues.filter((i) => {
        const s = (i.status || "").toLowerCase();
        return (
          s.includes("block") ||
          s.includes("impediment") ||
          s.includes("waiting")
        );
      }).length;
      const typeReopened = typeIssues.filter((i) =>
        (i.status || "").toLowerCase().includes("reopen"),
      ).length;
      const typeMustFix = typeIssues.filter((i) => {
        const pLow = (i.priority || "").toLowerCase();
        const labels = (i.labels || []).map((l) => l.toLowerCase());
        return (
          pLow === "highest" ||
          pLow === "critical" ||
          pLow === "blocker" ||
          labels.includes("must-fix") ||
          labels.includes("must_fix") ||
          labels.includes("mustfix")
        );
      }).length;

      html +=
        "<tr>" +
        "<td>" +
        typeIndicator(type) +
        " " +
        escapeHtml(type) +
        "</td>" +
        "<td>" +
        typeIssues.length +
        "</td>" +
        "<td>" +
        typeTodayNew +
        "</td>" +
        "<td>" +
        typeTodayResolved +
        "</td>" +
        "<td>" +
        typeReopened +
        "</td>" +
        "<td>" +
        typeMustFix +
        "</td>" +
        "<td>" +
        typeBlocked +
        "</td>" +
        "</tr>";
    });

    // Component breakdown (only if components data available)
    const hasComponents =
      Object.keys(metrics.componentOpenMap || {}).length > 0;
    if (hasComponents) {
      html +=
        '<tr class="comp-section-header">' +
        '<td colspan="7" class="comp-section-label">' +
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' +
        " Blocked by Component" +
        "</td>" +
        "</tr>";

      Object.entries(metrics.componentOpenMap)
        .sort((a, b) => b[1] - a[1])
        .forEach(([comp, count]) => {
          const blocked = metrics.componentBlockedMap[comp] || 0;
          html +=
            '<tr class="comp-data-row">' +
            '<td><span class="comp-tag">' +
            escapeHtml(comp) +
            "</span></td>" +
            "<td>" +
            count +
            "</td>" +
            "<td>—</td>" +
            "<td>—</td>" +
            "<td>—</td>" +
            "<td>—</td>" +
            '<td class="' +
            (blocked > 0 ? "comp-blocked-count" : "") +
            '">' +
            blocked +
            "</td>" +
            "</tr>";
        });
    }

    dom.statusSummaryBody.innerHTML = html;
  }

  function typeIndicator(type) {
    const t = type.toLowerCase();
    let cls = "task";
    if (t === "bug" || t === "defect") cls = "bug";
    else if (t === "story" || t === "user story") cls = "story";
    else if (t === "epic") cls = "epic";
    return (
      '<span class="type-icon"><span class="dot ' + cls + '"></span></span>'
    );
  }

  // ══════════════════════════════════════════════════════════
  //  M. CHARTS
  // ══════════════════════════════════════════════════════════
  function getThemeColors() {
    const cs = getComputedStyle(dom.root);
    return {
      done: cs.getPropertyValue("--chart-done").trim(),
      progress: cs.getPropertyValue("--chart-progress").trim(),
      todo: cs.getPropertyValue("--chart-todo").trim(),
      line: cs.getPropertyValue("--chart-line").trim(),
      text: cs.getPropertyValue("--text-muted").trim(),
      grid: cs.getPropertyValue("--border").trim(),
      danger: cs.getPropertyValue("--danger").trim(),
      warning: cs.getPropertyValue("--warning").trim(),
      info: cs.getPropertyValue("--info").trim(),
      accent: cs.getPropertyValue("--accent").trim(),
      success: cs.getPropertyValue("--success").trim(),
      pHighest: cs.getPropertyValue("--priority-highest").trim(),
      pHigh: cs.getPropertyValue("--priority-high").trim(),
      pMedium: cs.getPropertyValue("--priority-medium").trim(),
      pLow: cs.getPropertyValue("--priority-low").trim(),
      pLowest: cs.getPropertyValue("--priority-lowest").trim(),
    };
  }

  function chartDefaults() {
    const c = getThemeColors();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: "easeOutQuart" },
      plugins: {
        legend: {
          labels: {
            color: c.text,
            padding: 14,
            usePointStyle: true,
            pointStyleWidth: 10,
            font: { size: 12, family: "'Segoe UI', sans-serif" },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.85)",
          titleColor: "#fff",
          bodyColor: "#ddd",
          cornerRadius: 10,
          padding: 10,
        },
      },
    };
  }

  function renderCharts(metrics) {
    renderOpenStatusChart(metrics);
    renderOpenPriorityChart(metrics);
    renderTodayPriorityChart(metrics);
    renderMustFixChart(metrics);
  }

  function renderOpenStatusChart(metrics) {
    const c = getThemeColors();
    if (chartInstances.openStatus) chartInstances.openStatus.destroy();

    const labels = Object.keys(metrics.statusMap);
    const data = Object.values(metrics.statusMap);

    const colorMap = {
      Done: c.done,
      "In Progress": c.progress,
      Open: c.info,
      Blocked: c.danger,
      Backlog: c.pLowest,
      Reopened: c.warning,
    };
    const colors = labels.map((l) => colorMap[l] || c.accent);

    chartInstances.openStatus = new Chart(dom.chartOpenStatus, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          { data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 },
        ],
      },
      options: {
        ...chartDefaults(),
        cutout: "62%",
        plugins: {
          ...chartDefaults().plugins,
          legend: { ...chartDefaults().plugins.legend, position: "right" },
          title: {
            display: true,
            text: "Total Issues: " + metrics.totalOpen,
            color: c.text,
            font: { size: 12 },
            padding: { bottom: 4 },
          },
        },
      },
    });
  }

  function renderOpenPriorityChart(metrics) {
    const c = getThemeColors();
    if (chartInstances.openPriority) chartInstances.openPriority.destroy();

    const prioOrder = ["Highest", "High", "Medium", "Low", "Lowest"];
    const labels = prioOrder.filter((p) => metrics.priorityMap[p]);
    const data = labels.map((p) => metrics.priorityMap[p]);
    const colorMap = {
      Highest: c.pHighest,
      High: c.pHigh,
      Medium: c.pMedium,
      Low: c.pLow,
      Lowest: c.pLowest,
    };
    const colors = labels.map((l) => colorMap[l]);

    chartInstances.openPriority = new Chart(dom.chartOpenPriority, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          { data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 },
        ],
      },
      options: {
        ...chartDefaults(),
        cutout: "62%",
        plugins: {
          ...chartDefaults().plugins,
          legend: { ...chartDefaults().plugins.legend, position: "right" },
        },
      },
    });
  }

  function renderTodayPriorityChart(metrics) {
    const c = getThemeColors();
    if (chartInstances.todayPriority) chartInstances.todayPriority.destroy();

    const prioOrder = ["Highest", "High", "Medium", "Low", "Lowest"];
    const labels = prioOrder.filter((p) => metrics.todayPriorityMap[p]);
    const data = labels.map((p) => metrics.todayPriorityMap[p]);
    const colorMap = {
      Highest: c.pHighest,
      High: c.pHigh,
      Medium: c.pMedium,
      Low: c.pLow,
      Lowest: c.pLowest,
    };
    const colors = labels.map((l) => colorMap[l]);

    if (labels.length === 0) {
      labels.push("None today");
      data.push(1);
      colors.push(c.pLowest);
    }

    chartInstances.todayPriority = new Chart(dom.chartTodayPriority, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          { data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 },
        ],
      },
      options: {
        ...chartDefaults(),
        cutout: "62%",
        plugins: {
          ...chartDefaults().plugins,
          legend: { ...chartDefaults().plugins.legend, position: "right" },
          title: {
            display: true,
            text: "Total Issues: " + metrics.todayNew,
            color: c.text,
            font: { size: 12 },
            padding: { bottom: 4 },
          },
        },
      },
    });
  }

  function renderMustFixChart(metrics) {
    const c = getThemeColors();
    if (chartInstances.mustfix) chartInstances.mustfix.destroy();

    const labels = Object.keys(metrics.mustFixStatusMap);
    const data = Object.values(metrics.mustFixStatusMap);
    const colorMap = {
      Done: c.done,
      "In Progress": c.progress,
      Open: c.info,
      Blocked: c.danger,
      Backlog: c.pLowest,
      Reopened: c.warning,
    };
    const colors = labels.map((l) => colorMap[l] || c.accent);

    if (labels.length === 0) {
      labels.push("None");
      data.push(1);
      colors.push(c.done);
    }

    chartInstances.mustfix = new Chart(dom.chartMustfix, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          { data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 },
        ],
      },
      options: {
        ...chartDefaults(),
        cutout: "62%",
        plugins: {
          ...chartDefaults().plugins,
          legend: { ...chartDefaults().plugins.legend, position: "right" },
          title: {
            display: true,
            text: "Total Issues: " + metrics.mustFix,
            color: c.text,
            font: { size: 12 },
            padding: { bottom: 4 },
          },
        },
      },
    });
  }

  function recolorCharts() {
    if (lastMetrics) renderCharts(lastMetrics);
  }

  // ══════════════════════════════════════════════════════════
  //  N. RENDER MUST FIX TABLE
  // ══════════════════════════════════════════════════════════
  function renderMustFixTable(issues) {
    dom.mustfixCount.textContent = issues.length + " issues";

    if (issues.length === 0) {
      dom.mustfixBody.innerHTML = "";
      dom.mustfixEmpty.classList.remove("hidden");
      return;
    }
    dom.mustfixEmpty.classList.add("hidden");

    dom.mustfixBody.innerHTML = issues
      .map(
        (i) =>
          "<tr>" +
          '<td class="issue-key">' +
          escapeHtml(i.key) +
          "</td>" +
          "<td>" +
          escapeHtml(i.summary) +
          "</td>" +
          "<td>" +
          priorityBadge(i.priority) +
          "</td>" +
          "<td>" +
          statusBadge(i) +
          "</td>" +
          "<td>" +
          escapeHtml(i.assignee || "Unassigned") +
          "</td>" +
          "<td>" +
          typeIndicator(i.issueType) +
          " " +
          escapeHtml(i.issueType) +
          "</td>" +
          "</tr>",
      )
      .join("");
  }

  // ══════════════════════════════════════════════════════════
  //  O. RENDER OPEN ISSUES TABLE
  // ══════════════════════════════════════════════════════════
  function renderOpenIssuesTable(issues) {
    dom.openCount.textContent = issues.length + " issues";

    if (issues.length === 0) {
      dom.openIssuesBody.innerHTML = "";
      dom.openEmpty.classList.remove("hidden");
      return;
    }
    dom.openEmpty.classList.add("hidden");

    dom.openIssuesBody.innerHTML = issues
      .map(
        (i) =>
          "<tr>" +
          '<td class="issue-key">' +
          escapeHtml(i.key) +
          "</td>" +
          "<td>" +
          escapeHtml(i.summary) +
          "</td>" +
          "<td>" +
          typeIndicator(i.issueType) +
          " " +
          escapeHtml(i.issueType) +
          "</td>" +
          "<td>" +
          priorityBadge(i.priority) +
          "</td>" +
          "<td>" +
          statusBadge(i) +
          "</td>" +
          "<td>" +
          escapeHtml(i.assignee || "Unassigned") +
          "</td>" +
          "<td>" +
          formatDate(i.created) +
          "</td>" +
          "</tr>",
      )
      .join("");
  }

  function priorityBadge(priority) {
    const norm = normalizePriority(priority);
    const cls = "p-" + norm.toLowerCase();
    return (
      '<span class="priority-badge ' + cls + '">' + escapeHtml(norm) + "</span>"
    );
  }

  function statusBadge(issue) {
    const cat = classifyStatus(issue);
    let cls = "s-open";
    if (cat === "Done") cls = "s-done";
    else if (cat === "In Progress") cls = "s-progress";
    else if (cat === "Blocked") cls = "s-blocked";
    return (
      '<span class="status-badge ' +
      cls +
      '">' +
      escapeHtml(issue.status) +
      "</span>"
    );
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  // ══════════════════════════════════════════════════════════
  //  P. DSR TEXT GENERATION
  // ══════════════════════════════════════════════════════════
  function generateDsrText(metrics) {
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const { health } = calculateHealth(metrics);
    const healthLabels = {
      green: "GREEN \u2705",
      yellow: "YELLOW \u26A0\uFE0F",
      red: "RED \uD83D\uDD34",
    };
    const recipient = (dom.dsrRecipient.value || "").trim();
    const currentEnv =
      (dom.testingEnvEl && dom.testingEnvEl.value) || testingEnv;
    const currentSprint =
      (dom.sprintNameEl && dom.sprintNameEl.value.trim()) || sprintName;
    const effectiveHealth = ragOverride || health;

    const lines = [];

    // Greeting
    if (recipient) {
      lines.push("Hi " + recipient + ",");
      lines.push("");
      lines.push("Please find below the daily QA updates:");
      lines.push("");
    }

    lines.push("Daily QA Status Report — " + selectedProjectKey);
    lines.push("Date: " + today);
    lines.push("Project: " + selectedProjectName);
    lines.push("Environment: " + currentEnv);
    if (currentSprint) lines.push("Sprint/Release: " + currentSprint);
    lines.push(
      "Health Status: " +
        healthLabels[effectiveHealth] +
        (ragOverride ? " (Manual Override)" : ""),
    );
    lines.push("");

    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("HIGHLIGHTS:");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    if (metrics.mustFix > 0) {
      lines.push(
        "  \u26A0 From the " +
          selectedProjectKey +
          " side, there are " +
          metrics.mustFix +
          " (Issues) must-fix bugs related to functional defects that require resolution.",
      );
    }
    if (metrics.blocked > 0) {
      lines.push(
        "  \uD83D\uDD12 " + metrics.blocked + " issues are currently blocked.",
      );
    }
    if (metrics.todayNew > 0) {
      lines.push(
        "  \uD83D\uDCDD " + metrics.todayNew + " new issues reported today.",
      );
    }
    if (metrics.todayResolved > 0) {
      lines.push(
        "  \u2705 " +
          metrics.todayResolved +
          " issues verified/resolved today.",
      );
    }

    // Include QA notes in highlights
    const activeNotes = qaNotes.filter((n) => n.text.trim());
    if (activeNotes.length > 0) {
      activeNotes.forEach((n) => {
        lines.push("  \u2022 " + n.text.trim());
      });
    }
    lines.push("");

    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("STATUS SUMMARY:");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("  Total Open:       " + metrics.totalOpen);
    lines.push("  Today's Reported: " + metrics.todayNew);
    lines.push("  Today's Verified: " + metrics.todayResolved);
    lines.push("  Reopened:         " + metrics.reopened);
    lines.push("  Must Fix:         " + metrics.mustFix);
    lines.push("  Blocked:          " + metrics.blocked);
    lines.push("");

    // Status breakdown
    lines.push("Open Issues by Status:");
    Object.entries(metrics.statusMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        lines.push("  \u2022 " + status + ": " + count);
      });
    lines.push("");

    // Priority breakdown
    lines.push("Open Issues by Priority:");
    ["Highest", "High", "Medium", "Low", "Lowest"].forEach((p) => {
      if (metrics.priorityMap[p]) {
        lines.push("  \u2022 " + p + ": " + metrics.priorityMap[p]);
      }
    });
    lines.push("");

    // Manual QA status
    const filledEntries = manualEntries.filter((e) => e.jiraId || e.title);
    if (filledEntries.length > 0) {
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("MANUAL TESTING STATUS:");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      filledEntries.forEach((e) => {
        lines.push(
          "  \u2022 " +
            (e.jiraId || "N/A") +
            " — " +
            (e.title || "N/A") +
            " [" +
            e.qaStatus +
            "] Dev: " +
            (e.devOwner || "N/A") +
            ", QA: " +
            (e.qaOwner || "N/A") +
            " | Open: " +
            e.openBugs +
            ", Overall: " +
            e.overallBugs +
            ", Unit: " +
            e.unitLevel +
            ", Rejected: " +
            e.rejected,
        );
      });
      lines.push("");
    }

    // Must-fix list
    if (metrics.mustFixIssues.length > 0) {
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("MUST FIX ISSUES (" + metrics.mustFixIssues.length + "):");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      metrics.mustFixIssues.forEach((i) => {
        lines.push(
          "  \u2022 " +
            i.key +
            " — " +
            i.summary +
            " [" +
            i.status +
            "] (" +
            (i.assignee || "Unassigned") +
            ")",
        );
      });
      lines.push("");
    }

    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("ACTION ITEMS:");
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    if (metrics.mustFix > 0) {
      lines.push("  \u2022 Focus on resolving must-fix issues.");
    }
    if (metrics.blocked > 0) {
      lines.push("  \u2022 Unblock " + metrics.blocked + " blocked issues.");
    }
    lines.push(
      "  \u2022 Perform regression & adhoc testing on " +
        currentEnv +
        " environment.",
    );
    lines.push("");

    dom.dsrOutput.value = lines.join("\n");
  }

  // ══════════════════════════════════════════════════════════
  //  Q. COPY HTML (email-friendly)
  // ══════════════════════════════════════════════════════════
  function generateHtmlReport(metrics) {
    const today = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const { health: autoHealth } = calculateHealth(metrics);
    const health = ragOverride || autoHealth;
    const healthColors = {
      green: "#10b981",
      yellow: "#f59e0b",
      red: "#ef4444",
    };
    const healthLabels = {
      green: "HEALTHY ✅",
      yellow: "AT RISK ⚠️",
      red: "CRITICAL 🔴",
    };
    const hc = healthColors[health];
    const recipient = (dom.dsrRecipient.value || "").trim();
    const currentEnv =
      (dom.testingEnvEl && dom.testingEnvEl.value) || testingEnv;
    const currentSprint =
      (dom.sprintNameEl && dom.sprintNameEl.value.trim()) || sprintName;
    const filledEntries = manualEntries.filter((e) => e.jiraId || e.title);
    const activeNotes = qaNotes.filter((n) => n.text.trim());

    // ── helpers ──
    const th = (t, align) =>
      `<th style="background:#f1f5f9;border:1px solid #cbd5e1;padding:8px 10px;font-size:12px;font-weight:700;text-align:${align || "left"}">${t}</th>`;
    const td = (t, style) =>
      `<td style="border:1px solid #e2e8f0;padding:7px 10px;font-size:12px;${style || ""}">${t}</td>`;
    const tdC = (t, style) => td(t, "text-align:center;" + (style || ""));

    // Component breakdown string (e.g. "Blocked By Base - 83 / Apex - 32")
    let componentSummary = "";
    if (
      metrics.componentBlockedMap &&
      Object.keys(metrics.componentBlockedMap).length > 0
    ) {
      componentSummary =
        " (" +
        Object.entries(metrics.componentBlockedMap)
          .sort((a, b) => b[1] - a[1])
          .map(([c, n]) => "Blocked By " + c + " - " + n)
          .join(" / ") +
        ")";
    }

    let html =
      '<div style="font-family:Segoe UI,Arial,sans-serif;max-width:720px;margin:0 auto;color:#1e293b;line-height:1.5">';

    // Greeting
    if (recipient) {
      html += `<p style="font-size:14px;margin:0 0 6px">Hi <strong>${escapeHtml(recipient)}</strong>,</p>`;
      html += `<p style="font-size:13px;margin:0 0 18px;color:#64748b">Please find below the daily QA updates:</p>`;
    }

    // Header banner
    html += `<div style="border-left:5px solid ${hc};padding:14px 18px;background:${hc}18;margin-bottom:20px;border-radius:0 10px 10px 0">`;
    html += `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">`;
    html += `<h2 style="margin:0;font-size:17px;flex:1">📊 Daily QA Status — ${escapeHtml(selectedProjectName || selectedProjectKey)}</h2>`;
    html += `<span style="background:${hc};color:#fff;font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px;letter-spacing:.06em">${healthLabels[health]}</span>`;
    html += `</div>`;
    html += `<p style="margin:6px 0 0;font-size:12px;color:#64748b">📅 ${today}`;
    if (currentEnv)
      html += ` &nbsp;|&nbsp; 🌐 Env: <strong>${escapeHtml(currentEnv)}</strong>`;
    if (currentSprint) html += ` &nbsp;|&nbsp; 🏃 ${escapeHtml(currentSprint)}`;
    html += `</p></div>`;

    // ── Highlights ──
    html += `<p style="font-weight:700;font-size:14px;margin:0 0 8px"><em>Highlights:</em></p>`;

    if (metrics.mustFix > 0) {
      html +=
        `<p style="margin:4px 0 8px;font-size:13px;color:#dc2626">` +
        `<strong>Note: From the ${escapeHtml(selectedProjectKey)} side, there are ` +
        `<span style="background:#fef08a;color:#713f12;padding:2px 8px;border-radius:4px;font-weight:700">${metrics.mustFix} (Issues)</span>` +
        ` must-fix bugs related to functional defects that require resolution.</strong></p>`;
    }
    if (metrics.blocked > 0) {
      html += `<p style="margin:4px 0;font-size:13px">🔒 <strong>${metrics.blocked}</strong> issues are currently blocked${componentSummary}.</p>`;
    }
    html += `<ul style="margin:8px 0 16px;padding-left:22px;font-size:13px">`;
    html += `<li>Perform regression &amp; adhoc testing on <strong>${escapeHtml(currentEnv)}</strong> environment.</li>`;
    if (metrics.mustFix > 0)
      html += `<li>Focus on resolving must-fix issues urgently.</li>`;
    activeNotes.forEach((n) => {
      html += `<li>${escapeHtml(n.text.trim())}</li>`;
    });
    html += `</ul>`;

    // ── Status Summary table ──
    html += `<p style="font-weight:700;font-size:14px;margin:0 0 8px"><em>Status:</em></p>`;
    html += `<table style="width:100%;border-collapse:collapse;margin-bottom:20px">`;
    html += `<thead><tr>${th("")}${th("Total Issues Open", "center")}${th("Today's Reported", "center")}${th("Today's Verified Bugs/Stories", "center")}${th("Reopened", "center")}${th("Unit Level", "center")}${th("Rejected Bugs", "center")}</tr></thead>`;
    html += `<tbody><tr>`;
    html += td(`<strong>Bug Count ${escapeHtml(selectedProjectKey)}</strong>`);

    // Total open with component breakdown
    let totalCell = String(metrics.totalOpen);
    if (componentSummary) {
      const parts = Object.entries(metrics.componentBlockedMap || {})
        .sort((a, b) => b[1] - a[1])
        .map(([c, n]) => escapeHtml(c) + " - " + n);
      if (parts.length > 0)
        totalCell += `<br><span style="font-size:11px;color:#64748b">Blocked By ${parts.join(" / ")}</span>`;
    }
    html += td(totalCell, "text-align:center");
    html += tdC(
      metrics.todayNew > 0
        ? `<strong>${metrics.todayNew}</strong>`
        : metrics.todayNew,
    );
    html += tdC(
      metrics.todayResolved > 0
        ? `<strong style="color:#059669">${metrics.todayResolved}</strong>`
        : metrics.todayResolved,
    );
    html += tdC(
      metrics.reopened > 0
        ? metrics.reopened
        : "<span style='color:#94a3b8'>NA</span>",
    );

    // Unit Level = from manual entries (sum of unitLevel column)
    const unitTotal = filledEntries.reduce(
      (s, e) => s + (parseInt(e.unitLevel, 10) || 0),
      0,
    );
    html += tdC(
      unitTotal > 0 ? unitTotal : "<span style='color:#94a3b8'>NA</span>",
    );

    // Rejected = from manual entries
    const rejectedTotal = filledEntries.reduce(
      (s, e) => s + (parseInt(e.rejected, 10) || 0),
      0,
    );
    html += tdC(
      rejectedTotal > 0
        ? rejectedTotal
        : "<span style='color:#94a3b8'>NA</span>",
    );
    html += `</tr></tbody></table>`;

    // ── Manual QA Status table ──
    if (filledEntries.length > 0) {
      html += `<p style="font-weight:700;font-size:14px;margin:0 0 8px"><em>Manual Status:</em></p>`;
      html += `<table style="width:100%;border-collapse:collapse;margin-bottom:20px">`;
      html += `<thead><tr>${th("APA Jira ID")}${th("Title")}${th("QA Status")}${th("Dev Owner")}${th("QA Owner")}${th("Current Open Bugs", "center")}${th("Overall Bugs", "center")}${th("Unit Level", "center")}${th("Rejected Bugs", "center")}</tr></thead><tbody>`;
      filledEntries.forEach((e) => {
        const sc =
          e.qaStatus === "Blocked"
            ? "#dc2626"
            : e.qaStatus === "Done"
              ? "#059669"
              : e.qaStatus === "WIP"
                ? "#d97706"
                : "#1e293b";
        html +=
          `<tr>` +
          td(escapeHtml(e.jiraId || "N/A")) +
          td(escapeHtml(e.title || "N/A")) +
          td(
            `<span style="color:${sc};font-weight:700">${escapeHtml(e.qaStatus)}</span>`,
          ) +
          td(escapeHtml(e.devOwner || "N/A")) +
          td(escapeHtml(e.qaOwner || "N/A")) +
          tdC(
            e.openBugs,
            e.openBugs > 0 ? "font-weight:700;color:#dc2626" : "",
          ) +
          tdC(e.overallBugs) +
          tdC(e.unitLevel) +
          tdC(e.rejected, e.rejected > 0 ? "color:#dc2626" : "") +
          `</tr>`;
      });
      html += `</tbody></table>`;
    }

    // ── Total Open Issues breakdown ──
    const statusEntries = Object.entries(metrics.statusMap).sort(
      (a, b) => b[1] - a[1],
    );
    if (statusEntries.length > 0) {
      html += `<p style="font-weight:700;font-size:14px;margin:0 0 8px"><em>Total Open Issues:</em></p>`;
      html += `<table style="width:100%;border-collapse:collapse;margin-bottom:20px">`;
      html += `<thead><tr>${th("Status")}${th("Count", "center")}</tr></thead><tbody>`;
      statusEntries.forEach(([status, count]) => {
        const colors = {
          Blocked: "#dc2626",
          "In Progress": "#d97706",
          Backlog: "#3b82f6",
          Reopened: "#f59e0b",
          Done: "#10b981",
        };
        const c = colors[status] || "#64748b";
        html += `<tr>${td(`<span style="color:${c};font-weight:600">● ${escapeHtml(status)}</span>`)}${tdC(`<strong>${count}</strong>`)}</tr>`;
      });
      html += `<tr style="background:#f8fafc">${td(`<strong>Total</strong>`)}${tdC(`<strong>${metrics.totalOpen}</strong>`)}</tr>`;
      html += `</tbody></table>`;
    }

    // ── Must Fix issues ──
    if (metrics.mustFixIssues.length > 0) {
      html += `<p style="font-weight:700;font-size:14px;margin:0 0 8px"><em>Must Fix Issues (${metrics.mustFixIssues.length}):</em></p>`;
      html += `<table style="width:100%;border-collapse:collapse;margin-bottom:20px">`;
      html += `<thead><tr style="background:#fef2f2">${th("Key")}${th("Summary")}${th("Priority")}${th("Status")}${th("Assignee")}</tr></thead><tbody>`;
      metrics.mustFixIssues.forEach((i) => {
        const pc = {
          Highest: "#dc2626",
          High: "#ea580c",
          Medium: "#d97706",
          Low: "#3b82f6",
          Lowest: "#94a3b8",
        };
        const prioColor = pc[normalizePriority(i.priority)] || "#64748b";
        html +=
          `<tr>` +
          td(
            `<strong style="font-family:monospace;color:#6366f1">${escapeHtml(i.key)}</strong>`,
          ) +
          td(escapeHtml(i.summary)) +
          td(
            `<span style="color:${prioColor};font-weight:600">${escapeHtml(normalizePriority(i.priority))}</span>`,
          ) +
          td(escapeHtml(i.status)) +
          td(escapeHtml(i.assignee || "Unassigned")) +
          `</tr>`;
      });
      html += `</tbody></table>`;
    }

    html += `</div>`;
    return html;
  }

  async function copyDsrHtml() {
    if (!lastMetrics) {
      showToast("Load a project first", "error");
      return;
    }
    const htmlStr = generateHtmlReport(lastMetrics);
    try {
      const blob = new Blob([htmlStr], { type: "text/html" });
      const textBlob = new Blob([dom.dsrOutput.value], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blob,
          "text/plain": textBlob,
        }),
      ]);
      showToast(
        "HTML copied! Paste into email for formatted report.",
        "success",
      );
    } catch (e) {
      // Fallback: copy plain text
      await copyDsr();
    }
  }

  // ══════════════════════════════════════════════════════════
  //  R. CAPTURE / EXPORT
  // ══════════════════════════════════════════════════════════
  async function captureScreenshot() {
    dom.dashboardBody.classList.add("capture-mode");
    try {
      return await html2canvas(dom.dashboardBody, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        scale: 2,
        useCORS: true,
        logging: false,
      });
    } finally {
      dom.dashboardBody.classList.remove("capture-mode");
    }
  }

  async function exportPng() {
    if (!lastMetrics) {
      showToast("Load a project first", "error");
      return;
    }
    showLoading("Capturing screenshot\u2026");
    try {
      const canvas = await captureScreenshot();
      const link = document.createElement("a");
      link.download =
        "dsr-" +
        selectedProjectKey +
        "-" +
        new Date().toISOString().slice(0, 10) +
        ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("PNG exported!", "success");
    } catch (err) {
      showToast("Export failed: " + err.message, "error");
    } finally {
      hideLoading();
    }
  }

  async function exportPdf() {
    if (!lastMetrics) {
      showToast("Load a project first", "error");
      return;
    }
    showLoading("Generating PDF\u2026");
    try {
      const canvas = await captureScreenshot();
      const imgData = canvas.toDataURL("image/png");
      const orientation = canvas.width > canvas.height ? "l" : "p";
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF(orientation, "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const scaledHeight = (canvas.height * usableWidth) / canvas.width;

      if (scaledHeight <= pageHeight - margin * 2) {
        pdf.addImage(imgData, "PNG", margin, margin, usableWidth, scaledHeight);
      } else {
        const pageImgHeight =
          ((pageHeight - margin * 2) / usableWidth) * canvas.width;
        let yOffset = 0,
          page = 0;
        while (yOffset < canvas.height) {
          if (page > 0) pdf.addPage();
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          const sliceH = Math.min(pageImgHeight, canvas.height - yOffset);
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d");
          ctx.drawImage(
            canvas,
            0,
            yOffset,
            canvas.width,
            sliceH,
            0,
            0,
            canvas.width,
            sliceH,
          );
          const sliceData = sliceCanvas.toDataURL("image/png");
          const renderH = (sliceH * usableWidth) / canvas.width;
          pdf.addImage(sliceData, "PNG", margin, margin, usableWidth, renderH);
          yOffset += pageImgHeight;
          page++;
        }
      }

      pdf.save(
        "dsr-" +
          selectedProjectKey +
          "-" +
          new Date().toISOString().slice(0, 10) +
          ".pdf",
      );
      showToast("PDF exported!", "success");
    } catch (err) {
      showToast("Export failed: " + err.message, "error");
    } finally {
      hideLoading();
    }
  }

  // ══════════════════════════════════════════════════════════
  //  S. COPY PLAIN TEXT
  // ══════════════════════════════════════════════════════════
  async function copyDsr() {
    const text = dom.dsrOutput.value;
    if (!text) {
      showToast("Nothing to copy", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast("Copied to clipboard!", "success");
    } catch (e) {
      dom.dsrOutput.select();
      document.execCommand("copy");
      showToast("Copied to clipboard!", "success");
    }
  }

  // ══════════════════════════════════════════════════════════
  //  T. HELPERS
  // ══════════════════════════════════════════════════════════
  function animateCounter(el, target) {
    const start = parseInt(el.textContent, 10) || 0;
    const diff = target - start;
    if (diff === 0) {
      el.textContent = target;
      return;
    }
    const duration = 600;
    const startTime = performance.now();
    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      el.textContent = Math.round(
        start + diff * (1 - Math.pow(1 - progress, 3)),
      );
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str || ""));
    return div.innerHTML;
  }

  let toastTimer = null;
  function showToast(message, type) {
    type = type || "info";
    if (toastTimer) clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.className = "toast visible toast-" + type;
    toastTimer = setTimeout(function () {
      dom.toast.classList.remove("visible");
      setTimeout(function () {
        dom.toast.classList.add("hidden");
      }, 350);
    }, 3000);
  }

  function showLoading(text) {
    dom.loadingText.textContent = text || "Loading\u2026";
    dom.loadingOverlay.classList.remove("hidden");
  }
  function hideLoading() {
    dom.loadingOverlay.classList.add("hidden");
  }

  function chromeStorageGet(keys) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, function (result) {
        resolve(result);
      });
    });
  }
  function chromeStorageSet(obj) {
    return new Promise(function (resolve) {
      chrome.storage.local.set(obj, function () {
        resolve();
      });
    });
  }

  function sendMessage(msg) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(msg, function (response) {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(
            response || {
              success: false,
              error: "No response from background",
            },
          );
        }
      });
    });
  }
})();
