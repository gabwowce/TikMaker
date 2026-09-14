import type { VideoProject } from "../../schema/project";
import exampleProjectJson from "../../templates/template-showcase.json";
import { parseProject } from "../../utils/normalizeProject";
import { readDisk, scheduleSave, usePreferences } from "./fileLibrary";
export type Library = Record<string, VideoProject>;
let library: Library = {};
export function readLibrary(): Library {
  return library;
}
export function writeLibrary(next: Library) {
  library = next;
}
export function libraryIndexFrom(library: Library): {
  id: string;
  title: string;
  collection?: string;
}[] {
  return Object.values(library)
    .map((p) => ({ id: p.id, title: p.title, collection: p.collection }))
    .sort(
      (a, b) =>
        (a.collection ?? "").localeCompare(b.collection ?? "") ||
        a.title.localeCompare(b.title),
    );
}
export function loadInitialState(): {
  project: VideoProject;
  library: Library;
} {
  const library: Library = {};
  for (const project of readDisk("project", parseProject))
    library[project.id] = project;
  writeLibrary(library);
  const restored =
    typeof window === "undefined"
      ? null
      : window.localStorage.getItem("tikmaker.reopenAfterRestore");
  if (restored) {
    window.localStorage.removeItem("tikmaker.reopenAfterRestore");
    if (library[restored]) return { project: library[restored], library };
  }
  const lastOpenedId = usePreferences.getState().lastOpenedProjectId;
  if (lastOpenedId && library[lastOpenedId])
    return { project: library[lastOpenedId], library };
  const first = Object.values(library)[0];
  if (first) return { project: first, library };
  return { project: parseProject(exampleProjectJson), library };
}
export function rememberLastOpened(id: string) {
  usePreferences.getState().set({ lastOpenedProjectId: id });
}
export function persist(project: VideoProject, library: Library): Library {
  const stamped: VideoProject = { ...project, savedAt: Date.now() };
  const next = { ...library, [stamped.id]: stamped };
  writeLibrary(next);
  scheduleSave("project", stamped);
  rememberLastOpened(stamped.id);
  return next;
}
