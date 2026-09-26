import { create } from "zustand";
import { persist } from "zustand/middleware";

// Things about THIS browser, not about your work: which project was open last
// and how tall the timeline is. They live in localStorage (zustand's persist
// middleware), not in db/, so switching projects doesn't show up in git and
// another computer keeps its own.
type EditorPrefs = {
  lastOpenedProjectId?: string;
  timelineHeight?: number;
  set: (patch: Partial<Omit<EditorPrefs, "set">>) => void;
};

export const useEditorPrefs = create<EditorPrefs>()(
  persist((set) => ({ set: (patch) => set(patch) }), {
    name: "tikmaker.editor-prefs",
  }),
);
