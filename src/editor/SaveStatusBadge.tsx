import React from "react";
import { useSaveStatus } from "./state/fileLibrary";
import { editorColors } from "./theme";

/**
 * Says out loud whether your work is on disk.
 *
 * Saving used to be silent in both directions: the write was fire-and-forget
 * and its failure was swallowed, so an editor with a stopped dev server looked
 * exactly like one that was saving fine — right up to the reload that threw the
 * session away. An autosave you cannot see is a promise you cannot check.
 */
export const SaveStatusBadge: React.FC = () => {
  const { state, error, lastSavedAt, pending } = useSaveStatus();

  const [, forceRender] = React.useState(0);
  React.useEffect(() => {
    // "prieš 2 min" has to keep counting while nothing else changes.
    const timer = setInterval(() => forceRender((n) => n + 1), 20_000);
    return () => clearInterval(timer);
  }, []);

  const label = (() => {
    if (state === "error") return "⚠ Neišsaugota";
    if (state === "saving" || pending > 0) return "Saugoma…";
    if (state === "saved" && lastSavedAt) return `Išsaugota ${relativeTime(lastSavedAt)}`;
    return "Išsaugota";
  })();

  const color = state === "error" ? "#ff8a65" : state === "saving" ? editorColors.textDim : editorColors.textDim;

  return (
    <span
      title={error ?? "Kiekvienas pakeitimas automatiškai rašomas į failą diske."}
      style={{
        fontSize: 11,
        color,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        whiteSpace: "nowrap",
        maxWidth: 260,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          flexShrink: 0,
          background: state === "error" ? "#ff5722" : state === "saving" ? editorColors.accent : "#4caf50",
        }}
      />
      {label}
    </span>
  );
};

function relativeTime(at: number): string {
  const seconds = Math.round((Date.now() - at) / 1000);
  if (seconds < 10) return "ką tik";
  if (seconds < 60) return `prieš ${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `prieš ${minutes} min`;
  return `prieš ${Math.round(minutes / 60)} val`;
};
