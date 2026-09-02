import { create } from "zustand";
import { z } from "zod";
import { videoProjectSchema, type VideoProject } from "../../schema/project";
import { readDisk, scheduleSave, deleteEntry } from "./fileLibrary";

export type SavedTemplate = {
  id: string;
  name: string;
  description?: string;
  /** The whole project as it was when saved. Its `id`/`title` are replaced on
   * use, so the same template can start any number of videos. */
  project: VideoProject;
  savedAt: number;
};

const savedTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  project: videoProjectSchema,
  savedAt: z.number(),
});

function parse(json: unknown): SavedTemplate | null {
  const result = savedTemplateSchema.safeParse(json);
  // Same reasoning as `savedScenesStore`: drop the entry that no longer
  // validates, never the list.
  return result.success ? result.data : null;
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** A fresh project from a saved template — new identity, the template's name as
 * the starting title. Scene ids are kept as-is because they only have to be
 * unique WITHIN a project, and this produces a whole project rather than
 * inserting into an existing one (which is why `instantiateSavedScene` has to
 * re-mint and this doesn't). */
export function instantiateSavedTemplate(saved: SavedTemplate): VideoProject {
  return {
    ...saved.project,
    id: `${saved.id}-${Date.now().toString(36)}`,
    title: saved.name,
  };
}

type SavedTemplatesState = {
  templates: SavedTemplate[];
  load: () => void;
  save: (project: VideoProject, name: string, description?: string) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
};

function sortByNewest(templates: SavedTemplate[]): SavedTemplate[] {
  return [...templates].sort((a, b) => b.savedAt - a.savedAt);
}

/**
 * Whole videos kept as reusable starting points, sitting alongside the built-in
 * script templates in `scriptTemplates.ts`.
 *
 * The project library already stores finished videos, but opening one and
 * editing it EDITS that video — there was no way to say "this shape was good,
 * start a new one from it" without duplicating by hand. One file per template
 * in `library/templates/`, same storage rule as everything else.
 */
export const useSavedTemplatesStore = create<SavedTemplatesState>((set, get) => ({
  templates: sortByNewest(readDisk("template", parse)),

  load: () => set({ templates: sortByNewest(get().templates) }),

  save: (project, name, description) => {
    const entry: SavedTemplate = { id: newId("tpl"), name, description, project, savedAt: Date.now() };
    scheduleSave("template", entry);
    set({ templates: [entry, ...get().templates] });
  },

  rename: (id, name) => {
    const next = get().templates.map((t) => (t.id === id ? { ...t, name } : t));
    const renamed = next.find((t) => t.id === id);
    if (renamed) scheduleSave("template", renamed);
    set({ templates: next });
  },

  remove: (id) => {
    void deleteEntry("template", id).catch(() => undefined);
    set({ templates: get().templates.filter((t) => t.id !== id) });
  },
}));
