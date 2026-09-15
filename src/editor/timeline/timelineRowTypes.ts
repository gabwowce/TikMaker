import { type TimelinePreview } from "./visualTimelinePreview";

export type Kind = "scene" | "text" | "visual" | "item" | "sound";
export type DragMode = "move" | "start" | "end";

// Klipo spalva pagal rūšį. Anksčiau ta pati lentelė buvo dviejuose
// išdėstymo failuose, po vieną kiekvienai juostai.
export const KIND_COLOR: Record<Kind, string> = {
  scene: "#64748b",
  text: "#8b5cf6",
  visual: "#ff7024",
  item: "#14b8a6",
  sound: "#3b82f6",
};

// Vienas klipo aprašas abiem juostoms. Anksčiau buvo du beveik vienodi
// tipai — TimelineRow scenos juostai ir Row viso video juostai — ir
// kiekvienas naujas laukas turėdavo būti pridėtas į abu.
//
// Skiriasi tik keli laukai, ir jie pažymėti: kurio vaizdo jie yra.
export type TimelineRow = {
  id: string;
  label: string;
  kind: Kind;
  start: number;
  end: number;

  /** Tik scenos juosta: kurį Inspektoriaus skirtuką atidaryti. */
  inspectorTab?: "content" | "visuals";
  /** Tik scenos juosta: keyframe'ų deimantai ant klipo. */
  keyframes?: {
    id: string;
    frame: number;
    position?: boolean;
    scale?: boolean;
  }[];
  moveKeyframe?: (keyframeId: string, frame: number) => void;

  /** Tik viso video juosta: kurios scenos kurį objektą klipas adresuoja. */
  sceneId?: string;
  objectId?: string;
  /** Tik viso video juosta: kiek klipas gali judėti. */
  min?: number;
  max?: number;
  movable?: boolean;
  trimStart?: boolean;

  /** Perrašo KIND_COLOR — naudoja tik perkelto (carry) vizualo klipas. */
  color?: string;
  point?: boolean;
  lane?: number;
  trimMin?: number;
  trimEndMax?: number;
  entranceDuration?: number;
  exitDuration?: number;
  preview?: TimelinePreview;
  waveform?: number[];

  set?: (start: number, end: number) => void;
  setLane?: (lane: number) => void;
  setEntranceDuration?: (frames: number) => void;
  setExitDuration?: (frames: number) => void;
};

export type Track = {
  kind: Kind;
  lane: number;
  rows: TimelineRow[];
};
