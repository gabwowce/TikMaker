import { create } from "zustand";
import type { VideoProject } from "../../schema/project";
import type {
  Scene,
  SceneType,
  SceneBackground,
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
  TransitionPreset,
  SideContent,
  StepItem,
  RichHeadlineLine,
  Block,
  PositionedVisualEntry,
} from "../../schema/scene";
import type { VisualConfig } from "../../schema/visual";
import { createEmptyProject } from "../../schema/project";
import { parseProject } from "../../utils/normalizeProject";
import { getSceneDefinition } from "../../registries/sceneRegistry";
import { getScriptTemplate } from "../../registries/scriptTemplates";
import exampleProjectJson from "../../../projects/template-showcase.json";
import { naturalVisualSize } from "../../video/layout/visualMetrics";
import { poseAtFrame } from "../../video/layout/visualKeyframes";

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
        library[id] = parseProject(value);
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

function writeProjectFile(project: VideoProject) {
  if (typeof window === "undefined") return;
  void fetch("/api/save-json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "project", data: project }),
  }).catch(() => undefined);
}

function libraryIndexFrom(library: Library): { id: string; title: string }[] {
  return Object.values(library)
    .map((p) => ({ id: p.id, title: p.title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * Every `projects/*.json` in the repo, bundled at build time.
 *
 * These files are what git carries between machines — the editor writes one on
 * every save (`writeProjectFile`) and they are committed alongside the code.
 * Reading them here is what makes a fresh clone open with the same library it
 * had on the machine the work was done on; before this the editor only ever
 * looked at localStorage, so pulling the repo on a second computer showed the
 * bundled sample and none of your own videos.
 *
 * `import.meta.glob` rather than the dev server's API on purpose: it resolves
 * in a production build too, and it needs no request to be in flight before the
 * library can be shown.
 */
const diskProjectModules = import.meta.glob<{ default: unknown }>("../../../projects/*.json", { eager: true });

function readDiskProjects(): Library {
  const library: Library = {};
  for (const module of Object.values(diskProjectModules)) {
    try {
      const project = parseProject(module.default);
      library[project.id] = project;
    } catch {
      // One malformed file must not cost you the rest of the library.
    }
  }
  return library;
}

/**
 * Merges the repo's projects with the browser's.
 *
 * The disk copy wins unless the local one is strictly newer: a file you pulled
 * is a deliberate act, while localStorage is a cache that may predate it. The
 * one case where local must win is a reload that beats the debounced disk write
 * — there the browser genuinely holds the newest version. Projects that exist
 * only in localStorage (made before the disk API, or while it was unreachable)
 * are kept either way.
 */
function mergeLibraries(disk: Library, local: Library): Library {
  const merged: Library = { ...local };
  for (const [id, diskProject] of Object.entries(disk)) {
    const localProject = local[id];
    const localIsNewer = (localProject?.savedAt ?? 0) > (diskProject.savedAt ?? 0);
    if (!localProject || !localIsNewer) merged[id] = diskProject;
  }
  return merged;
}

function loadInitialState(): { project: VideoProject; library: Library } {
  const library = mergeLibraries(readDiskProjects(), readLibrary());
  // Written straight back so the merged view survives even if the session ends
  // before anything is edited — otherwise a fresh clone would re-merge from
  // scratch on every load and "Delete project" could never stick.
  writeLibrary(library);

  if (typeof window !== "undefined") {
    const lastOpenedId = window.localStorage.getItem(LAST_OPENED_KEY);
    if (lastOpenedId && library[lastOpenedId]) {
      return { project: library[lastOpenedId], library };
    }

    // Migrate the old single-project storage key if present.
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      try {
        const project = parseProject(JSON.parse(legacy));
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

  const fallback = parseProject(exampleProjectJson);
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
  canUndo: boolean;
  canRedo: boolean;
  playheadFrame: number;
  undo: () => void;
  redo: () => void;
  beginHistoryTransaction: () => void;
  endHistoryTransaction: () => void;
  setPlayheadFrame: (frame: number) => void;
  addAudioClip: (sfxId: string, from?: number) => void;
  updateAudioClip: (id: string, patch: Partial<NonNullable<VideoProject["audioClips"]>[number]>) => void;
  splitAudioClip: (id: string, at: number, resolvedDuration: number) => string | null;
  removeAudioClip: (id: string) => void;

  createProject: (title: string) => void;
  loadProject: (project: VideoProject) => void;
  useScriptTemplate: (templateId: string) => void;
  saveProject: () => void;
  /** Saves the CURRENT project under a new name as a separate entry, and keeps
   * editing that copy — "Save As". `saveProject` writes back to the same id, so
   * without this the only way to keep a variant was to hand-duplicate it. */
  saveProjectAs: (title: string) => void;
  exportProjectJson: () => string;
  updateProjectTitle: (title: string) => void;
  openProject: (id: string) => void;
  deleteProject: (id: string) => void;

  addScene: (type: SceneType) => void;
  /** Appends a fully-formed scene (from the saved-scene library) after the
   * selected one, so a reused layout lands where you're working rather than at
   * the end of the video. */
  insertScene: (scene: Scene) => void;
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
  updateSceneVisualKenBurns: (id: string, kenBurns: KenBurnsPreset | undefined) => void;
  updateSceneVisualSfx: (id: string, sfx: string | undefined) => void;
  updateSceneVisualExitSfx: (id: string, sfx: string | undefined) => void;
  updateSceneBackground: (id: string, background: SceneBackground) => void;
  /** Sets the SAME background on every scene — this app deliberately keeps one
   * background for the whole video (see CLAUDE.md), so background is edited
   * project-wide rather than per scene. */
  updateAllScenesBackground: (background: SceneBackground) => void;
  updateSceneEntrance: (id: string, entrance: EntrancePreset) => void;
  updateSceneExit: (id: string, exit: ExitPreset | undefined) => void;
  updateSceneExitDuration: (id: string, exitDuration: number) => void;
  /** Generic patch for the scene's `motion` object — use for the fields that
   * don't have (and don't need) a dedicated setter, e.g. slide distances. */
  updateSceneMotion: (id: string, patch: Partial<NonNullable<Scene["motion"]>>) => void;
  updateSceneSfx: (id: string, sfx: string | undefined) => void;
  updateSceneExitSfx: (id: string, sfx: string | undefined) => void;
  updateSceneTransition: (id: string, transition: TransitionPreset) => void;
  updateSceneStagger: (id: string, stagger: number) => void;
  updateSceneHighlights: (id: string, highlights: string[]) => void;
  updateSceneLeftRight: (id: string, side: "left" | "right", patch: Partial<SideContent>) => void;
  updateSceneItems: (id: string, items: StepItem[]) => void;
  updateSceneRichHeadline: (id: string, lines: RichHeadlineLine[]) => void;
  updateSceneBlocks: (id: string, blocks: Block[]) => void;
  updateSceneVisuals: (id: string, visuals: PositionedVisualEntry[]) => void;
  /** Pins the layer's CURRENT pose at `frame` as a keyframe (scene-relative),
   * or moves an existing keyframe on that frame to the pose given. Both the
   * panel's "+ Keyframe" button and a drag on the preview go through here, so
   * "what does adding a keyframe capture" has one answer. */
  addVisualKeyframe: (sceneId: string, entryId: string, frame: number, pose?: { x?: number; y?: number; scale?: number }) => void;
  updateVisualKeyframe: (sceneId: string, entryId: string, keyframeId: string, patch: { frame?: number; x?: number; y?: number; scale?: number }) => void;
  removeVisualKeyframe: (sceneId: string, entryId: string, keyframeId: string) => void;
  /** Copies this scene's primary visual onto the NEXT scene and wires both
   * sides of a `visualLink` group, so the same asset glides between the two
   * poses across the cut. Doing it by hand means getting four things right at
   * once (same asset, same groupId, explicit position on both, adjacency) —
   * this is the one-click version. No-op if there's no next scene or no visual. */
  linkVisualToNextScene: (id: string) => void;
  /** Same carry, for one freeform `content.visuals[]` layer: copies the entry
   * onto the next scene and links both, so the layer stays one continuous
   * element across the cut just like a primary visual. */
  linkLayerToNextScene: (sceneId: string, entryId: string) => void;
  /** Replaces a `corner-props` visual with one freeform layer per asset, so
   * each one gets its own position, scale, animation and carry — the composite
   * has no per-asset controls and can't be linked. */

  /** Which timeline object the object panel is editing. Editor state, kept
   * here beside `selectedSceneId` and `playheadFrame` so the timeline can draw
   * the selection and the panel can read it without a window event carrying the
   * id between them. */
  selectedObjectId: string | null;
  selectObject: (id: string | null) => void;
  selectScene: (id: string | null) => void;
  setActiveVisualSlot: (slot: VisualSlot) => void;
};

const initialState = loadInitialState();

type HistorySnapshot = { project: VideoProject; selectedSceneId: string | null };
const HISTORY_LIMIT = 100;
const undoStack: HistorySnapshot[] = [];
const redoStack: HistorySnapshot[] = [];
let applyingHistory = false;
let historyTransaction: HistorySnapshot | null = null;

function persist(project: VideoProject, library: Library): Library {
  // Stamped here rather than at each call site: `persist` is the ONE path that
  // writes a project, so this is the only place that can promise the disk copy
  // and the localStorage copy carry the same time.
  const stamped: VideoProject = { ...project, savedAt: Date.now() };
  const next = { ...library, [stamped.id]: stamped };
  writeLibrary(next);
  writeProjectFile(stamped);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LAST_OPENED_KEY, stamped.id);
  }
  return next;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: initialState.project,
  // A loaded video must immediately have an editable scene. Leaving this null
  // made both the inspector and the scene timeline disappear after refresh.
  selectedSceneId: initialState.project.scenes[0]?.id ?? null,
  activeVisualSlot: "main",
  libraryIndex: libraryIndexFrom(persist(initialState.project, initialState.library)),
  canUndo: false,
  canRedo: false,
  playheadFrame: 0,
  selectedObjectId: null,
  undo: () => {
    const previous = undoStack.pop();
    if (!previous) return;
    const current = get();
    redoStack.push({ project: current.project, selectedSceneId: current.selectedSceneId });
    applyingHistory = true;
    set({
      project: previous.project,
      selectedSceneId: previous.selectedSceneId,
      canUndo: undoStack.length > 0,
      canRedo: true,
    });
    applyingHistory = false;
  },
  redo: () => {
    const next = redoStack.pop();
    if (!next) return;
    const current = get();
    undoStack.push({ project: current.project, selectedSceneId: current.selectedSceneId });
    applyingHistory = true;
    set({
      project: next.project,
      selectedSceneId: next.selectedSceneId,
      canUndo: true,
      canRedo: redoStack.length > 0,
    });
    applyingHistory = false;
  },
  beginHistoryTransaction: () => {
    if (historyTransaction) return;
    const state = get();
    historyTransaction = { project: state.project, selectedSceneId: state.selectedSceneId };
  },
  endHistoryTransaction: () => {
    if (!historyTransaction) return;
    const before = historyTransaction;
    historyTransaction = null;
    const project = get().project;
    if (before.project === project) return;
    undoStack.push(before);
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack.length = 0;
    // Dragging updates the live preview continuously, but persistence happens
    // once here, after pointer-up, with only the final coordinates/timing.
    const library = persist(project, readLibrary());
    set({ canUndo: true, canRedo: false, libraryIndex: libraryIndexFrom(library) });
  },
  setPlayheadFrame: (playheadFrame) => set({ playheadFrame: Math.max(0, Math.round(playheadFrame)) }),
  addAudioClip: (sfxId, from) => set((state) => ({
    project: {
      ...state.project,
      audioClips: [
        ...(state.project.audioClips ?? []),
        { id: `audio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, sfxId, from: Math.max(0, Math.round(from ?? state.playheadFrame)), volume: 1 },
      ],
    },
  })),
  updateAudioClip: (id, patch) => set((state) => ({
    project: { ...state.project, audioClips: (state.project.audioClips ?? []).map((clip) => clip.id === id ? { ...clip, ...patch } : clip) },
  })),
  splitAudioClip: (id, at, resolvedDuration) => {
    const state = get();
    const clip = (state.project.audioClips ?? []).find((entry) => entry.id === id);
    if (!clip) return null;
    const offset = Math.round(at - clip.from);
    const duration = Math.max(1, Math.round(clip.durationInFrames ?? resolvedDuration));
    if (offset <= 0 || offset >= duration) return null;
    const nextId = `audio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set({
      project: {
        ...state.project,
        audioClips: (state.project.audioClips ?? []).flatMap((entry) => entry.id === id
          ? [
              { ...entry, durationInFrames: offset },
              { ...entry, id: nextId, from: Math.round(at), startFrom: (entry.startFrom ?? 0) + offset, durationInFrames: duration - offset },
            ]
          : [entry]),
      },
    });
    return nextId;
  },
  removeAudioClip: (id) => set((state) => ({
    project: { ...state.project, audioClips: (state.project.audioClips ?? []).filter((clip) => clip.id !== id) },
  })),

  createProject: (title) => {
    const project = createEmptyProject(`project-${Date.now()}`, title);
    const library = persist(project, readLibrary());
    set({ project, selectedSceneId: null, libraryIndex: libraryIndexFrom(library) });
  },

  loadProject: (project) => {
    const library = persist(project, readLibrary());
    set({ project, selectedSceneId: project.scenes[0]?.id ?? null, libraryIndex: libraryIndexFrom(library) });
  },

  useScriptTemplate: (templateId) => {
    const template = getScriptTemplate(templateId);
    if (!template) return;
    // Clone with a fresh id so re-using the same template (or opening it twice)
    // starts a new project instead of overwriting a previous one built from it.
    const project: VideoProject = {
      ...template.project,
      id: `${template.id}-${Date.now().toString(36)}`,
      title: template.name,
    };
    const library = persist(project, readLibrary());
    set({ project, selectedSceneId: project.scenes[0]?.id ?? null, libraryIndex: libraryIndexFrom(library) });
  },

  saveProject: () => {
    const library = persist(get().project, readLibrary());
    set({ libraryIndex: libraryIndexFrom(library) });
  },

  saveProjectAs: (title) => {
    // A fresh id is what makes this a copy rather than a rename — `persist`
    // keys the library by project id, so reusing the old one would overwrite
    // the video this was branched from.
    const project: VideoProject = { ...get().project, id: `project-${Date.now().toString(36)}`, title };
    const library = persist(project, readLibrary());
    set({ project, libraryIndex: libraryIndexFrom(library) });
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
    set((state) => {
      // Keep the whole video on one background — a new scene inherits whatever
      // the rest of the project is already using instead of resetting to a
      // hardcoded default.
      const background = state.project.scenes[0]?.background ?? "solid-dark";
      const newScene: Scene = {
        id: makeSceneId(),
        type,
        // Left unset on purpose — a new scene is auto-paced from its VO/text
        // (see `resolveSceneDuration`) until someone pins an explicit length.
        durationSeconds: undefined,
        background,
        content: { headline: "New headline" },
        motion: { entrance: "fade", transition: "cut" },
      };
      return {
        project: { ...state.project, scenes: [...state.project.scenes, newScene] },
        selectedSceneId: newScene.id,
      };
    });
  },

  insertScene: (scene) => {
    set((state) => {
      const scenes = [...state.project.scenes];
      const at = scenes.findIndex((s) => s.id === state.selectedSceneId);
      const index = at === -1 ? scenes.length : at + 1;
      scenes.splice(index, 0, scene);
      return { project: { ...state.project, scenes }, selectedSceneId: scene.id };
    });
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

  updateSceneVisualKenBurns: (id, kenBurns) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, visualKenBurns: kenBurns } : s)),
      },
    }));
  },

  updateSceneVisualSfx: (id, sfx) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, visualSfx: sfx } : s)),
      },
    }));
  },

  updateSceneVisualExitSfx: (id, sfx) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, visualExitSfx: sfx } : s)),
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

  updateAllScenesBackground: (background) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => ({ ...s, background })),
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

  updateSceneMotion: (id, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, motion: { ...s.motion, ...patch } } : s)),
      },
    }));
  },

  updateSceneSfx: (id, sfx) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, motion: { ...s.motion, sfx } } : s)),
      },
    }));
  },

  updateSceneExitSfx: (id, sfx) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => (s.id === id ? { ...s, motion: { ...s.motion, exitSfx: sfx } } : s)),
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

  linkVisualToNextScene: (id) => {
    set((state) => {
      const index = state.project.scenes.findIndex((s) => s.id === id);
      const scene = state.project.scenes[index];
      const next = state.project.scenes[index + 1];
      if (!scene?.visual || !next) return state;

      // EXTEND the chain this scene is already part of rather than starting a
      // fresh group. Minting a new groupId here silently kicked the previous
      // scene out of the chain — pressing the button down a run of scenes left
      // scene 1 orphaned while 2+3 carried, so a recording restarted at the
      // second cut instead of playing straight through.
      const groupId = scene.visualLink?.groupId ?? `${scene.id}-glide`;

      const fromPosition = scene.visualPosition ?? { x: 50, y: 55 };
      const fromScale = scene.visualScale ?? 1;

      // The pose has to CHANGE across the cut or the carry is invisible. Move to
      // the opposite band from wherever it currently sits, and keep shrinking —
      // that reads as one element settling out of the way as the video goes on.
      // Centered horizontally on purpose: an off-center default pushes a wide
      // visual past the side-safe margin and greets the user with an overflow
      // warning they didn't ask for. Drag it sideways from here for a corner.
      const toPosition = { x: 50, y: fromPosition.y > 40 ? 20 : 80 };
      const toScale = Math.max(0.2, Number((fromScale * 0.5).toFixed(2)));

      const scenes = [...state.project.scenes];
      scenes[index] = {
        ...scene,
        visualPosition: fromPosition,
        visualScale: fromScale,
        visualLink: { groupId },
        // The visual must simply hold its pose until the cut — the whole move
        // is played by the next scene's glide-in. Any exit here would animate
        // the thing that's supposed to be carried across.
        visualExit: undefined,
        visualExitDuration: undefined,
        visualExitDistance: undefined,
      };
      scenes[index + 1] = {
        ...next,
        visual: scene.visual,
        visualPosition: toPosition,
        visualScale: toScale,
        visualLink: { groupId },
        // Same reasoning on the incoming side: the glide replaces the entrance.
        visualEntrance: undefined,
        visualEntranceDistance: undefined,
        motion: {
          ...next.motion,
          // A slide transition translates the WHOLE incoming frame, so the
          // glide would be riding a frame that's itself moving — two motions
          // at once and the carry stops reading as one continuous element.
          transition: "cut",
        },
      };
      return { project: { ...state.project, scenes } };
    });
  },

  linkLayerToNextScene: (sceneId, entryId) => {
    set((state) => {
      const index = state.project.scenes.findIndex((s) => s.id === sceneId);
      const scene = state.project.scenes[index];
      const next = state.project.scenes[index + 1];
      const entry = scene?.content.visuals?.find((v) => v.id === entryId);
      if (!scene || !next || !entry) return state;

      // Extend the chain this layer already belongs to — minting a fresh id
      // here would drop the earlier scenes out of it (see linkVisualToNextScene).
      const groupId = entry.link?.groupId ?? `${scene.id}-${entry.id}-glide`;
      const toScale = Math.max(0.2, Number(((entry.scale ?? 1) * 0.6).toFixed(2)));

      const carriedOver = (next.content.visuals ?? []).filter((v) => v.link?.groupId !== groupId);
      // `content.visuals` is capped at 6 by the schema — silently pushing a 7th
      // would only surface as a validation error on export.
      if (carriedOver.length >= 6) return state;

      const scenes = [...state.project.scenes];
      scenes[index] = {
        ...scene,
        content: {
          ...scene.content,
          visuals: scene.content.visuals?.map((v) =>
            v.id === entry.id
              ? { ...v, link: { groupId }, exit: undefined, exitDuration: undefined, exitDistance: undefined, exitSfx: undefined }
              : v
          ),
        },
      };
      scenes[index + 1] = {
        ...next,
        content: {
          ...next.content,
          visuals: [
            ...carriedOver,
            {
              ...entry,
              id: `${entry.id}-${next.id}`,
              // The pose has to change or the carry is invisible.
              x: entry.x,
              y: entry.y > 50 ? 20 : 80,
              scale: toScale,
              link: { groupId },
              entrance: undefined,
              // This scene becomes the chain's LAST member (until extended
              // further), so it's the one whose exit will actually play. The
              // source entry's own exit (if any) meant "fade out at the end of
              // THAT scene" — a different, now-meaningless thing — so carrying
              // it forward unedited would either silently do nothing (if this
              // stops being last) or fire from a value the author never chose
              // for this spot. Start clean; the Inspector only shows Out
              // controls on the actual last member, so this is where they'd
              // set it anyway.
              exit: undefined,
              exitDuration: undefined,
              exitDistance: undefined,
              exitSfx: undefined,
            },
          ],
        },
        motion: { ...next.motion, transition: "cut" },
      };
      return { project: { ...state.project, scenes } };
    });
  },

  addVisualKeyframe: (sceneId, entryId, frame, pose) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((scene) => {
          if (scene.id !== sceneId) return scene;
          const visuals = (scene.content.visuals ?? []).map((entry) => {
            if (entry.id !== entryId) return entry;
            // The pose it holds RIGHT NOW is the honest thing to capture: the
            // author positioned it, hit the button, and expects the layer not to
            // jump. `poseAtFrame` already answers that for a keyframed layer,
            // and falls back to the base pose for one with no path yet.
            const current = poseAtFrame(entry, frame);
            const next = {
              id: `kf-${Math.random().toString(36).slice(2, 9)}`,
              frame,
              x: pose?.x ?? current.x,
              y: pose?.y ?? current.y,
              scale: pose?.scale ?? current.scale ?? entry.scale,
            };
            const existing = entry.keyframes ?? [];
            const at = existing.findIndex((keyframe) => keyframe.frame === frame);
            const keyframes =
              at === -1
                ? [...existing, next].sort((a, b) => a.frame - b.frame)
                : existing.map((keyframe, index) => (index === at ? { ...keyframe, ...next, id: keyframe.id } : keyframe));
            return { ...entry, keyframes };
          });
          return { ...scene, content: { ...scene.content, visuals } };
        }),
      },
    }));
  },

  updateVisualKeyframe: (sceneId, entryId, keyframeId, patch) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((scene) =>
          scene.id === sceneId
            ? {
                ...scene,
                content: {
                  ...scene.content,
                  visuals: (scene.content.visuals ?? []).map((entry) =>
                    entry.id === entryId
                      ? {
                          ...entry,
                          keyframes: (entry.keyframes ?? [])
                            .map((keyframe) => (keyframe.id === keyframeId ? { ...keyframe, ...patch } : keyframe))
                            .sort((a, b) => a.frame - b.frame),
                        }
                      : entry
                  ),
                },
              }
            : scene
        ),
      },
    }));
  },

  removeVisualKeyframe: (sceneId, entryId, keyframeId) => {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((scene) =>
          scene.id === sceneId
            ? {
                ...scene,
                content: {
                  ...scene.content,
                  visuals: (scene.content.visuals ?? []).map((entry) => {
                    if (entry.id !== entryId) return entry;
                    const keyframes = (entry.keyframes ?? []).filter((keyframe) => keyframe.id !== keyframeId);
                    // An empty array would keep re-serialising as `[]` in every
                    // saved project; unset is what "this layer has no path" is.
                    return { ...entry, keyframes: keyframes.length ? keyframes : undefined };
                  }),
                },
              }
            : scene
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

  selectObject: (id) => set({ selectedObjectId: id }),
  // Changing scene drops the object selection: the id addresses an element
  // inside the scene that was open, and it means nothing in the next one.
  selectScene: (id) => set({ selectedSceneId: id, selectedObjectId: null }),
  setActiveVisualSlot: (slot) => set({ activeVisualSlot: slot }),
}));

