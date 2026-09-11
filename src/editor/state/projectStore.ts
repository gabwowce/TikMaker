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
  ScenePlanRole,
  Block,
  PositionedVisualEntry,
} from "../../schema/scene";
import type { VisualConfig } from "../../schema/visual";
import { createEmptyProject } from "../../schema/project";
import { parseProject } from "../../utils/normalizeProject";
import { getSceneDefinition } from "../../registries/sceneRegistry";
import { getScriptTemplate } from "../../registries/scriptTemplates";
import exampleProjectJson from "../../templates/template-showcase.json";
import { naturalVisualSize } from "../../video/layout/visualMetrics";
import { poseAtFrame, type KeyframeProperty } from "../../video/layout/visualKeyframes";
import { readDisk, scheduleSave, saveNow, deleteEntry, usePreferences } from "./fileLibrary";
import { getSfx } from "../../registries/sfxRegistry";
import { cachedAudioDuration } from "../timeline/useAudioWaveforms";

type Library = Record<string, VideoProject>;

/**
 * The open library, in memory.
 *
 * Not a cache of anything — `projects/*.json` is the storage, this is just the
 * parsed view of it for the current session. The store used to keep a second
 * copy in localStorage and reconcile the two by timestamp on startup; see
 * `fileLibrary.ts` for why that reconciliation could not be made correct.
 */
let library: Library = {};

function readLibrary(): Library {
  return library;
}

function writeLibrary(next: Library) {
  library = next;
}

function libraryIndexFrom(library: Library): { id: string; title: string; collection?: string }[] {
  return Object.values(library)
    .map((p) => ({ id: p.id, title: p.title, collection: p.collection }))
    .sort((a, b) => (a.collection ?? "").localeCompare(b.collection ?? "") || a.title.localeCompare(b.title));
}

function loadInitialState(): { project: VideoProject; library: Library } {
  const library: Library = {};
  for (const project of readDisk("project", parseProject)) library[project.id] = project;
  writeLibrary(library);

  // A project just restored from the trash should be the one that opens, not
  // whatever was last edited — restoring it IS the intent to look at it.
  const restored = typeof window === "undefined" ? null : window.localStorage.getItem("tikmaker.reopenAfterRestore");
  if (restored) {
    window.localStorage.removeItem("tikmaker.reopenAfterRestore");
    if (library[restored]) return { project: library[restored], library };
  }

  const lastOpenedId = usePreferences.getState().lastOpenedProjectId;
  if (lastOpenedId && library[lastOpenedId]) return { project: library[lastOpenedId], library };

  const first = Object.values(library)[0];
  if (first) return { project: first, library };

  // Nothing on disk at all (a stripped checkout): open the bundled sample so
  // the editor always has something to show.
  return { project: parseProject(exampleProjectJson), library };
}

function rememberLastOpened(id: string) {
  usePreferences.getState().set({ lastOpenedProjectId: id });
}

function makeSceneId(): string {
  return `scene-${Math.random().toString(36).slice(2, 9)}`;
}

function planRoleForSceneType(type: SceneType): ScenePlanRole {
  if (type === "screen-demo") return "demo";
  if (type === "takeaway") return "payoff";
  if (type === "hook-centered") return "hook";
  if (type === "hook-visual") return "reveal";
  return "benefit";
}

export type VisualSlot = "main" | "left" | "right";

export type LibraryEntry = { id: string; title: string; collection?: string };

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
  updateProjectStoryPlan: (patch: Partial<NonNullable<VideoProject["storyPlan"]>>) => void;
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
  addVisualKeyframe: (
    sceneId: string,
    entryId: string,
    frame: number,
    /** Which track the keyframe belongs to. Position and scale are separate
     * timelines (see `visualKeyframes.ts`), so a keyframe pins one of them —
     * writing both would make every scale change also freeze the position. */
    property: KeyframeProperty,
    pose?: { x?: number; y?: number; scale?: number }
  ) => void;
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
  /** Everything the timeline has selected. Always contains `selectedObjectId`
   * when there is one; a plain click collapses it to a single entry. */
  selectedObjectIds: string[];
  selectObject: (id: string | null) => void;
  /** Ctrl/Cmd-click on a timeline clip — see the implementation. */
  toggleObjectSelection: (id: string) => void;
  /** Selects exactly this set, e.g. everything a multi-object paste created. */
  selectObjects: (ids: string[]) => void;
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
/** When the open transaction started. A transaction is a claim about a gesture
 * that is still happening, and no gesture lasts this long — see
 * `endStaleHistoryTransaction`. */
