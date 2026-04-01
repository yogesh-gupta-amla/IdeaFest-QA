import React from "react";
import type { ManualEntry } from "../../types";

interface ManualQATableProps {
  entries: ManualEntry[];
  onChange: (entries: ManualEntry[]) => void;
}

const QA_STATUS_OPTIONS = ["Not Started", "WIP", "Done", "Blocked"];

function newEntry(): ManualEntry {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    jiraId: "",
    title: "",
    qaStatus: "WIP",
    devOwner: "",
    qaOwner: "",
    openBugs: 0,
    overallBugs: 0,
    unitLevel: 0,
    rejected: 0,
  };
}

export default function ManualQATable({
  entries,
  onChange,
}: ManualQATableProps) {
  const add = () => onChange([...entries, newEntry()]);

  const remove = (id: string) => onChange(entries.filter((e) => e.id !== id));

  const update = (
    id: string,
    field: keyof ManualEntry,
    value: string | number,
  ) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  return (
    <section className="card fade-in">
      <div className="card-title-row">
        <h2 className="card-title">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 11 12 14 22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Manual QA Testing Status
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={add}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Row
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="empty-state">
          No manual testing entries. Click Add Row to start.
        </p>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Jira ID</th>
                <th>Title / Module</th>
                <th>QA Status</th>
                <th>Dev Owner</th>
                <th>QA Owner</th>
                <th>Open Bugs</th>
                <th>Overall Bugs</th>
                <th>Unit Level</th>
                <th>Rejected</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <input
                      className="editable-cell"
                      value={e.jiraId}
                      placeholder="ABC-123"
                      onChange={(ev) => update(e.id, "jiraId", ev.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="editable-cell"
                      value={e.title}
                      placeholder="Feature / Module"
                      onChange={(ev) => update(e.id, "title", ev.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="editable-cell cell-select"
                      value={e.qaStatus}
                      onChange={(ev) =>
                        update(e.id, "qaStatus", ev.target.value)
                      }
                    >
                      {QA_STATUS_OPTIONS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="editable-cell"
                      value={e.devOwner}
                      placeholder="Dev name"
                      onChange={(ev) =>
                        update(e.id, "devOwner", ev.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="editable-cell"
                      value={e.qaOwner}
                      placeholder="QA name"
                      onChange={(ev) =>
                        update(e.id, "qaOwner", ev.target.value)
                      }
                    />
                  </td>
                  {(
                    [
                      "openBugs",
                      "overallBugs",
                      "unitLevel",
                      "rejected",
                    ] as const
                  ).map((field) => (
                    <td key={field}>
                      <input
                        type="number"
                        className="editable-cell cell-number"
                        value={e[field]}
                        min={0}
                        onChange={(ev) =>
                          update(
                            e.id,
                            field,
                            parseInt(ev.target.value, 10) || 0,
                          )
                        }
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      className="btn-remove-row"
                      title="Remove"
                      onClick={() => remove(e.id)}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
