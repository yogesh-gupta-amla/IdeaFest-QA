import React, { useEffect, useRef } from "react";
import type { QANote } from "../../types";

interface QANotesProps {
  notes: QANote[];
  onChange: (notes: QANote[]) => void;
}

export default function QANotes({ notes, onChange }: QANotesProps) {
  const lastInputRef = useRef<HTMLInputElement | null>(null);

  const add = () => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    onChange([...notes, { id, text: "" }]);
  };

  const remove = (id: string) => onChange(notes.filter((n) => n.id !== id));

  const update = (id: string, text: string) => {
    onChange(notes.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  // Focus last input when a new note is added
  useEffect(() => {
    if (lastInputRef.current) lastInputRef.current.focus();
  }, [notes.length]);

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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          QA Notes &amp; Action Items
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
          Add Note
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="empty-state">
          No notes yet. Click Add Note to add an action item.
        </p>
      ) : (
        <div className="qa-notes-list">
          {notes.map((note, idx) => (
            <div key={note.id} className="qa-note-item">
              <span className="qa-note-bullet">•</span>
              <input
                className="qa-note-input"
                value={note.text}
                placeholder="Type a note or action item…"
                onChange={(e) => update(note.id, e.target.value)}
                ref={idx === notes.length - 1 ? lastInputRef : null}
              />
              <button
                className="qa-note-remove"
                title="Remove"
                onClick={() => remove(note.id)}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
