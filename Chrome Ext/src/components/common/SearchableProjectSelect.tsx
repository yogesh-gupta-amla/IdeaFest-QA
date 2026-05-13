import React, { useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, FolderOpen, Check } from "lucide-react";
import type { JiraProject } from "../../types";

interface SearchableProjectSelectProps {
  projects: JiraProject[];
  value: string;
  onChange: (key: string, name: string) => void;
  placeholder?: string;
  /** "landing" = full-width card style, "header" = compact top-bar style */
  variant?: "landing" | "header";
}

export default function SearchableProjectSelect({
  projects,
  value,
  onChange,
  placeholder = "— Choose a project —",
  variant = "landing",
}: SearchableProjectSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = projects.find((p) => p.key === value) ?? null;

  const filtered = query.trim()
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.key.toLowerCase().includes(query.toLowerCase()),
      )
    : projects;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleSelect = useCallback(
    (p: JiraProject) => {
      onChange(p.key, p.name);
      setOpen(false);
      setQuery("");
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  // ── Landing variant (full-width, card-style) ─────────────────────────────
  if (variant === "landing") {
    return (
      <div
        ref={containerRef}
        className="relative w-full"
        onKeyDown={handleKeyDown}
      >
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between rounded-xl text-sm transition-all duration-200"
          style={{
            padding: "10px 14px",
            background: "var(--input-bg, rgba(255,255,255,0.05))",
            border: open
              ? "1px solid color-mix(in srgb, var(--qa-accent, #8b5cf6) 60%, transparent)"
              : "1px solid var(--border, rgba(255,255,255,0.1))",
            boxShadow: open
              ? "0 0 0 3px var(--accent-glow, rgba(139,92,246,0.15))"
              : "none",
            color: selected
              ? "var(--text-heading, #e2e8f0)"
              : "var(--text-muted, #64748b)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span className="flex items-center gap-2 min-w-0">
            <FolderOpen
              size={14}
              style={{
                flexShrink: 0,
                color: selected
                  ? "var(--qa-accent, #8b5cf6)"
                  : "var(--text-muted, #64748b)",
              }}
            />
            {selected ? (
              <span className="truncate">{selected.name}</span>
            ) : (
              <span style={{ color: "var(--text-muted, #64748b)" }}>
                {placeholder}
              </span>
            )}
          </span>
          <ChevronDown
            size={14}
            style={{
              flexShrink: 0,
              color: "var(--text-muted, #64748b)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden"
            style={{
              background: "var(--qa-bg-card, #13111e)",
              border:
                "1px solid color-mix(in srgb, var(--qa-accent, #8b5cf6) 30%, transparent)",
              boxShadow:
                "0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.1)",
              maxHeight: 320,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Search box */}
            <div
              className="flex items-center gap-2 px-3 py-2.5"
              style={{
                borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))",
                flexShrink: 0,
              }}
            >
              <Search
                size={13}
                style={{ color: "var(--qa-accent, #8b5cf6)", flexShrink: 0 }}
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--text-heading, #e2e8f0)" }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    color: "var(--text-muted, #64748b)",
                    background: "rgba(255,255,255,0.06)",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Project list */}
            <ul
              ref={listRef}
              className="overflow-y-auto"
              style={{
                maxHeight: 260,
                listStyle: "none",
                margin: 0,
                padding: "4px 0",
              }}
            >
              {filtered.length === 0 ? (
                <li
                  className="px-4 py-3 text-sm text-center"
                  style={{ color: "var(--text-muted, #64748b)" }}
                >
                  No projects match "{query}"
                </li>
              ) : (
                filtered.map((p) => {
                  const isActive = p.key === value;
                  return (
                    <li key={p.key}>
                      <button
                        type="button"
                        onClick={() => handleSelect(p)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150"
                        style={{
                          background: isActive
                            ? "color-mix(in srgb, var(--qa-accent, #8b5cf6) 15%, transparent)"
                            : "transparent",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "rgba(255,255,255,0.05)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive)
                            (
                              e.currentTarget as HTMLButtonElement
                            ).style.background = "transparent";
                        }}
                      >
                        {/* Key badge */}
                        <span
                          className="text-[10px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0"
                          style={{
                            background: isActive
                              ? "var(--qa-accent, #8b5cf6)"
                              : "rgba(255,255,255,0.08)",
                            color: isActive
                              ? "#fff"
                              : "var(--qa-text-secondary, #a78bfa)",
                            minWidth: 36,
                            textAlign: "center",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {p.key}
                        </span>
                        {/* Name */}
                        <span
                          className="text-sm truncate flex-1"
                          style={{
                            color: isActive
                              ? "var(--text-heading, #e2e8f0)"
                              : "var(--qa-text-secondary, #94a3b8)",
                          }}
                        >
                          {p.name}
                        </span>
                        {isActive && (
                          <Check
                            size={13}
                            style={{
                              flexShrink: 0,
                              color: "var(--qa-accent, #8b5cf6)",
                            }}
                          />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            {/* Footer count */}
            <div
              className="px-3 py-1.5 text-[10px]"
              style={{
                color: "var(--text-muted, #64748b)",
                borderTop: "1px solid var(--border, rgba(255,255,255,0.06))",
                flexShrink: 0,
              }}
            >
              {filtered.length} of {projects.length} project
              {projects.length !== 1 ? "s" : ""}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Header variant (compact, fits top bar) ────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ minWidth: 170, maxWidth: 240 }}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 w-full rounded-lg text-[12px] transition-all duration-150"
        style={{
          padding: "5px 10px 5px 8px",
          background: "var(--qa-bg-secondary)",
          border: open
            ? "1px solid color-mix(in srgb, var(--qa-accent) 50%, transparent)"
            : "1px solid var(--qa-border)",
          color: "var(--qa-text-primary)",
          cursor: "pointer",
          maxWidth: 240,
        }}
      >
        <FolderOpen
          size={11}
          style={{
            flexShrink: 0,
            color: "var(--qa-accent)",
          }}
        />
        <span className="truncate flex-1 text-left" style={{ maxWidth: 160 }}>
          {selected ? (
            <span>
              <span
                className="font-black mr-1"
                style={{ color: "var(--qa-accent)" }}
              >
                {selected.key}
              </span>
              <span style={{ color: "var(--qa-text-secondary)" }}>
                {selected.name.replace(/\s*\([^)]*\)\s*$/, "")}
              </span>
            </span>
          ) : (
            <span style={{ color: "var(--qa-text-muted)" }}>
              Select project
            </span>
          )}
        </span>
        <ChevronDown
          size={10}
          style={{
            flexShrink: 0,
            color: "var(--qa-text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-1 rounded-xl overflow-hidden"
          style={{
            zIndex: 999,
            width: 300,
            background: "var(--qa-bg-card)",
            border:
              "1px solid color-mix(in srgb, var(--qa-accent) 30%, transparent)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search */}
          <div
            className="flex items-center gap-2 px-2.5 py-2"
            style={{
              borderBottom: "1px solid var(--qa-border)",
              flexShrink: 0,
            }}
          >
            <Search
              size={11}
              style={{ color: "var(--qa-accent)", flexShrink: 0 }}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              className="flex-1 bg-transparent outline-none text-[12px]"
              style={{ color: "var(--qa-text-primary)" }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{
                  color: "var(--qa-text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 10,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* List */}
          <ul
            className="overflow-y-auto"
            style={{
              maxHeight: 260,
              listStyle: "none",
              margin: 0,
              padding: "4px 0",
            }}
          >
            {filtered.length === 0 ? (
              <li
                className="px-3 py-2 text-[12px] text-center"
                style={{ color: "var(--qa-text-muted)" }}
              >
                No matches for "{query}"
              </li>
            ) : (
              filtered.map((p) => {
                const isActive = p.key === value;
                return (
                  <li key={p.key}>
                    <button
                      type="button"
                      onClick={() => handleSelect(p)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors duration-100"
                      style={{
                        background: isActive
                          ? "color-mix(in srgb, var(--qa-accent) 15%, transparent)"
                          : "transparent",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "var(--qa-bg-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          (
                            e.currentTarget as HTMLButtonElement
                          ).style.background = "transparent";
                      }}
                    >
                      <span
                        className="text-[9px] font-black px-1 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: isActive
                            ? "var(--qa-accent)"
                            : "rgba(255,255,255,0.07)",
                          color: isActive ? "#fff" : "var(--qa-text-secondary)",
                          minWidth: 32,
                          textAlign: "center",
                        }}
                      >
                        {p.key}
                      </span>
                      <span
                        className="text-[12px] truncate flex-1"
                        style={{
                          color: isActive
                            ? "var(--qa-text-primary)"
                            : "var(--qa-text-secondary)",
                        }}
                      >
                        {p.name.replace(/\s*\([^)]*\)\s*$/, "")}
                      </span>
                      {isActive && (
                        <Check
                          size={11}
                          style={{ flexShrink: 0, color: "var(--qa-accent)" }}
                        />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* Count */}
          <div
            className="px-2.5 py-1 text-[10px]"
            style={{
              color: "var(--qa-text-muted)",
              borderTop: "1px solid var(--qa-border)",
              flexShrink: 0,
            }}
          >
            {filtered.length}/{projects.length} projects
          </div>
        </div>
      )}
    </div>
  );
}
