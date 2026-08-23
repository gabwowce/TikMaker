import { create } from "zustand";
import type { VideoProject } from "../../schema/project";
import type {
  Scene,
  SceneType,
  BackgroundId,
  EntrancePreset,
  ExitPreset,
  TransitionPreset,
  SideContent,
  StepItem,
  RichHeadlineLine,
  Block,
  PositionedVisualEntry,
} from "../../schema/scene";
import type { VisualConfig } from "../../schema/visual";
import { videoProjectSchema, createEmptyProject } from "../../schema/project";
import { getSceneDefinition } from "../../registries/sceneRegistry";
import exampleProjectJson from "../../../projects/template-showcase.json";

const LEGACY_STORAGE_KEY = "tikmaker.project";
const LIBRARY_KEY = "tikmaker.library";
const LAST_OPENED_KEY = "tikmaker.lastOpenedId";

type Library = Record<string, VideoProject>;

function readLibrary(): Library {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const library: Library = {};
    for (const [id, value] of Object.entries(parsed)) {
      try {
        library[id] = videoProjectSchema.parse(value);
      } catch {
        // skip corrupt entry
      }
    }
    return library;
  } catch {
    return {};
  }
}

function writeLibrary(library: Library) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
}

function libraryIndexFrom(library: Library): { id: string; title: string }[] {
  return Object.values(library)
    .map((p) => ({ id: p.id, title: p.title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function loadInitialState(): { project: VideoProject; library: Library } {
  const library = readLibrary();

  if (typeof window !== "undefined") {
    const lastOpenedId = window.localStorage.getItem(LAST_OPENED_KEY);
    if (lastOpenedId && library[lastOpenedId]) {
      return { project: library[lastOpenedId], library };
    }

    // Migrate the old single-project storage key if present.
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      try {
        const project = videoProjectSchema.parse(JSON.parse(legacy));
        library[project.id] = project;
        writeLibrary(library);
        window.localStorage.setItem(LAST_OPENED_KEY, project.id);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        return { project, library };
      } catch {
        // fall through
      }
    }
  }

  const fallback = videoProjectSchema.parse(exampleProjectJson);
  return { project: fallback, library };
}

function makeSceneId(): string {
  return `scene-${Math.random().toString(36).slice(2, 9)}`;
}

export type VisualSlot = "main" | "left" | "right";

export type LibraryEntry = { id: string; title: string };

type ProjectStore = {
  project: VideoProject;
  selectedSceneId: string | null;
  activeVisualSlot: VisualSlot;
  libraryIndex: LibraryEntry[];

  createProject: (title: string) => void;
  loadProject: (project: VideoProject) => void;
  saveProject: () => void;
  exportProjectJson: () => string;
  updateProjectTitle: (title: string) => void;
  openProject: (id: string) => void;
  deleteProject: (id: string) => void;

  addScene: (type: SceneType) => void;
  removeScene: (id: string) => void;
  duplicateScene: (id: string) => void;
  moveScene: (id: string, direction: "up" | "down") => void;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  updateSceneContent: (id: string, content: Partial<Scene["content"]>) => void;
  updateSceneVisual: (id: string, visual: VisualConfig | undefined) => void;
  updateSceneVisualPosition: (id: string, position: { x: number; y: number } | undefined) => void;
  updateSceneVisualEntrance: (id: string, entrance: EntrancePreset | undefined) => void;
  updateSceneVisualExit: (id: string, exit: ExitPreset | undefined) => void;
  updateSceneVisualExitDuration: (id: string, exitDuration: number) => void;
  updateSceneBackground: (id: string, background: BackgroundId) => void;
  updateSceneEntrance: (id: string, entrance: EntrancePreset) => void;
  updateSceneExit: (id: string, exit: ExitPreset | undefined) => void;
  updateSceneExitDuration: (id: string, exitDuration: number) => void;
  updateSceneTransition: (id: string, transition: TransitionPreset) => void;
  updateSceneStagger: (id: string, stagger: number) => void;
  updateSceneBadge: (id: string, badge: string) => void;
  updateSceneHighlights: (id: string, highlights: string[]) => void;
  updateSceneLeftRight: (id: string, side: "left" | "right", patch: Partial<SideContent>) => void;
  updateSceneItems: (id: string, items: StepItem[]) => void;
  updateSceneRichHeadline: (id: string, lines: RichHeadlineLine[]) => void;
  updateSceneBlocks: (id: string, blocks: Block[]) => void;
  updateSceneVisuals: (id: string, visuals: PositionedVisualEntry[]) => void;

  selectScene: (id: string | null) => void;
  setActiveVisualSlot: (slot: VisualSlot) => void;
};

const initialState = loadInitialState();

function persist(project: VideoProject, library: Library): Library {
  const next = { ...library, [project.id]: project };
  writeLibrary(next);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LAST_OPENED_KEY, project.id);
  }
  return next;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: initialState.project,
  selectedSceneId: null,
  activeVisualSlot: "main",
  libraryIndex: libraryIndexFrom(persist(initialState.project, initialState.library)),

  createProject: (title) => {
    const project = createEmptyProject(`project-${Date.now()}`, title);
    const library = persist(project, readLibrary());
    set({ project, selectedSceneId: null, libraryIndex: libraryIndexFrom(library) });
  },

  loadProject: (project) => {
    const library = persist(project, readLibrary());
    set({ project, selectedSceneId: project.scenes[0]?.id ?? null, libraryIndex: libraryIndexFrom(library) });
  },

  saveProject: () => {
    const library = persist(get().project, readLibrary());
    set({ libraryIndex: libraryIndexFrom(library) });
  },

  exportProjectJson: () => JSON.stringify(get().project, null, 2),

  updateProjectTitle: (title) => {
    set((state) => ({ project: { ...state.project, title } }));
  },

  openProject: (id) => {
    const library = readLibrary();
    const project = library[id];
    if (!project) return;
    if (typeof window !== "undefined") window.localStorage.setItem(LAST_OPENED_KEY, id);
    set({ project, selectedSceneId: project.scenes[0]?.id ?? null });
  },

  deleteProject: (id) => {
    const library = readLibrary();
    delete library[id];
    writeLibrary(library);
    set({ libraryIndex: libraryIndexFrom(library) });

    if (get().project.id === id) {
      const remaining = Object.values(library)[0];
      if (remaining) {
        get().openProject(remaining.id);
      } else {
        get().createProject("Untitled project");
      }
    }
  },

  addScene: (type) => {
    const def = getSceneDefinition(type);
    const newScene: Scene = {
      id: makeSceneId(),
      type,
      durationSeconds: def.defaultDurationSeconds,
      background: "solid-dark",
      content: { headline: "New headline" },
      motion: { entrance: "fade", transition: "cut" },
    };
    set((state) => ({
      project: { ...state.project, scenes: [...state.project.scenes, newScene] },
      selectedSceneId: newScene.id,
    }));
  },

  removeScene: (id) => {
    set((state) => ({
      project: { ...state.project, scenes: state.project.scenes.filter((s) => s.id !== id) },
      selectedSceneId: state.selectedSceneId === id ? null : state.selectedSceneId,
    }));
  },

  duplicateScene: (id) => {
    set((state) => {
      const index = state.project.scenes.findIndex((s) => s.id === id);
      if (index === -1) return state;
      const clone: Scene = { ...state.project.scenes[index], id: makeSceneId() };
      const scenes = [...state.project.scenes];
      scenes.splice(index + 1, 0, clone);
      return { project: { ...state.project, scenes }, selectedSceneId: clone.id };
    });
  },

  moveScene: (id, direction) => {
    set((state) => {
      const scenes = [...state.project.scenes];
      const index = scenes.findIndex((s) => s.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || targetIndex < 0 || targetIndex >= scenes.length) return state;
      [scenes[index], scenes[targetIndex]] = [scenes[targetIndex], scenes[index]];
      return { project: { ...state.project, scenes } };
    });
  },

  updateScene: (id, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      },
    }));
  },

  updateSceneContent: (id, contentPatch) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, content: { ...s.content, ...contentPatch } } : s
        ),
      },
    }));
  },

  updateSceneVisual: (id, visual) => {
    const slot = get().activeVisualSlot;
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => {
          if (s.id !== id) return s;
          if (slot === "main") return { ...s, visual };
          const sideKey = slot; // "left" | "right"
          return { ...s, content: { ...s.content, [sideKey]: { ...s.content[sideKey], visual } } };
        }),
      },
    }));
  },

  updateSceneVisualPosition: (id, position) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, visualPosition: position } : s)),
      },
    }));
  },

  updateSceneVisualEntrance: (id, entrance) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, visualEntrance: entrance } : s)),
      },
    }));
  },

  updateSceneVisualExit: (id, exit) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, visualExit: exit } : s)),
      },
    }));
  },

  updateSceneVisualExitDuration: (id, exitDuration) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, visualExitDuration: exitDuration } : s)),
      },
    }));
  },

  updateSceneBackground: (id, background) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, background } : s)),
      },
    }));
  },

  updateSceneEntrance: (id, entrance) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, motion: { ...s.motion, entrance } } : s
        ),
      },
    }));
  },

  updateSceneTransition: (id, transition) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, motion: { ...s.motion, transition } } : s
        ),
      },
    }));
  },

  updateSceneExit: (id, exit) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, motion: { ...s.motion, exit } } : s)),
      },
    }));
  },

  updateSceneExitDuration: (id, exitDuration) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, motion: { ...s.motion, exitDuration } } : s
        ),
      },
    }));
  },

  updateSceneStagger: (id, stagger) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, motion: { ...s.motion, stagger } } : s
        ),
      },
    }));
  },

  updateSceneBadge: (id, badge) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, content: { ...s.content, badge } } : s
        ),
      },
    }));
  },

  updateSceneHighlights: (id, highlights) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, content: { ...s.content, highlights } } : s
        ),
      },
    }));
  },

  updateSceneLeftRight: (id, side, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, content: { ...s.content, [side]: { ...s.content[side], ...patch } } } : s
        ),
      },
    }));
  },

  updateSceneItems: (id, items) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, content: { ...s.content, items } } : s)),
      },
    }));
  },

  updateSceneRichHeadline: (id, lines) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, content: { ...s.content, richHeadline: lines } } : s
        ),
      },
    }));
  },

  updateSceneBlocks: (id, blocks) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, content: { ...s.content, blocks } } : s
        ),
      },
    }));
  },

  updateSceneVisuals: (id, visuals) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, content: { ...s.content, visuals } } : s
        ),
      },
    }));
  },

  selectScene: (id) => set({ selectedSceneId: id }),
  setActiveVisualSlot: (slot) => set({ activeVisualSlot: slot }),
}));

// Debounced auto-save: every change to `project` gets written to the local library
// so a reload (or crash) never silently loses work, without needing an explicit Save click.
if (typeof window !== "undefined") {
  let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
  useProjectStore.subscribe((state, prevState) => {
    if (state.project === prevState.project) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      const library = persist(useProjectStore.getState().project, readLibrary());
      useProjectStore.setState({ libraryIndex: libraryIndexFrom(library) });
    }, 800);
  });
}
