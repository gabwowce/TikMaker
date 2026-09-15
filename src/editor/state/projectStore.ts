import { linkLayerToNextScene } from "./linkScenes";
import { create } from "zustand";
import { getSceneDefinition } from "../../registries/sceneRegistry";
import { getSfx } from "../../registries/sfxRegistry";
import type { VideoProject } from "../../schema/project";
import { createEmptyProject } from "../../schema/project";
import type { Scene, ScenePlanRole, SceneType } from "../../schema/scene";
import { poseAtFrame } from "../../video/layout/visualKeyframes";
import { cachedAudioDuration } from "../timeline/useAudioWaveforms";
import { planRoleFor } from "../../utils/normalizeProject";
import { deleteEntry, saveNow } from "./fileLibrary";
import {
  libraryIndexFrom,
  loadInitialState,
  persist,
  readLibrary,
  rememberLastOpened,
  writeLibrary,
} from "./projectLibrary";
import type { ProjectStore } from "./projectStoreTypes";
export type { LibraryEntry, VisualSlot } from "./projectStoreTypes";

function makeSceneId(): string {
  return `scene-${Math.random().toString(36).slice(2, 9)}`;
}

const initialProject = createEmptyProject("empty", "Empty Project");
type HistorySnapshot = {
  project: VideoProject;
  selectedSceneId: string | null;
};
const HISTORY_LIMIT = 100;
const undoStack: HistorySnapshot[] = [];
const redoStack: HistorySnapshot[] = [];
let applyingHistory = false;
let historyTransaction: HistorySnapshot | null = null;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: initialProject,
  selectedSceneId: null,
  activeVisualSlot: "main",
  libraryIndex: [],
  canUndo: false,
  canRedo: false,
  playheadFrame: 0,
  selectedObjectId: null,
  selectedObjectIds: [],
  undo() {
    const previous = undoStack.pop();
    if (!previous) return;
    const current = get();
    redoStack.push({
      project: current.project,
      selectedSceneId: current.selectedSceneId,
    });
    applyingHistory = true;
    set({
      project: previous.project,
      selectedSceneId: previous.selectedSceneId,
      canUndo: undoStack.length > 0,
      canRedo: true,
    });
    applyingHistory = false;
  },
  redo() {
    const next = redoStack.pop();
    if (!next) return;
    const current = get();
    undoStack.push({
      project: current.project,
      selectedSceneId: current.selectedSceneId,
    });
    applyingHistory = true;
    set({
      project: next.project,
      selectedSceneId: next.selectedSceneId,
      canUndo: true,
      canRedo: redoStack.length > 0,
    });
    applyingHistory = false;
  },
  beginHistoryTransaction() {
    if (historyTransaction) return;
    const state = get();
    historyTransaction = {
      project: state.project,
      selectedSceneId: state.selectedSceneId,
    };
  },
  endHistoryTransaction() {
    if (!historyTransaction) return;
    const before = historyTransaction;
    historyTransaction = null;
    const project = get().project;
    if (before.project === project) return;
    undoStack.push(before);
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack.length = 0;
    const library = persist(project, readLibrary());
    set({
      canUndo: true,
      canRedo: false,
      libraryIndex: libraryIndexFrom(library),
    });
  },
  setPlayheadFrame(playheadFrame) {
    return set({ playheadFrame: Math.max(0, Math.round(playheadFrame)) });
  },
  addAudioClip(sfxId, from) {
    return set((state) => ({
      project: {
        ...state.project,
        audioClips: [
          ...(state.project.audioClips ?? []),
          {
            id: `audio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            sfxId,
            from: Math.max(0, Math.round(from ?? state.playheadFrame)),
            volume: 1,
            durationInFrames: cachedAudioDuration(getSfx(sfxId)?.src),
          },
        ],
      },
    }));
  },
  updateAudioClip(id, patch) {
    return set((state) => ({
      project: {
        ...state.project,
        audioClips: (state.project.audioClips ?? []).map((clip) =>
          clip.id === id ? { ...clip, ...patch } : clip,
        ),
      },
    }));
  },
  splitAudioClip(id, at, resolvedDuration) {
    const state = get();
    const clip = (state.project.audioClips ?? []).find(
      (entry) => entry.id === id,
    );
    if (!clip) return null;
    const offset = Math.round(at - clip.from);
    const duration = Math.max(
      1,
      Math.round(clip.durationInFrames ?? resolvedDuration),
    );
    if (offset <= 0 || offset >= duration) return null;
    const nextId = `audio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    set({
      project: {
        ...state.project,
        audioClips: (state.project.audioClips ?? []).flatMap((entry) =>
          entry.id === id
            ? [
                { ...entry, durationInFrames: offset },
                {
                  ...entry,
                  id: nextId,
                  from: Math.round(at),
                  startFrom: (entry.startFrom ?? 0) + offset,
                  durationInFrames: duration - offset,
                },
              ]
            : [entry],
        ),
      },
    });
    return nextId;
  },
  removeAudioClip(id) {
    return set((state) => ({
      project: {
        ...state.project,
        audioClips: (state.project.audioClips ?? []).filter(
          (clip) => clip.id !== id,
        ),
      },
    }));
  },
  createProject(title) {
    const project = createEmptyProject(`project-${Date.now()}`, title);
    const library = persist(project, readLibrary());
    set({
      project,
      selectedSceneId: null,
      libraryIndex: libraryIndexFrom(library),
    });
  },
  loadProject(project) {
    const library = persist(project, readLibrary());
    set({
      project,
      selectedSceneId: project.scenes[0]?.id ?? null,
      libraryIndex: libraryIndexFrom(library),
    });
  },
  saveProject() {
    const project = get().project;
    const library = {
      ...readLibrary(),
      [project.id]: { ...project, savedAt: Date.now() },
    };
    writeLibrary(library);
    void saveNow("project", library[project.id]);
    rememberLastOpened(project.id);
    set({ libraryIndex: libraryIndexFrom(library) });
  },
  saveProjectAs(title) {
    const project: VideoProject = {
      ...get().project,
      id: `project-${Date.now().toString(36)}`,
      title,
    };
    const library = persist(project, readLibrary());
    set({ project, libraryIndex: libraryIndexFrom(library) });
  },
  exportProjectJson() {
    return JSON.stringify(get().project, null, 2);
  },
  updateProjectTitle(title) {
    set((state) => ({ project: { ...state.project, title } }));
  },
  updateProjectStoryPlan(patch) {
    set((state) => ({
      project: {
        ...state.project,
        storyPlan: { ...state.project.storyPlan, ...patch },
      },
    }));
  },
  openProject(id) {
    const library = readLibrary();
    const project = library[id];
    if (!project) return;
    rememberLastOpened(id);
    set({ project, selectedSceneId: project.scenes[0]?.id ?? null });
  },
  deleteProject(id) {
    const library = { ...readLibrary() };
    delete library[id];
    writeLibrary(library);
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
  addScene(type) {
    const def = getSceneDefinition(type);
    set((state) => {
      const background = state.project.scenes[0]?.background ?? "solid-dark";
      const newScene: Scene = {
        id: makeSceneId(),
        type,
        plan: { role: planRoleFor(type), purpose: def.description },
        durationSeconds: undefined,
        background,
        content: { headline: "New headline" },
        motion: { entrance: "fade", transition: "cut" },
      };
      return {
        project: {
          ...state.project,
          scenes: [...state.project.scenes, newScene],
        },
        selectedSceneId: newScene.id,
      };
    });
  },
  insertScene(scene) {
    set((state) => {
      const scenes = [...state.project.scenes];
      const at = scenes.findIndex((s) => s.id === state.selectedSceneId);
      const index = at === -1 ? scenes.length : at + 1;
      const inserted = scene.plan
        ? scene
        : { ...scene, plan: { role: planRoleFor(scene.type) } };
      scenes.splice(index, 0, inserted);
      return {
        project: { ...state.project, scenes },
        selectedSceneId: inserted.id,
      };
    });
  },
  removeScene(id) {
    set((state) => {
      return {
        project: {
          ...state.project,
          scenes: state.project.scenes.filter((s) => s.id !== id),
        },
        selectedSceneId:
          state.selectedSceneId === id ? null : state.selectedSceneId,
      };
    });
  },
  duplicateScene(id) {
    set((state) => {
      const index = state.project.scenes.findIndex((s) => s.id === id);
      if (index === -1) return state;
      const source = state.project.scenes[index];
      const clone: Scene = { ...source, id: makeSceneId() };
      const scenes = [...state.project.scenes];
      scenes.splice(index + 1, 0, clone);
      return {
        project: { ...state.project, scenes },
        selectedSceneId: clone.id,
      };
    });
  },
  moveScene(id, direction) {
    set((state) => {
      const scenes = [...state.project.scenes];
      const index = scenes.findIndex((s) => s.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || targetIndex < 0 || targetIndex >= scenes.length)
        return state;
      [scenes[index], scenes[targetIndex]] = [
        scenes[targetIndex],
        scenes[index],
      ];
      return { project: { ...state.project, scenes } };
    });
  },
  updateScene(id, patch) {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, ...patch } : s,
        ),
      },
    }));
  },
  updateSceneContent(id, contentPatch) {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id
            ? { ...s, content: { ...s.content, ...contentPatch } }
            : s,
        ),
      },
    }));
  },
  updateSceneColumnVisual(id, visual) {
    const side = get().activeVisualSlot;
    if (side === "main") return;
    get().updateSceneContent(id, {
      [side]: { ...get().project.scenes.find((s) => s.id === id)?.content[side], visual },
    });
  },
  updateSceneBackground(id, background) {
    get().updateScene(id, { background: background });
  },
  updateAllScenesBackground(background) {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) => ({ ...s, background })),
      },
    }));
  },
  updateSceneEntrance(id, entrance) {
    get().updateSceneMotion(id, { entrance: entrance });
  },
  updateSceneTransition(id, transition) {
    get().updateSceneMotion(id, { transition: transition });
  },
  updateSceneExit(id, exit) {
    get().updateSceneMotion(id, { exit: exit });
  },
  updateSceneExitDuration(id, exitDuration) {
    get().updateSceneMotion(id, { exitDuration: exitDuration });
  },
  updateSceneMotion(id, patch) {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id ? { ...s, motion: { ...s.motion, ...patch } } : s,
        ),
      },
    }));
  },
  updateSceneSfx(id, sfx) {
    get().updateSceneMotion(id, { sfx: sfx });
  },
  updateSceneExitSfx(id, sfx) {
    get().updateSceneMotion(id, { exitSfx: sfx });
  },
  updateSceneStagger(id, stagger) {
    get().updateSceneMotion(id, { stagger: stagger });
  },
  updateSceneLeftRight(id, side, patch) {
    set((state) => ({
      project: {
        ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === id
            ? {
                ...s,
                content: {
                  ...s.content,
                  [side]: { ...s.content[side], ...patch },
                },
              }
            : s,
        ),
      },
    }));
  },
  updateSceneItems(id, items) {
    get().updateSceneContent(id, { items: items });
  },
  updateSceneRichHeadline(id, lines) {
    get().updateSceneContent(id, { richHeadline: lines });
  },
  updateSceneBlocks(id, blocks) {
    get().updateSceneContent(id, { blocks: blocks });
  },
  linkLayerToNextScene(sceneId, entryId) {
    set((state) => ({
      project: linkLayerToNextScene(state.project, sceneId, entryId),
    }));
  },
  addVisualKeyframe(sceneId, entryId, frame, property, pose) {
    const scene = get().project.scenes.find((scene) => scene.id === sceneId);
    if (!scene?.content.visuals?.some((entry) => entry.id === entryId)) return;

    const visuals = scene.content.visuals.map((entry) => {
      if (entry.id !== entryId) return entry;
      const current = poseAtFrame(entry, frame);
      const pinned =
        property === "scale"
          ? { scale: pose?.scale ?? current.scale ?? entry.scale ?? 1 }
          : { x: pose?.x ?? current.x, y: pose?.y ?? current.y };
      const keyframes = [...(entry.keyframes ?? [])];
      const index = keyframes.findIndex((keyframe) => keyframe.frame === frame);
      if (index === -1) {
        keyframes.push({
          id: `kf-${Math.random().toString(36).slice(2, 9)}`,
          frame,
          ...pinned,
        });
      } else {
        keyframes[index] = { ...keyframes[index], ...pinned };
      }
      keyframes.sort((a, b) => a.frame - b.frame);
      return { ...entry, keyframes };
    });
    get().updateSceneVisuals(sceneId, visuals);
  },
  updateVisualKeyframe(sceneId, entryId, keyframeId, patch) {
    const scene = get().project.scenes.find((scene) => scene.id === sceneId);
    if (!scene?.content.visuals?.some((entry) => entry.id === entryId)) return;

    const visuals = scene.content.visuals.map((entry) => {
      if (entry.id !== entryId) return entry;
      const keyframes = (entry.keyframes ?? [])
        .map((keyframe) =>
          keyframe.id === keyframeId ? { ...keyframe, ...patch } : keyframe,
        )
        .sort((a, b) => a.frame - b.frame);
      return { ...entry, keyframes };
    });
    get().updateSceneVisuals(sceneId, visuals);
  },
  removeVisualKeyframe(sceneId, entryId, keyframeId) {
    const scene = get().project.scenes.find((scene) => scene.id === sceneId);
    if (!scene?.content.visuals?.some((entry) => entry.id === entryId)) return;

    const visuals = scene.content.visuals.map((entry) => {
      if (entry.id !== entryId) return entry;
      const keyframes = (entry.keyframes ?? []).filter(
        (keyframe) => keyframe.id !== keyframeId,
      );
      return { ...entry, keyframes: keyframes.length ? keyframes : undefined };
    });
    get().updateSceneVisuals(sceneId, visuals);
  },
  updateSceneVisuals(id, visuals) {
    get().updateSceneContent(id, { visuals });
  },
  selectObject(id) {
    return set({ selectedObjectId: id, selectedObjectIds: id ? [id] : [] });
  },
  toggleObjectSelection(id) {
    return set((state) => {
      const has = state.selectedObjectIds.includes(id);
      const next = has
        ? state.selectedObjectIds.filter((entry) => entry !== id)
        : [...state.selectedObjectIds, id];
      return {
        selectedObjectIds: next,
        selectedObjectId: has ? (next[next.length - 1] ?? null) : id,
      };
    });
  },
  selectObjects(ids) {
    return set({
      selectedObjectIds: ids,
      selectedObjectId: ids[ids.length - 1] ?? null,
    });
  },
  selectScene(id) {
    return set({
      selectedSceneId: id,
      selectedObjectId: null,
      selectedObjectIds: [],
    });
  },
  setActiveVisualSlot(slot) {
    return set({ activeVisualSlot: slot });
  },
}));
useProjectStore.subscribe((state, previous) => {
  if (applyingHistory || state.project === previous.project) return;
  if (historyTransaction) return;
  if (state.project.id !== previous.project.id) {
    undoStack.length = 0;
    redoStack.length = 0;
    useProjectStore.setState({ canUndo: false, canRedo: false });
    return;
  }
  undoStack.push({
    project: previous.project,
    selectedSceneId: previous.selectedSceneId,
  });
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack.length = 0;
  useProjectStore.setState({ canUndo: true, canRedo: false });
});

if (typeof window !== "undefined") {
  useProjectStore.subscribe((state, prevState) => {
    if (state.project === prevState.project) return;
    if (historyTransaction) return;
    useProjectStore.setState({
      libraryIndex: libraryIndexFrom(persist(state.project, readLibrary())),
    });
  });
}

export function initializeProjectStore() {
  const { project, library } = loadInitialState();
  undoStack.length = 0;
  redoStack.length = 0;
  historyTransaction = null;
  applyingHistory = true;
  useProjectStore.setState({
    project,
    selectedSceneId: project.scenes[0]?.id ?? null,
    libraryIndex: libraryIndexFrom(persist(project, library)),
  });
  useProjectStore.setState({ canUndo: false, canRedo: false });
  applyingHistory = false;
}