let historyTransactionAt = 0;
const HISTORY_TRANSACTION_TIMEOUT = 2000;

/**
 * Closes a transaction that was opened and never closed.
 *
 * A transaction is opened on pointer-down/key-down and closed on the matching
 * up. Those do not always pair: pressing Tab on a slider fires `keydown` on the
 * slider and `keyup` on whatever the focus moved to, and a component that
 * unmounts mid-drag never sees its own pointer-up at all. The pair is best
 * effort, so the only safe design is one where a missing `end` costs nothing.
 *
 * It used to cost everything. `historyTransaction` gated the autosave
 * subscription as well as undo grouping, so one unmatched `begin` silently
 * stopped BOTH for the rest of the session while the save badge still read
 * "saved". Autosave no longer consults it at all (see the subscription at the
 * bottom of this file); this watchdog is the second line of defence, keeping
 * undo from accumulating one enormous step.
 */
function endStaleHistoryTransaction() {
  if (!historyTransaction) return;
  if (Date.now() - historyTransactionAt < HISTORY_TRANSACTION_TIMEOUT) return;
  useProjectStore.getState().endHistoryTransaction();
}

/** The ONE path that writes a project: updates the in-memory library and
 * queues the file write. Everything else in this store goes through it. */
function persist(project: VideoProject, library: Library): Library {
  const stamped: VideoProject = { ...project, savedAt: Date.now() };
  const next = { ...library, [stamped.id]: stamped };
  writeLibrary(next);
  scheduleSave("project", stamped);
  rememberLastOpened(stamped.id);
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
  selectedObjectIds: [],
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
    // A gesture that opens a second transaction without closing the first is
    // the stuck case; take the newer one rather than ignoring it, so the undo
    // step covers the gesture actually in progress.
    endStaleHistoryTransaction();
    if (historyTransaction) return;
    const state = get();
    historyTransaction = { project: state.project, selectedSceneId: state.selectedSceneId };
    historyTransactionAt = Date.now();
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
    // Persistence is NOT done here. The whole gesture has been reaching disk
    // all along through the autosave subscription, coalesced by `scheduleSave`'s
    // debounce; this only closes the undo step.
    set({ canUndo: true, canRedo: false });
  },
  setPlayheadFrame: (playheadFrame) => set({ playheadFrame: Math.max(0, Math.round(playheadFrame)) }),
  addAudioClip: (sfxId, from) => set((state) => ({
    project: {
      ...state.project,
      audioClips: [
        ...(state.project.audioClips ?? []),
        {
          id: `audio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          sfxId,
          from: Math.max(0, Math.round(from ?? state.playheadFrame)),
          volume: 1,
          // Stamped here, in the ONE function every "add this sound" path goes
          // through, rather than at the six call sites that have a waveform in
          // scope. An unset length is counted as a single frame by
          // `projectDurationInFrames`, so a voice line placed near the end left
          // the composition ending mid-sentence — and the looping Player then
          // started the first line over the top of it. Undefined when the file
          // has not been decoded yet, which is the old behaviour; in practice
          // the library drew its waveform before this button could be clicked.
          durationInFrames: cachedAudioDuration(getSfx(sfxId)?.src),
        },
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
    // The explicit button means "be on disk now", so it skips the debounce.
    const project = get().project;
    const library = { ...readLibrary(), [project.id]: { ...project, savedAt: Date.now() } };
    writeLibrary(library);
    void saveNow("project", library[project.id]);
    rememberLastOpened(project.id);
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

  updateProjectStoryPlan: (patch) => {
    set((state) => ({ project: { ...state.project, storyPlan: { ...state.project.storyPlan, ...patch } } }));
  },

  openProject: (id) => {
    const library = readLibrary();
    const project = library[id];
    if (!project) return;
    rememberLastOpened(id);
    set({ project, selectedSceneId: project.scenes[0]?.id ?? null });
  },

  deleteProject: (id) => {
    const library = { ...readLibrary() };
    delete library[id];
    writeLibrary(library);
    // Without this the file stayed on disk and the project came back on the
    // next reload — a "delete" that undoes itself.
    void deleteEntry("project", id).catch(() => undefined);
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
        plan: { role: planRoleForSceneType(type), purpose: def.description },
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
      const inserted = scene.plan ? scene : { ...scene, plan: { role: planRoleForSceneType(scene.type) } };
      scenes.splice(index, 0, inserted);
      return { project: { ...state.project, scenes }, selectedSceneId: inserted.id };
    });
  },

  removeScene: (id) => {
    set((state) => {
      return {
        project: { ...state.project, scenes: state.project.scenes.filter((s) => s.id !== id) },
        selectedSceneId: state.selectedSceneId === id ? null : state.selectedSceneId,
      };
    });
  },

  duplicateScene: (id) => {
    set((state) => {
      const index = state.project.scenes.findIndex((s) => s.id === id);
      if (index === -1) return state;
      const source = state.project.scenes[index];
      const clone: Scene = { ...source, id: makeSceneId(), storyboardBeatId: undefined };
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

  addVisualKeyframe: (sceneId, entryId, frame, property, pose) => {
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
            // ONLY the fields of this property. A keyframe that also wrote the
            // other one would silently pin it, and the two tracks would stop
            // being independent the first time you touched either.
            const pinned =
              property === "scale"
                ? { scale: pose?.scale ?? current.scale ?? entry.scale ?? 1 }
                : { x: pose?.x ?? current.x, y: pose?.y ?? current.y };
            const existing = entry.keyframes ?? [];
            // Merged onto a keyframe already sitting on this frame, so position
            // and scale can share one diamond when they happen to coincide.
            const at = existing.findIndex((keyframe) => keyframe.frame === frame);
            const keyframes =
              at === -1
                ? [...existing, { id: `kf-${Math.random().toString(36).slice(2, 9)}`, frame, ...pinned }].sort(
                    (a, b) => a.frame - b.frame
                  )
                : existing.map((keyframe, index) => (index === at ? { ...keyframe, ...pinned } : keyframe));
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

  selectObject: (id) => set({ selectedObjectId: id, selectedObjectIds: id ? [id] : [] }),

  /**
   * Ctrl/Cmd-click: add the object to the selection, or drop it if it was
   * already in it. The LAST one added stays `selectedObjectId` — the object
   * panel edits exactly one thing, and "the one you just clicked" is the only
   * answer that does not surprise anyone.
   */
  toggleObjectSelection: (id) =>
    set((state) => {
      const has = state.selectedObjectIds.includes(id);
      const next = has ? state.selectedObjectIds.filter((entry) => entry !== id) : [...state.selectedObjectIds, id];
      return { selectedObjectIds: next, selectedObjectId: has ? (next[next.length - 1] ?? null) : id };
    }),
  // Changing scene drops the object selection: the id addresses an element
  // inside the scene that was open, and it means nothing in the next one.
  selectObjects: (ids) => set({ selectedObjectIds: ids, selectedObjectId: ids[ids.length - 1] ?? null }),

  selectScene: (id) => set({ selectedSceneId: id, selectedObjectId: null, selectedObjectIds: [] }),
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

// Auto-save: every change to `project` is queued to its file, so a reload or a
// crash never silently loses work and the Save button is only ever a flush.
// `scheduleSave` owns the debounce, the retries and the unload beacon.
//
// NOTHING may gate this. It used to skip the write whenever an undo transaction
// was open, on the reasoning that a pointer drag would otherwise write on every
// pointermove — but `scheduleSave` already collapses those into one write 400ms
// after the last change, so the guard bought nothing and cost everything: one
// unmatched `beginHistoryTransaction` (Tab on a slider, a component unmounting
// mid-drag) stopped every save for the rest of the session, with the save badge
// still reading "saved". Undo grouping and durability are unrelated concerns and
// must not share a switch.
if (typeof window !== "undefined") {
  useProjectStore.subscribe((state, prevState) => {
    if (state.project === prevState.project) return;
    useProjectStore.setState({ libraryIndex: libraryIndexFrom(persist(state.project, readLibrary())) });
  });
}

/**
 * Last-resort closers for a transaction whose matching `end` never arrived.
 *
 * These cannot lose data — the autosave above no longer depends on them — but
 * without them the undo stack would fold an unbounded amount of editing into a
 * single step.
 */
if (typeof window !== "undefined") {
  // Deferred by a turn of the event loop so the component's own handler for the
  // same event — which may still be writing the gesture's final value — runs
  // first and lands inside the undo step it belongs to.
  const close = () => setTimeout(() => useProjectStore.getState().endHistoryTransaction(), 0);
  window.addEventListener("pointerup", close);
  window.addEventListener("pointercancel", close);
  window.addEventListener("blur", close);
  // A slider opens a transaction on keydown; Tab moves focus before the keyup,
  // so the keyup lands here instead of on the control that opened it.
  window.addEventListener("keyup", close);
}
