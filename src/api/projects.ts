import { useMutation, useQuery } from "@tanstack/react-query";
import type { VideoProject } from "../schema/project";
import { queryClient } from "./queryClient";
import { trpc } from "./trpc";

// The project LIST lives in the TanStack Query cache (what the server has);
// the project being EDITED lives in Zustand (useProjectStore). These helpers
// are the bridge: saving writes to the server and then updates the list.

const listKey = trpc.projects.list.queryKey();

export function cachedProjects(): VideoProject[] {
  return queryClient.getQueryData(listKey) ?? [];
}

// Same project, ignoring when it was saved? Used to skip saves that would
// only rewrite savedAt — opening a project must not touch its file.
function sameContent(a: VideoProject, b: VideoProject): boolean {
  const { savedAt: _a, ...left } = a;
  const { savedAt: _b, ...right } = b;
  return JSON.stringify(left) === JSON.stringify(right);
}

export function isSavedOnServer(project: VideoProject): boolean {
  const saved = cachedProjects().find((p) => p.id === project.id);
  return saved !== undefined && sameContent(saved, project);
}

// For the dropdown: id + title, grouped by collection, then alphabetical.
export function useProjectList() {
  const { data = [] } = useQuery(trpc.projects.list.queryOptions());
  return [...data].sort(
    (a, b) =>
      (a.collection ?? "").localeCompare(b.collection ?? "") ||
      a.title.localeCompare(b.title),
  );
}

export function useSaveProject() {
  const save = useMutation(
    trpc.projects.save.mutationOptions({
      // put the saved copy into the list, replacing the old one or adding it
      onSuccess: (saved) =>
        queryClient.setQueryData(listKey, (list = []) => [
          ...list.filter((p) => p.id !== saved.id),
          saved,
        ]),
    }),
  );
  return {
    ...save,
    save: (project: VideoProject) => save.mutate({ ...project, savedAt: Date.now() }),
  };
}

export function useDeleteProject() {
  return useMutation(
    trpc.projects.remove.mutationOptions({
      onSuccess: (_result, id) =>
        queryClient.setQueryData(listKey, (list = []) =>
          list.filter((p) => p.id !== id),
        ),
    }),
  );
}
