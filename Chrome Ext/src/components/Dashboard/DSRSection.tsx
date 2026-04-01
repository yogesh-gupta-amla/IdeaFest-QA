import React, { useMemo, useRef, useCallback } from "react";
import type { Metrics, ManualEntry, QANote, RAGStatus } from "../../types";
import {
  calculateHealth,
  normalizePriority,
} from "../../services/metricsService";
import { useApp } from "../../context/AppContext";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface DSRSectionProps {
  metrics: Metrics;
  selectedProjectKey: string;
  selectedProjectName: string;
  manualEntries: ManualEntry[];
  qaNotes: QANote[];
  testingEnv: string;
  sprintName: string;
  ragOverride: RAGStatus;
  dsrRecipient: string;
  onDsrRecipientChange: (v: string) => void;
}

function generateDsrText(
  metrics: Metrics,
  projectKey: string,
  projectName: string,
  manualEntries: ManualEntry[],
  qaNotes: QANote[],
  testingEnv: string,
  sprintName: string,
  ragOverride: RAGStatus,
  recipient: string,
): string {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const { health } = calculateHealth(metrics);
  const effectiveHealth = ragOverride || health;
  const healthLabels = {
    green: "GREEN ✅",
    yellow: "YELLOW ⚠️",
    red: "RED 🔴",
  };
  const lines: string[] = [];

  if (recipient) {
    lines.push(
      `Hi ${recipient},`,
      "",
      "Please find below the daily QA updates:",
      "",
    );
  }

  lines.push(
    `Daily QA Status Report — ${projectKey}`,
    `Date: ${today}`,
    `Project: ${projectName}`,
    `Environment: ${testingEnv}`,
  );
  if (sprintName) lines.push(`Sprint/Release: ${sprintName}`);
  lines.push(
    `Health Status: ${healthLabels[effectiveHealth]}${ragOverride ? " (Manual Override)" : ""}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "HIGHLIGHTS:",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );

  if (metrics.mustFix > 0)
    lines.push(
      `  ⚠ From the ${projectKey} side, there are ${metrics.mustFix} (Issues) must-fix bugs related to functional defects that require resolution.`,
    );
  if (metrics.blocked > 0)
    lines.push(`  🔒 ${metrics.blocked} issues are currently blocked.`);
  if (metrics.todayNew > 0)
    lines.push(`  📝 ${metrics.todayNew} new issues reported today.`);
  if (metrics.todayResolved > 0)
    lines.push(`  ✅ ${metrics.todayResolved} issues verified/resolved today.`);

  qaNotes
    .filter((n) => n.text.trim())
    .forEach((n) => lines.push(`  • ${n.text.trim()}`));
  lines.push("");

  lines.push(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "STATUS SUMMARY:",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  Total Open:       ${metrics.totalOpen}`,
    `  Today's Reported: ${metrics.todayNew}`,
    `  Today's Verified: ${metrics.todayResolved}`,
    `  Reopened:         ${metrics.reopened}`,
    `  Must Fix:         ${metrics.mustFix}`,
    `  Blocked:          ${metrics.blocked}`,
    "",
    "Open Issues by Status:",
    ...Object.entries(metrics.statusMap)
      .sort((a, b) => b[1] - a[1])
      .map(([s, n]) => `  • ${s}: ${n}`),
    "",
    "Open Issues by Priority:",
    ...["Highest", "High", "Medium", "Low", "Lowest"]
      .filter((p) => metrics.priorityMap[p])
      .map((p) => `  • ${p}: ${metrics.priorityMap[p]}`),
    "",
  );

  const filledEntries = manualEntries.filter((e) => e.jiraId || e.title);
  if (filledEntries.length > 0) {
    lines.push(
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "MANUAL TESTING STATUS:",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      ...filledEntries.map(
        (e) =>
          `  • ${e.jiraId || "N/A"} — ${e.title || "N/A"} [${e.qaStatus}] Dev: ${e.devOwner || "N/A"}, QA: ${e.qaOwner || "N/A"} | Open: ${e.openBugs}, Overall: ${e.overallBugs}, Unit: ${e.unitLevel}, Rejected: ${e.rejected}`,
      ),
      "",
    );
  }

  if (metrics.mustFixIssues.length > 0) {
    lines.push(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `MUST FIX ISSUES (${metrics.mustFixIssues.length}):`,
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      ...metrics.mustFixIssues.map(
        (i) =>
          `  • ${i.key} — ${i.summary} [${i.status}] (${i.assignee || "Unassigned"})`,
      ),
      "",
    );
  }

  lines.push(
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "ACTION ITEMS:",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  );
  if (metrics.mustFix > 0)
    lines.push("  • Focus on resolving must-fix issues.");
  if (metrics.blocked > 0)
    lines.push(`  • Unblock ${metrics.blocked} blocked issues.`);
  lines.push(
    `  • Perform regression & adhoc testing on ${testingEnv} environment.`,
  );

  return lines.join("\n");
}

