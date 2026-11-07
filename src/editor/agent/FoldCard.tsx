import { UnstyledButton } from "@mantine/core";
import { useState, type ReactNode } from "react";

// A card of the agent's conversation that shows one line – what the step did,
// in a few words – and opens on click to everything it decided. The steps that
// list every scene (pictures, motion) are long; folded, the conversation stays
// readable and the details are one click away.
export function FoldCard({
  title,
  summary,
  children,
}: {
  title: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3">
      <UnstyledButton
        onClick={() => setOpen(!open)}
        className="flex flex-col gap-0.5 text-left text-xs text-editor-muted hover:text-editor-text"
      >
        <span>
          {open ? "▾" : "▸"} <span className="text-green-400">✓</span> {title}
        </span>
        {summary ? <span className="pl-4">{summary}</span> : null}
      </UnstyledButton>
      {open ? children : null}
    </div>
  );
}