// Record every edit within a project. Opening/creating another project starts a
// fresh history so Ctrl+Z can never unexpectedly jump to a different video.
useProjectStore.subscribe((state, previous) => {
  if (applyingHistory || state.project === previous.project) return;
  if (historyTransaction) return;
  if (state.project.id !== previous.project.id) {
    undoStack.length = 0;
    redoStack.length = 0;
    useProjectStore.setState({ canUndo: false, canRedo: false });
    return;
  }
  undoStack.push({ project: previous.project, selectedSceneId: previous.selectedSceneId });
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack.length = 0;
  useProjectStore.setState({ canUndo: true, canRedo: false });
});

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "z") {
      event.preventDefault();
      if (event.shiftKey) useProjectStore.getState().redo();
      else useProjectStore.getState().undo();
    } else if (key === "y") {
      event.preventDefault();
      useProjectStore.getState().redo();
    }
  });
}

// Debounced auto-save: every change to `project` gets written to the local library
// so a reload (or crash) never silently loses work, without needing an explicit Save click.
if (typeof window !== "undefined") {
  let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
  useProjectStore.subscribe((state, prevState) => {
    if (state.project === prevState.project) return;
    // Pointer drags are persisted by endHistoryTransaction, once the pointer is
    // released. Skipping intermediate positions also keeps disk JSON clean.
    if (historyTransaction) return;
    // localStorage is synchronous: protect every keystroke immediately. Disk
    // writes remain debounced below so typing does not hammer the filesystem.
    const immediateLibrary = { ...readLibrary(), [state.project.id]: state.project };
    writeLibrary(immediateLibrary);
    window.localStorage.setItem(LAST_OPENED_KEY, state.project.id);
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      const project = useProjectStore.getState().project;
      writeProjectFile(project);
      useProjectStore.setState({ libraryIndex: libraryIndexFrom(readLibrary()) });
    }, 800);
  });
  window.addEventListener("pagehide", () => {
    const project = useProjectStore.getState().project;
    navigator.sendBeacon?.("/api/save-json", JSON.stringify({ kind: "project", data: project }));
  });
}
