import React from "react";
import { editorColors } from "./theme";
import { useLoadFailures, type LibraryKind } from "./state/fileLibrary";

/**
 * What did not load, said out loud.
 *
 * An entry that fails validation is dropped rather than thrown, so one stale
 * field cannot take the whole library down — that part is right. What was wrong
 * is that it was dropped in silence: a project that no longer validates and a
 * project that was never saved look identical from the outside, and the file
 * still sitting on disk helps nobody who has not been told to go and look at it.
 *
 * This is deliberately a banner rather than a toast. The entry is still missing
 * ten minutes later, so a message that disappears would be lying about that.
 */

const KIND_LABELS: Record<LibraryKind, string> = {
  project: "Projektas",
  storyboard: "Storyboard",
  scene: "Išsaugota scena",
  template: "Šablonas",
  background: "Fonas",
  voiceVariant: "Balso variantas",
};

export const LibraryLoadWarning: React.FC = () => {
  const failures = useLoadFailures((state) => state.failures);
  const [dismissed, setDismissed] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  if (!failures.length || dismissed) return null;

  return (
    <div
      role="status"
      style={{
        background: "rgba(240, 69, 94, 0.12)",
        borderBottom: `1px solid rgba(240, 69, 94, 0.45)`,
        color: editorColors.text,
        padding: "8px 14px",
        fontSize: 12,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <strong style={{ fontWeight: 600 }}>
            {failures.length === 1 ? "1 įrašas nepakrautas" : `${failures.length} įrašai nepakrauti`}
          </strong>
          <span style={{ color: editorColors.textDim }}>
            Failai tebėra diske — jie neatitinka dabartinės schemos.
          </span>
          <button
            onClick={() => setOpen((value) => !value)}
            style={{
              background: "transparent",
              border: `1px solid ${editorColors.border}`,
              color: editorColors.text,
              borderRadius: 5,
              padding: "2px 8px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {open ? "Slėpti" : "Rodyti"}
          </button>
        </div>

        {open ? (
          <ul style={{ margin: "8px 0 2px", paddingLeft: 18, color: editorColors.textDim, lineHeight: 1.6 }}>
            {failures.map((failure, index) => (
              <li key={`${failure.kind}-${failure.label}-${index}`}>
                <span style={{ color: editorColors.text }}>{KIND_LABELS[failure.kind]}</span>
                {" · "}
                {failure.label}
                {" · "}
                <code style={{ fontSize: 11 }}>{failure.reason}</code>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Uždaryti pranešimą"
        style={{
          background: "transparent",
          border: "none",
          color: editorColors.textDim,
          cursor: "pointer",
          fontSize: 15,
          lineHeight: 1,
          padding: 2,
        }}
      >
        ×
      </button>
    </div>
  );
};
