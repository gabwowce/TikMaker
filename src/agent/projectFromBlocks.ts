import type { VideoProject } from "../schema/project";
import type { PositionedVisualEntry, Scene } from "../schema/scene";
import { resolveSceneDuration } from "../utils/pacing";
import { spokenStarts, wordFrame, wordIndex } from "../utils/voWords";
import {
  STAGE_LAYOUTS,
  type StageType,
  type ZonePlacement,
} from "../video/stage/stageTypes";
import { videoDefaults } from "../video/typography/tokens";
import { voicedSceneSeconds, withAgentVoice } from "./agentVoice";
import { blockTimeline, type BlockSlot } from "./blockTimeline";
import { MIN_CARRY_FRAMES, NONE_FRAMES } from "./rules/checkMotion";
import { blockParts, type BlockFromAi } from "./run/4-blocks";
import type { BlockMotionFromAi } from "./run/4-motion";
import type { AgentRun } from "./run/run";

// Motion video (docs/motion-planas.md, stage C): the agent's blocks become the
// project's scenes. Every block is an ordinary visual layer ("stage-block"),
// so it can be moved, retimed and re-animated on the timeline like any other:
// placed where its scene's stage type puts the picture, starting on its word
// and leaving when the next block in its place arrives. The captions come
// from the voiceover in the kinetic style, the agent's key words bold. With
// the agent's voiceover (run.voice) the blocks land on the words as they are
// really spoken, and the scenes last as long as their voice.
//
// How the blocks move is the motion step's answer (run.motion): entrances,
// exits, drift, moves (keyframes) and carries into the next scene. Without
// it, every block fades in and out.

// The motion of a block when the agent gave none. One place holds one block
// at a time: a block finishes leaving on the frame the next one in its place
// arrives, and the last ones finish by the scene's end.
const CALM: BlockMotionFromAi = {
  entrance: "fade",
  enterFrames: 4,
  exit: "fade",
  exitFrames: 8,
};
// Frames a move (keyframe) and a carried block's glide take.
const MOVE_FRAMES = 12;

const percentY = (y: number) => (y / videoDefaults.height) * 100;

// Everything about one scene of the agent's that its layers are built from.
type ScenePlan = {
  scene: Scene;
  stage: StageType;
  end: number;
  vo: string;
  slots: BlockSlot[];
  frameOf: (word: number) => number;
};

