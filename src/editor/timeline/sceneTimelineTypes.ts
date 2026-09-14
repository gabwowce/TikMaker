import { type TimelinePreview } from "./visualTimelinePreview";

export type TimelineRow = {
  id: string;
  label: string;
  kind: "text" | "visual" | "item" | "sound";
  inspectorTab: "content" | "visuals";
  start: number;
  end: number;
  point?: boolean;
  set: (start: number, end: number) => void;
  keyframes?: {
    id: string;
    frame: number;
    position?: boolean;
    scale?: boolean;
  }[];
  moveKeyframe?: (keyframeId: string, frame: number) => void;
  entranceDuration?: number;
  exitDuration?: number;
  setEntranceDuration?: (frames: number) => void;
  setExitDuration?: (frames: number) => void;
  preview?: TimelinePreview;
  waveform?: number[];
  trimMin?: number;
  trimEndMax?: number;
  lane?: number;
  setLane?: (lane: number) => void;
};

export type DragMode = "move" | "start" | "end";
