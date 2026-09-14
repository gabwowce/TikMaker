import { type TimelinePreview } from "./visualTimelinePreview";

export type Kind = "scene" | "text" | "visual" | "item" | "sound";

export type Row = {
  id: string;
  sceneId?: string;
  objectId?: string;
  label: string;
  kind: Kind;
  color: string;
  start: number;
  end: number;
  min?: number;
  max?: number;
  point?: boolean;
  movable?: boolean;
  trimStart?: boolean;
  trimMin?: number;
  trimEndMax?: number;
  lane?: number;
  entranceDuration?: number;
  exitDuration?: number;
  setEntranceDuration?: (frames: number) => void;
  setExitDuration?: (frames: number) => void;
  preview?: TimelinePreview;
  waveform?: number[];
  set?: (start: number, end: number) => void;
  setLane?: (lane: number) => void;
};

export type Track = {
  kind: Kind;
  lane: number;
  rows: Row[];
};