// `only`: rebuild just the agent's scene with that number (a scene the user
// had the agent change – 6 Editing); every other scene stays exactly as it is
// in the project, with whatever was done to it by hand.
export function projectFromBlocks(
  project: VideoProject,
  run: AgentRun,
  only?: number,
): VideoProject {
  if (!run.blocks || !run.script) return project;
  const fps = videoDefaults.fps;
  const ids = run.script.scenes.map((_, n) => `scene-${run.id}-${n + 1}`);

  // The plan of the scene with the agent's scene number n (undefined when the
  // project no longer has it).
  const plans = ids.map((id, n): ScenePlan | undefined => {
    const scene = project.scenes.find((s) => s.id === id);
    const blocks = run.blocks?.scenes[n];
    if (!scene || !blocks) return undefined;
    const stage = blocks.stage ?? "top";
    const voice = run.voice?.scenes[n];
    const end = Math.round(
      (voice?.words.length
        ? voicedSceneSeconds(voice)
        : // as long as the scene will be once its content is only blocks
          // (the text it had on screen would make it longer than it plays)
          resolveSceneDuration({
            ...scene,
            type: "visual-explainer",
            content: {},
          })) * fps,
    );
    // the scene being rebuilt after its words changed (the conversation's
    // "words") takes them from the script – the project still has the old
    const vo =
      (only === n ? run.script?.scenes[n]?.voiceover : undefined) ??
      scene.vo ??
      "";
    // Real word times when there is a voiceover; otherwise the voiceover's pace.
    const real = voice ? spokenStarts(voice.words) : [];
    const frameOf = (at: number) =>
      real[at] !== undefined ? Math.round(real[at] * fps) : wordFrame(at, fps);
    // When each block starts: on its word, in order (checkBlocks made sure);
    // it leaves when the next block in its place arrives.
    const slots = blockTimeline(
      vo,
      blocks.blocks.map((block) => block.onWord),
      STAGE_LAYOUTS[stage].visuals.length,
      end,
      frameOf,
    );
    return { scene, stage, end, vo, slots, frameOf };
  });
  const motionOf = (n: number, i: number) =>
    run.motion?.scenes[n]?.blocks[i] ?? CALM;

  // Does scene n's last block stay into scene n+1? Only as far as the frame
  // allows: a place to go to, and time there before that scene's first block.
  const carries = (n: number): boolean => {
    // a rebuilt scene does not reach into the next one, which is not rebuilt
    if (only !== undefined && n === only) return false;
    const plan = plans[n];
    const next = plans[n + 1];
    const last = (plan?.slots.length ?? 0) - 1;
    if (!plan || !next || last < 0 || !motionOf(n, last).carry) return false;
    if (!STAGE_LAYOUTS[next.stage].visuals.length) return false;
    return (next.slots[0]?.start ?? next.end) >= MIN_CARRY_FRAMES;
  };

  const scenes = project.scenes.map((scene): Scene => {
    const n = ids.indexOf(scene.id);
    if (only !== undefined && n !== only) {
      // the scene after a rebuilt one loses the block carried into it: that
      // block is the rebuilt scene's old one
      if (n === only + 1)
        return {
          ...scene,
          content: {
            ...scene.content,
            visuals: scene.content.visuals?.filter(
              (entry) => entry.id !== `${scene.id}-carried`,
            ),
          },
        };
      return scene;
    }
    const plan = plans[n];
    const blocks = run.blocks?.scenes[n];
    if (n === -1 || !plan || !blocks) return scene;
    const places = STAGE_LAYOUTS[plan.stage].visuals;

    const media = keptMedia(scene);
    const own = places.length
      ? blocks.blocks.map((block, i) =>
          blockLayer(plan, block, i, motionOf(n, i), {
            carried: i === blocks.blocks.length - 1 && carries(n),
            place: places[plan.slots[i].zone],
            src: media.get(mediaKey(block)),
          }),
        )
      : [];
    // The previous scene's last block, carried in: it glides from where it
    // stood to this scene's first place and leaves when the first block
    // arrives.
    const previous = plans[n - 1];
    const carriedIn =
      previous && carries(n - 1)
        ? [carriedLayer(previous, n - 1, plan, places[0])]
        : [];

    return {
      ...scene,
      type: "visual-explainer",
      vo: plan.vo,
      stage: plan.stage,
      // The stage's own background: a lit centre and the pack's grid.
      background: "stage",
      layout: undefined,
      content: { visuals: [...carriedIn, ...own] },
      motion: {
        transition: run.motion?.scenes[n]?.transition ?? "cut",
        // The whole scene's content does not animate on its own: a slide
        // transition carries it (an independent fade under it reads wrong).
        entrance: "none",
      },
    };
  });

  const keywords = [
    ...new Set(run.blocks.scenes.flatMap((scene) => scene.keywords)),
  ];
  return withAgentVoice(
    {
      ...project,
      scenes,
      captions: { ...project.captions, style: "kinetic", keywords },
    },
    run,
  );

  // Scene n's last block as the first layer of the scene after it.
  function carriedLayer(
    from: ScenePlan,
    n: number,
    into: ScenePlan,
    place: ZonePlacement,
  ): PositionedVisualEntry {
    const i = from.slots.length - 1;
    const block = run.blocks!.scenes[n].blocks[i];
    const motion = motionOf(n, i);
    const there = layerPose(from, i, motion, STAGE_LAYOUTS[from.stage]);
    const here = { x: 50, y: percentY(place.y), scale: place.scale };
    return {
      id: `${into.scene.id}-carried`,
      visual: { type: "stage-block", block, settled: true },
      ...here,
      delay: 0,
      exitAt: into.slots[0]?.start ?? into.end,
      // already on screen: no entrance of its own, only the glide
      entrance: "none",
      exit: motion.exit,
      exitDuration: motion.exitFrames,
      kenBurns: motion.drift,
      sfx: "none",
      exitSfx: "none",
      lane: 0,
      keyframes:
        there.x === here.x && there.y === here.y && there.scale === here.scale
          ? undefined
          : [
              { id: `${into.scene.id}-carried-from`, frame: 0, ...there },
              {
                id: `${into.scene.id}-carried-to`,
                frame: MOVE_FRAMES,
                ...here,
              },
            ],
    };
  }
}

// One of a scene's own blocks as a layer: on its word, in its place, with the
// motion the agent picked; its moves become keyframes.
// The creator's recordings and pictures survive a rebuild (the agent changing
// a scene, its self-review): a block asking for the same thing – same kind,
// same request – keeps the file put into it. A block asking for something
// else starts empty again.
function mediaKey(block: BlockFromAi): string {
  return `${block.kind}|${block.find ?? block.record ?? block.text ?? ""}`;
}
function keptMedia(scene: Scene): Map<string, string> {
  const kept = new Map<string, string>();
  for (const entry of scene.content.visuals ?? [])
    if (entry.visual.type === "stage-block" && entry.visual.src)
      kept.set(mediaKey(entry.visual.block), entry.visual.src);
  return kept;
}

