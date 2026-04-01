import React from "react";
import type {
  Metrics,
  ManualEntry,
  QANote,
  RAGStatus,
  SnapshotMetrics,
} from "../../types";
import HealthBanner from "./HealthBanner";
import StatsGrid from "./StatsGrid";
import HighlightsList from "./HighlightsList";
import ChartsSection from "./ChartsSection";
import StatusSummaryTable from "./StatusSummaryTable";
import MustFixTable from "./MustFixTable";
import OpenIssuesTable from "./OpenIssuesTable";
import ManualQATable from "./ManualQATable";
import QANotes from "./QANotes";
import DSRSection from "./DSRSection";

interface DashboardProps {
  metrics: Metrics;
  prevMetrics: SnapshotMetrics | null;
  selectedProjectKey: string;
  selectedProjectName: string;
  manualEntries: ManualEntry[];
  qaNotes: QANote[];
  testingEnv: string;
  sprintName: string;
  ragOverride: RAGStatus;
  dsrRecipient: string;
  onManualEntriesChange: (entries: ManualEntry[]) => void;
  onQaNotesChange: (notes: QANote[]) => void;
  onRagOverrideChange: (rag: RAGStatus) => void;
  onDsrRecipientChange: (v: string) => void;
}

export default function Dashboard({
  metrics,
  prevMetrics,
  selectedProjectKey,
  selectedProjectName,
  manualEntries,
  qaNotes,
  testingEnv,
  sprintName,
  ragOverride,
  dsrRecipient,
  onManualEntriesChange,
  onQaNotesChange,
  onRagOverrideChange,
  onDsrRecipientChange,
}: DashboardProps) {
  return (
    <div id="dashboard-body-react" className="fade-in">
      <HealthBanner
        metrics={metrics}
        selectedProjectName={selectedProjectName}
        testingEnv={testingEnv}
        sprintName={sprintName}
        ragOverride={ragOverride}
        onRagOverrideChange={onRagOverrideChange}
      />
      <HighlightsList
        metrics={metrics}
        selectedProjectKey={selectedProjectKey}
        qaNotes={qaNotes}
      />
      <StatsGrid metrics={metrics} prevMetrics={prevMetrics} />
      <ChartsSection metrics={metrics} />
      <StatusSummaryTable
        metrics={metrics}
        selectedProjectKey={selectedProjectKey}
      />
      <MustFixTable issues={metrics.mustFixIssues} />
      <OpenIssuesTable issues={metrics.openIssues} />
      <ManualQATable entries={manualEntries} onChange={onManualEntriesChange} />
      <QANotes notes={qaNotes} onChange={onQaNotesChange} />
      <DSRSection
        metrics={metrics}
        selectedProjectKey={selectedProjectKey}
        selectedProjectName={selectedProjectName}
        manualEntries={manualEntries}
        qaNotes={qaNotes}
        testingEnv={testingEnv}
        sprintName={sprintName}
        ragOverride={ragOverride}
        dsrRecipient={dsrRecipient}
        onDsrRecipientChange={onDsrRecipientChange}
      />
    </div>
  );
}
