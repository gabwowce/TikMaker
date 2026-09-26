import { useIsMutating, useMutationState } from "@tanstack/react-query";
import { trpc } from "../api/trpc";

// Reads the state of project saves straight from TanStack Query — no store of
// its own. "Saving" while one is in flight, "Not saved" if the latest failed.
export function SaveStatusBadge() {
  const mutationKey = trpc.projects.save.mutationKey();
  const saving = useIsMutating({ mutationKey }) > 0;
  const statuses = useMutationState({
    filters: { mutationKey },
    select: (mutation) => mutation.state.status,
  });
  const lastStatus = statuses[statuses.length - 1];

  const failed = !saving && lastStatus === "error";
  const label = saving ? "Saving..." : failed ? "Not saved" : "Saved";
  return (
    <span
      role="status"
      className={`text-xs ${failed ? "text-red-400" : "text-editor-muted"}`}
    >
      {label}
    </span>
  );
}
