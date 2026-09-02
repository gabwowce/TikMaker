import React, { useRef, useState } from "react";
import { editorColors } from "./theme";

/**
 * Import by PASTING the JSON, with picking a file as the secondary path.
 *
 * The JSON usually arrives in a chat window or an editor buffer, not as a file
 * on disk — the old file-only import meant saving it somewhere first just to
 * hand it back to the app. Paste is the shorter route to the same place, so it
 * is the one the dialog opens on.
 */
export const ImportJsonDialog: React.FC<{
  title: string;
  onImport: (text: string) => string | null;
  onClose: () => void;
}> = ({ title, onImport, onClose }) => {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function submit(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Įklijuok JSON.");
      return;
    }
    const failure = onImport(trimmed);
    if (failure) setError(failure);
    else onClose();
  }

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 90vw)",
          background: editorColors.panel,
          border: `1px solid ${editorColors.border}`,
          borderRadius: 10,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: editorColors.text }}>{title}</div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            // Ctrl+Enter submits: the textarea owns plain Enter.
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(text);
            if (e.key === "Escape") onClose();
          }}
          placeholder='Įklijuok JSON čia… (Ctrl+Enter — importuoti)'
          spellCheck={false}
          style={{
            height: 300,
            resize: "vertical",
            padding: 10,
            borderRadius: 6,
            border: `1px solid ${editorColors.border}`,
            background: editorColors.panelElevated,
            color: editorColors.text,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 11,
            lineHeight: 1.5,
            outline: "none",
          }}
        />

        {error ? (
          <div style={{ fontSize: 11, color: "#ff8a65", whiteSpace: "pre-wrap", maxHeight: 90, overflow: "auto" }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) submit(await file.text());
            }}
          />
          <button onClick={() => fileInputRef.current?.click()} style={buttonStyle}>
            Iš failo…
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={buttonStyle}>
            Atšaukti
          </button>
          <button
            onClick={() => submit(text)}
            style={{ ...buttonStyle, borderColor: editorColors.accent, color: editorColors.accent }}
          >
            Importuoti
          </button>
        </div>
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: "7px 12px",
  fontSize: 11,
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: "transparent",
  color: editorColors.text,
  cursor: "pointer",
};
