import type {
  EntrancePreset,
  ExitPreset,
  KenBurnsPreset,
  Scene,
} from "../schema/scene";
import type { VisualConfig } from "../schema/visual";
import { fitPositionedVisual } from "../video/layout/layoutPresets";
export type VisualPose = {
  x: number;
  y: number;
  scale: number;
};
export type LinkKeyframe = {
  at: number;
  pose: VisualPose;
  lead?: number;
  duration?: number;
};
export type LinkMotion = {
  entrance?: EntrancePreset;
  entranceDistance?: number;
  kenBurns?: KenBurnsPreset;
  kenBurnsSpeed?: number;
  sfx?: string;
  exit?: ExitPreset;
  exitDuration?: number;
  exitDistance?: number;
  exitSfx?: string;
};
export type HoistedLinkGroup = {
  groupId: string;
  from: number;
  durationInFrames: number;
  visual: VisualConfig;
  keyframes: LinkKeyframe[];
  motion: LinkMotion;
  members: {
    sceneId: string;
    entryId: string;
  }[];
};
type PoseSource = {
  groupId: string;
  visual: VisualConfig;
  pose: VisualPose;
  motionIn: LinkMotion;
  motionOut: LinkMotion;
  entryId: string;
  glideLead?: number;
  glideDuration?: number;
};
function layerSources(scene: Scene): PoseSource[] {
  return (scene.content.visuals ?? [])
    .filter((entry) => entry.link?.groupId)
    .map((entry) => ({
      groupId: entry.link!.groupId,
      visual: entry.visual,
      pose: {
        x: entry.x,
        y: entry.y,
        scale: fitPositionedVisual(entry.visual, entry.scale),
      },
      motionIn: {
        entrance: entry.entrance,
        entranceDistance: entry.entranceDistance,
        kenBurns: entry.kenBurns,
        kenBurnsSpeed: entry.kenBurnsSpeed,
        sfx: entry.sfx,
      },
      motionOut: {
        exit: entry.exit,
        exitDuration: entry.exitDuration,
        exitDistance: entry.exitDistance,
        exitSfx: entry.exitSfx,
      },
      entryId: entry.id,
      glideLead: entry.link!.glideLead,
      glideDuration: entry.link!.glideDuration,
    }));
}
export function resolveHoistedLinkGroups(
  timings: {
    scene: Scene;
    from: number;
    durationInFrames: number;
  }[],
): HoistedLinkGroup[] {
  const byGroup = new Map<
    string,
    {
      index: number;
      source: PoseSource;
    }[]
  >();
  timings.forEach((timing, index) => {
    const sources = layerSources(timing.scene);
    for (const source of sources) {
      const list = byGroup.get(source.groupId) ?? [];
      if (list.some((e) => e.index === index)) continue;
      list.push({ index, source });
      byGroup.set(source.groupId, list);
    }
  });
  const groups: HoistedLinkGroup[] = [];
  for (const [groupId, entries] of byGroup) {
    entries.sort((a, b) => a.index - b.index);
    let run: typeof entries = [];
    function flush() {
      if (run.length >= 2) groups.push(buildGroup(groupId, run, timings));
      run = [];
    }
    for (const entry of entries) {
      if (run.length > 0 && entry.index !== run[run.length - 1].index + 1)
        flush();
      run.push(entry);
    }
    flush();
  }
  return groups.sort((a, b) => a.from - b.from);
}
function buildGroup(
  groupId: string,
  run: {
    index: number;
    source: PoseSource;
  }[],
  timings: {
    scene: Scene;
    from: number;
    durationInFrames: number;
  }[],
): HoistedLinkGroup {
  const first = run[0];
  const lastEntry = run[run.length - 1];
  const from = timings[first.index].from;
  const lastTiming = timings[lastEntry.index];
  return {
    groupId,
    from,
    durationInFrames: lastTiming.from + lastTiming.durationInFrames - from,
    visual: first.source.visual,
    keyframes: run.map((entry) => ({
      at: timings[entry.index].from - from,
      pose: entry.source.pose,
      lead: entry.source.glideLead,
      duration: entry.source.glideDuration,
    })),
    motion: { ...first.source.motionIn, ...lastEntry.source.motionOut },
    members: run.map((entry) => ({
      sceneId: timings[entry.index].scene.id,
      entryId: entry.source.entryId,
    })),
  };
}
export type ChainRole = "first" | "middle" | "last";
export function chainRoleFor(
  groups: HoistedLinkGroup[],
  sceneId: string,
  entryId: string,
): ChainRole | null {
  for (const group of groups) {
    const index = group.members.findIndex(
      (m) => m.sceneId === sceneId && m.entryId === entryId,
    );
    if (index === -1) continue;
    if (index === 0) return "first";
    if (index === group.members.length - 1) return "last";
    return "middle";
  }
  return null;
}
export function hoistedOwnership(
  groups: HoistedLinkGroup[],
): Map<string, Set<string>> {
  const layers = new Map<string, Set<string>>();
  for (const group of groups) {
    for (const member of group.members) {
      const set = layers.get(member.sceneId) ?? new Set<string>();
      set.add(member.entryId);
      layers.set(member.sceneId, set);
    }
  }
  return layers;
}
