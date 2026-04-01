import React from "react";
import { Drawer, Select, Button, Space, DatePicker } from "antd";
import { useDashboardStore } from "../../store/useStore";
import { MOCK_ASSIGNEES, MOCK_MODULES } from "../../data/mockData";
import type { Priority } from "../../types/qa";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

interface QAFiltersProps {
  open: boolean;
  onClose: () => void;
}

const PRIORITIES: Priority[] = ["Blocker", "Critical", "High", "Medium", "Low"];
const ENVIRONMENTS = [
  "Production",
  "Staging",
  "NPR",
  "Non-Prod",
  "Development",
];

const QAFilters: React.FC<QAFiltersProps> = ({ open, onClose }) => {
  const { filters, setFilters, resetFilters } = useDashboardStore();

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--qa-text-muted)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 16,
    display: "block",
  };

  return (
    <Drawer
      title="Filter Issues"
      open={open}
      onClose={onClose}
      width={340}
      styles={{
        body: { background: "var(--qa-bg-secondary)", padding: 20 },
        header: {
          background: "var(--qa-bg-secondary)",
          borderBottom: "1px solid var(--qa-border)",
        },
      }}
      footer={
        <Space>
          <Button onClick={resetFilters}>Reset</Button>
          <Button type="primary" onClick={onClose}>
            Apply
          </Button>
        </Space>
      }
    >
      <label style={labelStyle}>Date Range</label>
      <RangePicker
        style={{ width: "100%" }}
        value={
          filters.dateRange
            ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])]
            : null
        }
        onChange={(_, dateStrings) =>
          setFilters({
            dateRange:
              dateStrings[0] && dateStrings[1]
                ? [dateStrings[0], dateStrings[1]]
                : null,
          })
        }
      />

      <label style={labelStyle}>Severity</label>
      <Select
        mode="multiple"
        style={{ width: "100%" }}
        placeholder="All severities"
        value={filters.severity}
        onChange={(val) => setFilters({ severity: val as Priority[] })}
        options={PRIORITIES.map((p) => ({ value: p, label: p }))}
      />

      <label style={labelStyle}>Assignee</label>
      <Select
        mode="multiple"
        style={{ width: "100%" }}
        placeholder="All assignees"
        value={filters.assignee}
        onChange={(val) => setFilters({ assignee: val })}
        options={MOCK_ASSIGNEES.map((a) => ({ value: a, label: a }))}
      />

      <label style={labelStyle}>Environment</label>
      <Select
        mode="multiple"
        style={{ width: "100%" }}
        placeholder="All environments"
        value={filters.environment}
        onChange={(val) => setFilters({ environment: val })}
        options={ENVIRONMENTS.map((e) => ({ value: e, label: e }))}
      />

      <label style={labelStyle}>Module</label>
      <Select
        mode="multiple"
        style={{ width: "100%" }}
        placeholder="All modules"
        value={filters.module}
        onChange={(val) => setFilters({ module: val })}
        options={MOCK_MODULES.map((m) => ({ value: m, label: m }))}
      />
    </Drawer>
  );
};

export default QAFilters;
