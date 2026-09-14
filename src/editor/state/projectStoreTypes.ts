import type { VideoProject } from "../../schema/project";
import type {
  Block,
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
  PositionedVisualEntry,
  RichHeadlineLine,
  Scene,
  SceneBackground,
  SceneType,
  SideContent,
  StepItem,
  TransitionPreset,
} from "../../schema/scene";
import type { VisualConfig } from "../../schema/visual";
import { type KeyframeProperty } from "../../video/layout/visualKeyframes";
export type VisualSlot = "main" | "left" | "right";
export type LibraryEntry = {
  id: string;
  title: string;
  collection?: string;
};
export type ProjectStore = {
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
  updateAudioClip: (
    id: string,
    patch: Partial<NonNullable<VideoProject["audioClips"]>[number]>,
  ) => void;
  splitAudioClip: (
    id: string,
    at: number,
    resolvedDuration: number,
  ) => string | null;
  removeAudioClip: (id: string) => void;
  createProject: (title: string) => void;
  loadProject: (project: VideoProject) => void;
  saveProject: () => void;
  saveProjectAs: (title: string) => void;
  exportProjectJson: () => string;
  updateProjectTitle: (title: string) => void;
  updateProjectStoryPlan: (
    patch: Partial<NonNullable<VideoProject["storyPlan"]>>,
  ) => void;
  openProject: (id: string) => void;
  deleteProject: (id: string) => void;
  addScene: (type: SceneType) => void;
  insertScene: (scene: Scene) => void;
  removeScene: (id: string) => void;
  duplicateScene: (id: string) => void;
  moveScene: (id: string, direction: "up" | "down") => void;
  updateScene: (id: string, patch: Partial<Scene>) => void;
  updateSceneContent: (id: string, content: Partial<Scene["content"]>) => void;
  updateSceneVisual: (id: string, visual: VisualConfig | undefined) => void;
  updateSceneVisualPosition: (
    id: string,
    position:
      | {
          x: number;
          y: number;
        }
      | undefined,
  ) => void;
  updateSceneVisualEntrance: (
    id: string,
    entrance: EntrancePreset | undefined,
  ) => void;
  updateSceneVisualExit: (id: string, exit: ExitPreset | undefined) => void;
  updateSceneVisualExitDuration: (id: string, exitDuration: number) => void;
  updateSceneVisualKenBurns: (
    id: string,
    kenBurns: KenBurnsPreset | undefined,
  ) => void;
  updateSceneVisualSfx: (id: string, sfx: string | undefined) => void;
  updateSceneVisualExitSfx: (id: string, sfx: string | undefined) => void;
  updateSceneBackground: (id: string, background: SceneBackground) => void;
  updateAllScenesBackground: (background: SceneBackground) => void;
  updateSceneEntrance: (id: string, entrance: EntrancePreset) => void;
  updateSceneExit: (id: string, exit: ExitPreset | undefined) => void;
  updateSceneExitDuration: (id: string, exitDuration: number) => void;
  updateSceneMotion: (
    id: string,
    patch: Partial<NonNullable<Scene["motion"]>>,
  ) => void;
  updateSceneSfx: (id: string, sfx: string | undefined) => void;
  updateSceneExitSfx: (id: string, sfx: string | undefined) => void;
  updateSceneTransition: (id: string, transition: TransitionPreset) => void;
  updateSceneStagger: (id: string, stagger: number) => void;
  updateSceneHighlights: (id: string, highlights: string[]) => void;
  updateSceneLeftRight: (
    id: string,
    side: "left" | "right",
    patch: Partial<SideContent>,
  ) => void;
  updateSceneItems: (id: string, items: StepItem[]) => void;
  updateSceneRichHeadline: (id: string, lines: RichHeadlineLine[]) => void;
  updateSceneBlocks: (id: string, blocks: Block[]) => void;
  updateSceneVisuals: (id: string, visuals: PositionedVisualEntry[]) => void;
  addVisualKeyframe: (
    sceneId: string,
    entryId: string,
    frame: number,
    property: KeyframeProperty,
    pose?: {
      x?: number;
      y?: number;
      scale?: number;
    },
  ) => void;
  updateVisualKeyframe: (
    sceneId: string,
    entryId: string,
    keyframeId: string,
    patch: {
      frame?: number;
      x?: number;
      y?: number;
      scale?: number;
    },
  ) => void;
  removeVisualKeyframe: (
    sceneId: string,
    entryId: string,
    keyframeId: string,
  ) => void;
  linkVisualToNextScene: (id: string) => void;
  linkLayerToNextScene: (sceneId: string, entryId: string) => void;
  selectedObjectId: string | null;
  selectedObjectIds: string[];
  selectObject: (id: string | null) => void;
  toggleObjectSelection: (id: string) => void;
  selectObjects: (ids: string[]) => void;
  selectScene: (id: string | null) => void;
  setActiveVisualSlot: (slot: VisualSlot) => void;
};
