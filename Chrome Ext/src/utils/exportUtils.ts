import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import type {
  QAIssue,
  AgeingItem,
  BugLeakageItem,
  OverburntItem,
} from "../types/qa";

// ─── PNG Download from chart container ──────────────────────────────────────

export const downloadChartAsPNG = async (
  elementId: string,
  filename: string,
): Promise<void> => {
  const el = document.getElementById(elementId);
  if (!el) return;
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: null });
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

// ─── Full Dashboard PDF export ───────────────────────────────────────────────

export const exportDashboardToPDF = async (
  containerId: string,
  title = "Intelligence Dashboard Report",
): Promise<void> => {
  const el = document.getElementById(containerId);
  if (!el) return;

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const canvas = await html2canvas(el, { scale: 1.5, useCORS: true });
  const imgData = canvas.toDataURL("image/png");
  const imgH = (canvas.height * pageW) / canvas.width;

  let yPos = 0;
  let pageCount = 0;

  while (yPos < canvas.height) {
    if (pageCount > 0) pdf.addPage();
    pdf.addImage(
      imgData,
      "PNG",
      0,
      -(yPos * pageW) / canvas.width,
      pageW,
      imgH,
    );
    yPos += (pageH * canvas.width) / pageW;
    pageCount++;
  }

  pdf.save(
    `${title.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`,
  );
};

// ─── Excel exports ───────────────────────────────────────────────────────────

const issueToRow = (issue: QAIssue) => ({
  Key: issue.key,
  Summary: issue.summary,
  Priority: issue.priority,
  Status: issue.status,
  Assignee: issue.assignee,
  Module: issue.module,
  Environment: issue.environment,
  Created: new Date(issue.created).toLocaleDateString(),
  "SLA Hours": issue.slaHours,
  "Hours Elapsed": Math.floor(
    (Date.now() - new Date(issue.created).getTime()) / 3600000,
  ),
  "Reopen Count": issue.reopenCount,
  Comments: issue.commentsCount,
  "Time Estimate (h)": issue.timeEstimate,
  "Time Logged (h)": issue.timeLogged,
  "Story Key": issue.storyKey ?? "",
  "Story Title": issue.storyTitle ?? "",
});

export const exportIssuesToExcel = (
  issues: QAIssue[],
  sheetName = "Issues",
  filename = "qa-issues",
): void => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(issues.map(issueToRow));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(
    wb,
    `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};

export const exportAgeingToExcel = (items: AgeingItem[]): void => {
  const wb = XLSX.utils.book_new();
  const rows = items.map((a) => ({
    Key: a.issue.key,
    Summary: a.issue.summary,
    Priority: a.issue.priority,
    Status: a.issue.status,
    Assignee: a.issue.assignee,
    Module: a.issue.module,
    Environment: a.issue.environment,
    "Hours Elapsed": a.hoursElapsed,
    "SLA Hours": a.slaHours,
    "Ageing Status": a.ageingStatus,
    Escalated: a.isEscalated ? "Yes" : "No",
    "SLA Breach": a.slaBreach ? "Yes" : "No",
    "Risk Score": a.riskScore,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Ageing Analysis");
  XLSX.writeFile(
    wb,
    `ageing_analysis_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};

export const exportLeakageToExcel = (items: BugLeakageItem[]): void => {
  const wb = XLSX.utils.book_new();
  const rows = items.map((b) => ({
    Key: b.issue.key,
    Summary: b.issue.summary,
    Priority: b.issue.priority,
    Status: b.issue.status,
    "Leakage Type": b.leakageType,
    "Detected In": b.detectedIn,
    Assignee: b.issue.assignee,
    Module: b.issue.module,
    Labels: b.issue.labels.join(", "),
    Created: new Date(b.issue.created).toLocaleDateString(),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Bug Leakage");
  XLSX.writeFile(
    wb,
    `bug_leakage_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};

export const exportOverburntToExcel = (items: OverburntItem[]): void => {
  const wb = XLSX.utils.book_new();
  const rows = items.map((o) => ({
    Key: o.issue.key,
    Summary: o.issue.summary,
    Priority: o.issue.priority,
    Status: o.issue.status,
    Assignee: o.issue.assignee,
    "Risk Level": o.riskLevel,
    "Overburnt Score": o.overburntScore,
    Reasons: o.overburntReasons.join(" | "),
    "Time Estimate (h)": o.issue.timeEstimate,
    "Time Logged (h)": o.issue.timeLogged,
    "Status Changes": o.issue.statusChanges.length,
    "Reopen Count": o.issue.reopenCount,
    Comments: o.issue.commentsCount,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Overburnt Items");
  XLSX.writeFile(
    wb,
    `overburnt_items_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};