function blockLayer(
  plan: ScenePlan,
  block: BlockFromAi,
  i: number,
  motion: BlockMotionFromAi,
  {
    carried,
    place,
    src,
  }: { carried: boolean; place: ZonePlacement; src?: string },
): PositionedVisualEntry {
  const { start, leaves, zone } = plan.slots[i];
  const id = `${plan.scene.id}-block-${i + 1}`;
  const keyframes = moveKeyframes(plan, i, motion, place, id);
  const partAts = partStarts(plan, block, i);
  return {
    id,
    visual: {
      type: "stage-block",
      block,
      ...(plan.stage === "full" ? { full: true } : {}),
      ...(partAts ? { partAts } : {}),
      ...(src ? { src } : {}),
    },
    x: 50,
    y: percentY(place.y),
    scale: place.scale,
    delay: start,
    // A carried block stays to the scene's last frame; the scene after it
    // goes on with it (projectFromBlocks → carriedLayer).
    exitAt: carried ? plan.end : leaves,
    // "none": already there – only for a block on the scene's first word
    // (the hook's first picture); later it would show before its word, so a
    // fade keeps it hidden until then (checkMotion asks for another)
    entrance:
      motion.entrance === "none" && start > NONE_FRAMES
        ? "fade"
        : motion.entrance,
    entranceDuration: motion.enterFrames,
    exit: carried ? "none" : motion.exit,
    exitDuration: motion.exitFrames,
    kenBurns: motion.drift,
    sfx: "none",
    exitSfx: "none",
    lane: zone,
    ...(keyframes ? { keyframes } : {}),
  };
}

// A block's parts (list items, logos, schema nodes) on their own spoken
// words: frames after the block's start (checkBlocks made sure every word is
// said, in order, from the block's word). None when the block gives no words
// – its parts then follow one another.
function partStarts(
  plan: ScenePlan,
  block: BlockFromAi,
  i: number,
): number[] | undefined {
  const words = blockParts(block) ? (block.partWords ?? []) : [];
  if (!words.length) return undefined;
  const { word: blockWord, start } = plan.slots[i];
  let from = Math.max(0, blockWord);
  let last = 0;
  return words.map((partWord, part) => {
    const word = wordIndex(plan.vo, partWord, from);
    if (word === -1) return last; // checkBlocks reported it
    // two parts may share a word: the next one reads it again
    from = word;
    // the first part comes with the block – a block is never an empty frame
    // (checkBlocks asks for it; this holds if the model still left a gap)
    if (part > 0) last = Math.max(last, plan.frameOf(word) - start);
    return last;
  });
}

// A block's moves as keyframes: it holds each pose until the move's word,
// then travels to the new one over MOVE_FRAMES.
function moveKeyframes(
  plan: ScenePlan,
  i: number,
  motion: BlockMotionFromAi,
  place: ZonePlacement,
  id: string,
): PositionedVisualEntry["keyframes"] {
  const moves = motion.moves ?? [];
  if (!moves.length) return undefined;
  let pose = { x: 50, y: percentY(place.y), scale: place.scale };
  let from = plan.slots[i].word + 1;
  let last = plan.slots[i].start;
  const keyframes: NonNullable<PositionedVisualEntry["keyframes"]> = [];
  moves.forEach((move, m) => {
    const word = wordIndex(plan.vo, move.onWord, from);
    if (word === -1) return; // checkMotion reported it
    from = word + 1;
    const at = Math.max(last, plan.frameOf(word));
    const to = { x: move.x ?? pose.x, y: move.y, scale: move.scale };
    keyframes.push(
      { id: `${id}-move-${m + 1}-from`, frame: at, ...pose },
      { id: `${id}-move-${m + 1}-to`, frame: at + MOVE_FRAMES, ...to },
    );
    pose = to;
    last = at + MOVE_FRAMES;
  });
  return keyframes.length ? keyframes : undefined;
}

// Where a block ends up: its last move's pose, or its place.
function layerPose(
  plan: ScenePlan,
  i: number,
  motion: BlockMotionFromAi,
  layout: { visuals: ZonePlacement[] },
): { x: number; y: number; scale: number } {
  const place = layout.visuals[plan.slots[i].zone];
  const keyframes = moveKeyframes(plan, i, motion, place, "pose");
  const last = keyframes?.[keyframes.length - 1];
  return last
    ? {
        x: last.x ?? 50,
        y: last.y ?? percentY(place.y),
        scale: last.scale ?? place.scale,
      }
    : { x: 50, y: percentY(place.y), scale: place.scale };
}
