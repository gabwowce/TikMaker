import { useSaveStatus } from "./state/fileLibrary";

export function SaveStatusBadge() {
  const { state, pending } = useSaveStatus();
  let label = "Saved";
  if (state === "error") label = "Not saved";
  else if (state === "saving" || pending > 0) label = "Saving...";

  return (
    <span
      role="status"
      className={`text-xs ${state === "error" ? "text-red-400" : "text-editor-muted"}`}
    >
      {label}
    </span>
  );
}
