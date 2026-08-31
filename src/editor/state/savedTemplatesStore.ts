import { create } from "zustand";
import { z } from "zod";
import { videoProjectSchema, type VideoProject } from "../../schema/project";

const STORAGE_KEY = "tikmaker.savedTemplates";

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

function read(): SavedTemplate[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = z.array(savedTemplateSchema).safeParse(JSON.parse(raw));
    // Same reasoning as `savedScenesStore`: a project shape that no longer
    // validates would otherwise take the whole library down, so drop the bad
    // entries rather than the list.
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function write(templates: SavedTemplate[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
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

/**
 * Whole videos the user kept as reusable starting points, sitting alongside the
 * built-in script templates in `scriptTemplates.ts`.
 *
 * The project library already stores finished videos, but opening one and
 * editing it EDITS that video — there was no way to say "this shape was good,
 * start a new one from it" without duplicating by hand. Same split as the
 * Scenes tab's "Your Scenes" above the blank scene types.
 */
export const useSavedTemplatesStore = create<SavedTemplatesState>((set, get) => ({
  templates: [],

  load: () => set({ templates: read() }),

  save: (project, name, description) => {
    const entry: SavedTemplate = { id: newId("tpl"), name, description, project, savedAt: Date.now() };
    const next = [entry, ...get().templates];
    write(next);
    set({ templates: next });
  },

  rename: (id, name) => {
    const next = get().templates.map((t) => (t.id === id ? { ...t, name } : t));
    write(next);
    set({ templates: next });
  },

  remove: (id) => {
    const next = get().templates.filter((t) => t.id !== id);
    write(next);
    set({ templates: next });
  },
}));
