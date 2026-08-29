import type { Scene } from "../schema/scene";
import { fitPositionedVisual } from "../video/layout/layoutPresets";
import type { VisualConfig } from "../schema/visual";
import type { EntrancePreset, ExitPreset, KenBurnsPreset } from "../schema/scene";

export type VisualPose = { x: number; y: number; scale: number };

export type LinkKeyframe = {
  /** Frames from the START of the group's sequence. */
  at: number;
  pose: VisualPose;
};

/** How the carried element animates in, drifts, and animates out. Taken from
 * the FIRST member of the chain (in/drift) and the LAST (out), because that's
 * where those beats actually happen once the chain is one element. */
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
  /** Absolute frame the group's single mounted element starts at. */
  from: number;
  durationInFrames: number;
  visual: VisualConfig;
  keyframes: LinkKeyframe[];
  motion: LinkMotion;
  /** Which scene/layer pairs stop drawing this visual themselves. */
  members: { sceneId: string; entryId: string }[];
};

/** One candidate for carrying: a layer that declares a `link` group. */
type PoseSource = {
  groupId: string;
  visual: VisualConfig;
  pose: VisualPose;
  motionIn: LinkMotion;
  motionOut: LinkMotion;
  entryId: string;
};

function layerSources(scene: Scene): PoseSource[] {
  return (scene.content.visuals ?? [])
    .filter((entry) => entry.link?.groupId)
    .map((entry) => ({
      groupId: entry.link!.groupId,
      visual: entry.visual,
      pose: { x: entry.x, y: entry.y, scale: fitPositionedVisual(entry.visual, entry.scale) },
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
    }));
}

/**
 * Link chains, resolved as ONE element spanning the whole chain instead of one
 * element per scene.
 *
 * Rendering a linked visual inside each scene's own `<Sequence>` meant it was
 * unmounted and remounted at every cut: a video restarted from frame 0 (and
 * flashed black while it re-buffered), and any chain longer than a pair had to
 * re-derive its pose from scratch. Hoisting it to a single sequence that covers
 * the group means the asset is mounted once — a recording just keeps playing,
 * nothing flickers, and the pose animates through as many scenes as the chain
 * has.
 *
 * Every visual is a `content.visuals[]` layer, and any of them can take part
 * by declaring its own `link`. A "group" is a
 * run of CONSECUTIVE scenes that each contribute a source with that `groupId`.
 * Runs of one are not hoisted — there's nothing to carry, and hoisting would
 * change that visual's stacking order for no reason.
 */
export function resolveHoistedLinkGroups(
  timings: { scene: Scene; from: number; durationInFrames: number }[]
): HoistedLinkGroup[] {
  const byGroup = new Map<string, { index: number; source: PoseSource }[]>();

  timings.forEach((timing, index) => {
    const sources = layerSources(timing.scene);
    for (const source of sources) {
      const list = byGroup.get(source.groupId) ?? [];
      // One source per group per scene — a scene can't carry the same chain
      // twice, and taking the first keeps the pose unambiguous.
      if (list.some((e) => e.index === index)) continue;
      list.push({ index, source });
      byGroup.set(source.groupId, list);
    }
  });

  const groups: HoistedLinkGroup[] = [];

  for (const [groupId, entries] of byGroup) {
    entries.sort((a, b) => a.index - b.index);

    let run: typeof entries = [];
    const flush = () => {
      if (run.length >= 2) groups.push(buildGroup(groupId, run, timings));
      run = [];
    };
    for (const entry of entries) {
      if (run.length > 0 && entry.index !== run[run.length - 1].index + 1) flush();
      run.push(entry);
    }
    flush();
  }

  return groups.sort((a, b) => a.from - b.from);
}

function buildGroup(
  groupId: string,
  run: { index: number; source: PoseSource }[],
  timings: { scene: Scene; from: number; durationInFrames: number }[]
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
    keyframes: run.map((entry) => ({ at: timings[entry.index].from - from, pose: entry.source.pose })),
    motion: { ...first.source.motionIn, ...lastEntry.source.motionOut },
    members: run.map((entry) => ({ sceneId: timings[entry.index].scene.id, entryId: entry.source.entryId })),
  };
}

export type ChainRole = "first" | "middle" | "last";

/**
 * Where one (sceneId, entryId) sits within its ACTIVE hoisted chain, if any —
 * `null` when the entry isn't part of one (no `link`, or a `link.groupId` with
 * no matching neighbor, which never gets hoisted per `resolveHoistedLinkGroups`
 * and so just renders with its own full entrance/exit like normal).
 *
 * This is the answer to "which In/Out controls actually do anything": per
 * `buildGroup`, only the FIRST member's entrance/drift/sound-in and the LAST
 * member's exit/sound-out are read — everything in between just interpolates
 * position. Editing In on a "last" member, or Out on a "first" or "middle"
 * one, changes a value nothing ever looks at. Reuses the SAME grouping
 * `resolveHoistedLinkGroups` computes for rendering, so the editor's notion of
 * "first/last" can never drift from what the video actually plays.
 */
export function chainRoleFor(groups: HoistedLinkGroup[], sceneId: string, entryId: string): ChainRole | null {
  for (const group of groups) {
    const index = group.members.findIndex((m) => m.sceneId === sceneId && m.entryId === entryId);
    if (index === -1) continue;
    if (index === 0) return "first";
    if (index === group.members.length - 1) return "last";
    return "middle";
  }
  return null;
}

/** Which layer ids each scene must NOT draw itself, because a hoisted group
 * draws them: sceneId -> set of `content.visuals[]` entry ids. */
export function hoistedOwnership(groups: HoistedLinkGroup[]): Map<string, Set<string>> {
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
