import React, { useState } from "react"; // useState kept for selectedKey
import type { JiraProject } from "../../types";

interface ProjectSelectorProps {
  projects: JiraProject[];
  onLoadProject: (key: string, name: string) => void;
}

export default function ProjectSelector({
  projects,
  onLoadProject,
}: ProjectSelectorProps) {
  const [selectedKey, setSelectedKey] = useState("");

  const handleLoad = () => {
    if (!selectedKey) return;
    const project = projects.find((p) => p.key === selectedKey);
    onLoadProject(
      selectedKey,
      project ? `${project.name} (${project.key})` : selectedKey,
    );
  };

  return (
    <section className="card config-card fade-in">
      <h2 className="card-title">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        Select Project
      </h2>
      <div className="config-row">
        <div className="input-group">
          <select
            className="input select-input"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
          >
            <option value="">— Choose a project —</option>
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.name} ({p.key})
              </option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-primary btn-large"
          onClick={handleLoad}
          disabled={!selectedKey}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Load Dashboard
        </button>
      </div>
    </section>
  );
}
