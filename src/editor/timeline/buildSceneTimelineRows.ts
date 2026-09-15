import { getSfx } from "../../registries/sfxRegistry";
import type { VideoProject } from "../../schema/project";
import type { SceneTiming } from "../../utils/duration";
import {
  keyframePins,
  sortedKeyframes,
} from "../../video/layout/visualKeyframes";
import {
  resolveEntranceSfx,
  resolveExitSfx,
} from "../../video/motion/sfxDefaults";
import { sceneStartDelay, staggerDelay } from "../../video/scenes/EnterOnCue";
import { splitSpan } from "../../video/typography/splitAnimate";
import type { CustomAsset } from "../state/customAssetsStore";
import { useProjectStore } from "../state/projectStore";
import { audioCueShape } from "./audioCueShape";
import { TimelineRow } from "./timelineRowTypes";
import type { AudioWaveform } from "./useAudioWaveforms";
import { fallbackWaveform, sliceWaveform } from "./useAudioWaveforms";
import { visualTimelinePreview } from "./visualTimelinePreview";
export function buildSceneTimelineRows(
  project: VideoProject,
  timing: SceneTiming,
  customAssets: CustomAsset[],
  audioWaveforms: Map<string, AudioWaveform>,
) {
  const {
    updateSceneMotion,
    updateSceneRichHeadline,
    updateSceneBlocks,
    updateSceneVisuals,
    updateSceneItems,
    updateVisualKeyframe,
    updateAudioClip,
  } = useProjectStore.getState();
  const scene = timing.scene;
  const selectedSceneId = scene.id;
  const visuals = scene.content.visuals ?? [];
  const lines = scene.content.richHeadline ?? [];
  const blocks = scene.content.blocks ?? [];
  const steps = scene.content.items ?? [];
  const sceneEnd = timing.durationInFrames;
  function setVisual(index: number, patch: Record<string, unknown>) {
    return updateSceneVisuals(
      selectedSceneId,
      visuals.map((value, at) =>
        at === index ? { ...value, ...patch } : value,
      ),
    );
  }
  function setChecklistItemLane(
    visualIndex: number,
    itemIndex: number,
    lane: number,
  ) {
    const entry = visuals[visualIndex];
    if (!entry || entry.visual.type !== "checklist") return;
    const checklist = entry.visual;
    setVisual(visualIndex, {
      visual: {
        ...checklist,
        items: checklist.items.map((item, at) =>
          at === itemIndex ? { ...item, lane } : item,
        ),
      },
    });
  }
  function setChecklistItem(
    visualIndex: number,
    itemIndex: number,
    delay: number,
    exitAt: number,
  ) {
    const entry = visuals[visualIndex];
    if (!entry || entry.visual.type !== "checklist") return;
    setVisual(visualIndex, {
      visual: {
        ...entry.visual,
        items: entry.visual.items.map((value, at) =>
          at === itemIndex ? { ...value, delay, exitAt } : value,
        ),
      },
    });
  }
  let automaticLineDelay = sceneStartDelay(scene.motion);
  const automaticLineDelays = lines.map((line) => {
    const result = automaticLineDelay;
    const splitBy = line.splitBy ?? "word";
    automaticLineDelay +=
      splitSpan(line.text, splitBy, line.splitDuration, line.entranceDuration) +
      staggerDelay(1, scene.motion?.stagger);
    return result;
  });
  const rows: TimelineRow[] = [
    ...(lines.length === 0
      ? [
          {
            id: "text-group",
            label: "Scene text",
            kind: "text" as const,
            inspectorTab: "content" as const,
            start: scene.motion?.startDelay ?? sceneStartDelay(scene.motion),
            end: scene.motion?.exitAt ?? sceneEnd,
            entranceDuration:
              scene.motion?.entrance === "none"
                ? undefined
                : (scene.motion?.entranceDuration ?? 18),
            exitDuration:
              scene.motion?.exit && scene.motion.exit !== "none"
                ? (scene.motion?.exitDuration ?? 18)
                : undefined,
            setEntranceDuration: (entranceDuration: number) =>
              updateSceneMotion(selectedSceneId, { entranceDuration }),
            setExitDuration: (exitDuration: number) =>
              updateSceneMotion(selectedSceneId, { exitDuration }),
            set: (startDelay: number, exitAt: number) =>
              updateSceneMotion(selectedSceneId, {
                startDelay,
                exitAt,
                exit: scene.motion?.exit ?? "fade",
              }),
          },
        ]
      : []),
    ...lines.map(
      (line, index): TimelineRow => ({
        id: `line-${index}`,
        label: `Text ${index + 1}: ${line.text}`,
        kind: "text",
        inspectorTab: "content",
        start: line.delay ?? automaticLineDelays[index],
        end: line.exitAt ?? scene.motion?.exitAt ?? sceneEnd,
        entranceDuration:
          line.animation === "none"
            ? undefined
            : splitSpan(
                line.text,
                line.splitBy ?? "word",
                line.splitDuration,
                line.entranceDuration,
              ),
        exitDuration:
          (line.exit ?? scene.motion?.exit) &&
          (line.exit ?? scene.motion?.exit) !== "none"
            ? (line.exitDuration ?? scene.motion?.exitDuration ?? 18)
            : undefined,
        setEntranceDuration: (splitDuration) =>
          updateSceneRichHeadline(
            selectedSceneId,
            lines.map((value, at) =>
              at === index
                ? { ...value, splitDuration, entranceDuration: undefined }
                : value,
            ),
          ),
        setExitDuration: (exitDuration) =>
          updateSceneRichHeadline(
            selectedSceneId,
            lines.map((value, at) =>
              at === index ? { ...value, exitDuration } : value,
            ),
          ),
        set: (delay, exitAt) =>
          updateSceneRichHeadline(
            selectedSceneId,
            lines.map((value, at) =>
              at === index
                ? { ...value, delay, exitAt, exit: value.exit ?? "fade" }
                : value,
            ),
          ),
        lane: line.lane,
        setLane: (lane) =>
          updateSceneRichHeadline(
            selectedSceneId,
            lines.map((value, at) =>
              at === index ? { ...value, lane } : value,
            ),
          ),
      }),
    ),
    ...blocks.map(
      (block, index): TimelineRow => ({
        id: `block-${block.id}`,
        label: `Text: ${block.text}`,
        kind: "text",
        inspectorTab: "content",
        start: block.delay ?? sceneStartDelay(scene.motion),
        end: block.exitAt ?? sceneEnd,
        entranceDuration:
          block.animation === "none"
            ? undefined
            : splitSpan(
                block.text,
                block.splitBy ?? "word",
                block.splitDuration,
                block.entranceDuration,
              ),
        exitDuration:
          block.exit && block.exit !== "none"
            ? (block.exitDuration ?? 18)
            : undefined,
        setEntranceDuration: (splitDuration) =>
          updateSceneBlocks(
            selectedSceneId,
            blocks.map((value, at) =>
              at === index
                ? { ...value, splitDuration, entranceDuration: undefined }
                : value,
            ),
          ),
        setExitDuration: (exitDuration) =>
          updateSceneBlocks(
            selectedSceneId,
            blocks.map((value, at) =>
              at === index ? { ...value, exitDuration } : value,
            ),
          ),
        set: (delay, exitAt) =>
          updateSceneBlocks(
            selectedSceneId,
            blocks.map((value, at) =>
              at === index ? { ...value, delay, exitAt } : value,
            ),
          ),
        lane: block.lane,
        setLane: (lane) =>
          updateSceneBlocks(
            selectedSceneId,
            blocks.map((value, at) =>
              at === index ? { ...value, lane } : value,
            ),
          ),
      }),
    ),
    ...visuals.flatMap((entry, visualIndex): TimelineRow[] => {
      const preview = visualTimelinePreview(entry.visual, customAssets);
      const visualRow: TimelineRow = {
        id: `visual-${entry.id}`,
        label: `Visual: ${preview.label}`,
        kind: "visual",
        inspectorTab: "visuals",
        start: entry.delay ?? 0,
        end: entry.exitAt ?? sceneEnd,
        preview,
        entranceDuration:
          entry.entrance === "none"
            ? undefined
            : (entry.entranceDuration ?? 18),
        exitDuration:
          entry.exit && entry.exit !== "none"
            ? (entry.exitDuration ?? 18)
            : undefined,
        setEntranceDuration: (entranceDuration) =>
          setVisual(visualIndex, { entranceDuration }),
        setExitDuration: (exitDuration) =>
          setVisual(visualIndex, { exitDuration }),
        set: (delay, exitAt) =>
          setVisual(visualIndex, { delay, exitAt, exit: entry.exit ?? "fade" }),
        keyframes: sortedKeyframes(entry).map((keyframe) => ({
          id: keyframe.id,
          frame: keyframe.frame,
          position: keyframePins(keyframe, "position"),
          scale: keyframePins(keyframe, "scale"),
        })),
        moveKeyframe: (keyframeId, frame) =>
          updateVisualKeyframe(selectedSceneId, entry.id, keyframeId, {
            frame,
          }),
        lane: entry.lane,
        setLane: (lane) => setVisual(visualIndex, { lane }),
      };
      if (entry.visual.type !== "checklist") return [visualRow];
      const checklist = entry.visual;
      return [
        visualRow,
        ...checklist.items.map(
          (item, itemIndex): TimelineRow => ({
            id: `check-${entry.id}-${itemIndex}`,
            label: `↳ Item ${itemIndex + 1}: ${item.label}`,
            kind: "item",
            inspectorTab: "visuals",
            start: item.delay ?? itemIndex * (checklist.stagger ?? 6),
            end: item.exitAt ?? entry.exitAt ?? sceneEnd,
            set: (delay, exitAt) =>
              setChecklistItem(visualIndex, itemIndex, delay, exitAt),
            lane: item.lane,
            setLane: (lane) =>
              setChecklistItemLane(visualIndex, itemIndex, lane),
          }),
        ),
      ];
    }),
    ...steps.map(
      (item, index): TimelineRow => ({
        id: `step-${index}`,
        label: `Item ${index + 1}: ${item.label}`,
        kind: "item",
        inspectorTab: "content",
        start:
          item.delay ??
          sceneStartDelay(scene.motion) +
            (index + 1) * (scene.motion?.stagger ?? 6),
        end: item.exitAt ?? scene.motion?.exitAt ?? sceneEnd,
        set: (delay, exitAt) =>
          updateSceneItems(
            selectedSceneId,
            steps.map((value, at) =>
              at === index ? { ...value, delay, exitAt } : value,
            ),
          ),
        lane: item.lane,
        setLane: (lane) =>
          updateSceneItems(
            selectedSceneId,
            steps.map((value, at) =>
              at === index ? { ...value, lane } : value,
            ),
          ),
      }),
    ),
    ...((): TimelineRow[] => {
      const id = resolveEntranceSfx({
        override: scene.motion?.sfx,
        entrance: scene.motion?.entrance,
      });
      if (!id) return [];
      const start = scene.motion?.sfxAt ?? scene.motion?.startDelay ?? 0;
      const sourceStart = scene.motion?.sfxStartFrom ?? 0;
      const shape = audioCueShape(
        audioWaveforms,
        id,
        sourceStart,
        scene.motion?.sfxDuration,
        `${scene.id}-in`,
      );
      const end = start + shape.length;
      return [
        {
          id: "sound-scene-in",
          label: "Scene IN sound",
          kind: "sound",
          inspectorTab: "content",
          start,
          end,
          waveform: shape.waveform,
          trimMin: Math.max(0, start - sourceStart),
          trimEndMax: start + shape.available,
          set: (nextStart, nextEnd) => {
            const sameLength = nextEnd - nextStart === end - start;
            if (sameLength)
              updateSceneMotion(selectedSceneId, {
                sfxAt: nextStart,
                sfxDuration: shape.length,
              });
            else if (nextEnd === end)
              updateSceneMotion(selectedSceneId, {
                sfxAt: nextStart,
                sfxStartFrom: sourceStart + nextStart - start,
                sfxDuration: nextEnd - nextStart,
              });
            else
              updateSceneMotion(selectedSceneId, {
                sfxDuration: nextEnd - nextStart,
              });
          },
        },
      ];
    })(),
    ...((): TimelineRow[] => {
      const id = scene.motion?.exit
        ? resolveExitSfx({
            override: scene.motion?.exitSfx,
            exit: scene.motion.exit,
          })
        : undefined;
      if (!id) return [];
      const start =
        scene.motion?.exitSfxAt ??
        Math.max(
          0,
          (scene.motion?.exitAt ?? sceneEnd) -
            (scene.motion?.exitDuration ?? 18),
        );
      const sourceStart = scene.motion?.exitSfxStartFrom ?? 0;
      const shape = audioCueShape(
        audioWaveforms,
        id,
        sourceStart,
        scene.motion?.exitSfxDuration,
        `${scene.id}-out`,
      );
      const end = start + shape.length;
      return [
        {
          id: "sound-scene-out",
          label: "Scene OUT sound",
          kind: "sound",
          inspectorTab: "content",
          start,
          end,
          waveform: shape.waveform,
          trimMin: Math.max(0, start - sourceStart),
          trimEndMax: start + shape.available,
          set: (nextStart, nextEnd) => {
            const sameLength = nextEnd - nextStart === end - start;
            if (sameLength)
              updateSceneMotion(selectedSceneId, {
                exitSfxAt: nextStart,
                exitSfxDuration: shape.length,
              });
            else if (nextEnd === end)
              updateSceneMotion(selectedSceneId, {
                exitSfxAt: nextStart,
                exitSfxStartFrom: sourceStart + nextStart - start,
                exitSfxDuration: nextEnd - nextStart,
              });
            else
              updateSceneMotion(selectedSceneId, {
                exitSfxDuration: nextEnd - nextStart,
              });
          },
        },
      ];
    })(),
    ...visuals.flatMap((entry, index): TimelineRow[] => {
      const soundRows: TimelineRow[] = [];
      if (entry.sfx && entry.sfx !== "none") {
        const start = entry.sfxAt ?? entry.delay ?? 0;
        const sourceStart = entry.sfxStartFrom ?? 0;
        const shape = audioCueShape(
          audioWaveforms,
          entry.sfx,
          sourceStart,
          entry.sfxDuration,
          `${entry.id}-in`,
        );
        const end = start + shape.length;
        soundRows.push({
          id: `sound-visual-${entry.id}-in`,
          label: `IN sound: ${entry.visual.type}`,
          kind: "sound",
          inspectorTab: "visuals",
          start,
          end,
          waveform: shape.waveform,
          trimMin: Math.max(0, start - sourceStart),
          trimEndMax: start + shape.available,
          set: (nextStart, nextEnd) => {
            const sameLength = nextEnd - nextStart === end - start;
            if (sameLength)
              setVisual(index, { sfxAt: nextStart, sfxDuration: shape.length });
            else if (nextEnd === end)
              setVisual(index, {
                sfxAt: nextStart,
                sfxStartFrom: sourceStart + nextStart - start,
                sfxDuration: nextEnd - nextStart,
              });
            else setVisual(index, { sfxDuration: nextEnd - nextStart });
          },
        });
      }
      if (entry.exit && entry.exitSfx && entry.exitSfx !== "none") {
        const start =
          entry.exitSfxAt ??
          Math.max(0, (entry.exitAt ?? sceneEnd) - (entry.exitDuration ?? 18));
        const sourceStart = entry.exitSfxStartFrom ?? 0;
        const shape = audioCueShape(
          audioWaveforms,
          entry.exitSfx,
          sourceStart,
          entry.exitSfxDuration,
          `${entry.id}-out`,
        );
        const end = start + shape.length;
        soundRows.push({
          id: `sound-visual-${entry.id}-out`,
          label: `OUT sound: ${entry.visual.type}`,
          kind: "sound",
          inspectorTab: "visuals",
          start,
          end,
          waveform: shape.waveform,
          trimMin: Math.max(0, start - sourceStart),
          trimEndMax: start + shape.available,
          set: (nextStart, nextEnd) => {
            const sameLength = nextEnd - nextStart === end - start;
            if (sameLength)
              setVisual(index, {
                exitSfxAt: nextStart,
                exitSfxDuration: shape.length,
              });
            else if (nextEnd === end)
              setVisual(index, {
                exitSfxAt: nextStart,
                exitSfxStartFrom: sourceStart + nextStart - start,
                exitSfxDuration: nextEnd - nextStart,
              });
            else setVisual(index, { exitSfxDuration: nextEnd - nextStart });
          },
        });
      }
      return soundRows;
    }),
    ...(project.audioClips ?? [])
      .filter(
        (clip) =>
          clip.from >= timing.from && clip.from < timing.from + sceneEnd,
      )
      .flatMap((clip): TimelineRow[] => {
        const definition = getSfx(clip.sfxId);
        const info = definition?.src
          ? audioWaveforms.get(definition.src)
          : undefined;
        const sourceStart = clip.startFrom ?? 0;
        const available = Math.max(
          1,
          (info?.durationInFrames ??
            sourceStart + (clip.durationInFrames ?? 30)) - sourceStart,
        );
        const length = Math.min(clip.durationInFrames ?? available, available);
        const start = clip.from - timing.from;
        const end = start + length;
        return [
          {
            id: `audio-clip-${clip.id}`,
            label: definition?.label ?? clip.sfxId,
            kind: "sound",
            inspectorTab: "content",
            start,
            end,
            lane: clip.lane ?? 0,
            setLane: (lane) => updateAudioClip(clip.id, { lane }),
            waveform: info
              ? sliceWaveform(
                  info.peaks,
                  sourceStart,
                  length,
                  info.durationInFrames,
                )
              : fallbackWaveform(clip.id),
            trimMin: Math.max(0, start - sourceStart),
            trimEndMax: start + available,
            set: (nextStart, nextEnd) => {
              const sameLength = nextEnd - nextStart === end - start;
              if (sameLength)
                updateAudioClip(clip.id, {
                  from: timing.from + nextStart,
                  durationInFrames: length,
                });
              else if (nextEnd === end)
                updateAudioClip(clip.id, {
                  from: timing.from + nextStart,
                  startFrom: Math.max(0, sourceStart + nextStart - start),
                  durationInFrames: nextEnd - nextStart,
                });
              else
                updateAudioClip(clip.id, {
                  durationInFrames: nextEnd - nextStart,
                });
            },
          },
        ];
      }),
  ];
  return rows;
}