export default function DSRSection({
  metrics,
  selectedProjectKey,
  selectedProjectName,
  manualEntries,
  qaNotes,
  testingEnv,
  sprintName,
  ragOverride,
  dsrRecipient,
  onDsrRecipientChange,
}: DSRSectionProps) {
  const { showToast, showLoading, hideLoading } = useApp();
  const dashboardRef = useRef<HTMLElement | null>(null);

  const dsrText = useMemo(
    () =>
      generateDsrText(
        metrics,
        selectedProjectKey,
        selectedProjectName,
        manualEntries,
        qaNotes,
        testingEnv,
        sprintName,
        ragOverride,
        dsrRecipient,
      ),
    [
      metrics,
      selectedProjectKey,
      selectedProjectName,
      manualEntries,
      qaNotes,
      testingEnv,
      sprintName,
      ragOverride,
      dsrRecipient,
    ],
  );

  const copyText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(dsrText);
      showToast("Copied to clipboard!", "success");
    } catch {
      showToast("Copy failed. Please copy manually.", "error");
    }
  }, [dsrText, showToast]);

  const captureScreenshot =
    useCallback(async (): Promise<HTMLCanvasElement> => {
      const el =
        document.getElementById("dashboard-body-react") || document.body;
      el.classList.add("capture-mode");
      try {
        return await html2canvas(el as HTMLElement, {
          backgroundColor: getComputedStyle(document.body).backgroundColor,
          scale: 2,
          useCORS: true,
          logging: false,
        });
      } finally {
        el.classList.remove("capture-mode");
      }
    }, []);

  const exportPng = useCallback(async () => {
    showLoading("Capturing screenshot…");
    try {
      const canvas = await captureScreenshot();
      const link = document.createElement("a");
      link.download = `dsr-${selectedProjectKey}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("PNG exported!", "success");
    } catch (err: unknown) {
      showToast(`Export failed: ${(err as Error).message}`, "error");
    } finally {
      hideLoading();
    }
  }, [
    captureScreenshot,
    selectedProjectKey,
    showToast,
    showLoading,
    hideLoading,
  ]);

  const exportPdf = useCallback(async () => {
    showLoading("Generating PDF…");
    try {
      const canvas = await captureScreenshot();
      const imgData = canvas.toDataURL("image/png");
      const orientation = canvas.width > canvas.height ? "l" : "p";
      const pdf = new jsPDF(orientation as "l" | "p", "mm", "a4");
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
        let yOffset = 0;
        let page = 0;
        while (yOffset < canvas.height) {
          if (page > 0) pdf.addPage();
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          const sliceH = Math.min(pageImgHeight, canvas.height - yOffset);
          sliceCanvas.height = sliceH;
          sliceCanvas
            .getContext("2d")!
            .drawImage(
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
          pdf.addImage(
            sliceCanvas.toDataURL("image/png"),
            "PNG",
            margin,
            margin,
            usableWidth,
            (sliceH * usableWidth) / canvas.width,
          );
          yOffset += pageImgHeight;
          page++;
        }
      }

      pdf.save(
        `dsr-${selectedProjectKey}-${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      showToast("PDF exported!", "success");
    } catch (err: unknown) {
      showToast(`Export failed: ${(err as Error).message}`, "error");
    } finally {
      hideLoading();
    }
  }, [
    captureScreenshot,
    selectedProjectKey,
    showToast,
    showLoading,
    hideLoading,
  ]);

  return (
    <>
      <section className="card fade-in">
        <h2 className="card-title">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Daily Status Report (DSR)
        </h2>
        <div className="dsr-recipient-row">
          <label className="context-label">Recipient (optional)</label>
          <input
            type="text"
            className="input"
            style={{ maxWidth: 300 }}
            placeholder="Manager / Team Name"
            value={dsrRecipient}
            onChange={(e) => onDsrRecipientChange(e.target.value)}
          />
        </div>
        <textarea className="dsr-output" readOnly value={dsrText} rows={18} />
        <div className="dsr-actions">
          <button className="btn btn-primary" onClick={copyText}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy Plain Text
          </button>
        </div>
      </section>

      <section className="card fade-in">
        <h2 className="card-title">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Dashboard
        </h2>
        <div className="export-actions">
          <button className="btn btn-secondary" onClick={exportPng}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Export PNG
          </button>
          <button className="btn btn-secondary" onClick={exportPdf}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Export PDF
          </button>
        </div>
      </section>
    </>
  );
}
