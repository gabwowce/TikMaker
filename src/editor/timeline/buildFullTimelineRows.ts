import { getSfx } from "../../registries/sfxRegistry";
import type { VideoProject } from "../../schema/project";
import { computeSceneTimings } from "../../utils/duration";
import {
  hoistedOwnership,
  resolveHoistedLinkGroups,
} from "../../utils/visualLinks";
import {
  resolveEntranceSfx,
  resolveExitSfx,
} from "../../video/motion/sfxDefaults";
import { sceneStartDelay, staggerDelay } from "../../video/scenes/EnterOnCue";
import { splitSpan } from "../../video/typography/splitAnimate";
import type { CustomAsset } from "../state/customAssetsStore";
import { useProjectStore } from "../state/projectStore";
import { audioCueShape } from "./audioCueShape";
import { KIND_COLOR } from "./fullTimelineLayout";
import { Row } from "./fullTimelineTypes";
import type { AudioWaveform } from "./useAudioWaveforms";
import { fallbackWaveform, sliceWaveform } from "./useAudioWaveforms";
import { visualTimelinePreview } from "./visualTimelinePreview";
export function buildFullTimelineRows(
  project: VideoProject,
  editHorizon: number,
  customAssets: CustomAsset[],
  audioWaveforms: Map<string, AudioWaveform>,
) {
  const {
    updateScene,
    updateSceneMotion,
    updateSceneRichHeadline,
    updateSceneBlocks,
    updateSceneVisuals,
    updateSceneItems,
    updateAudioClip,
  } = useProjectStore.getState();
  const timings = computeSceneTimings(project);
  const linkGroups = resolveHoistedLinkGroups(timings);
  const linkedOwnership = hoistedOwnership(linkGroups);
  const rows: Row[] = [];
  for (const [sceneIndex, timing] of timings.entries()) {
    const { scene, from, durationInFrames } = timing;
    const sceneEnd = editHorizon;
    const guideStart = scene.timelineRange?.from ?? from;
    const guideEnd =
      guideStart + (scene.timelineRange?.durationInFrames ?? durationInFrames);
    rows.push({
      id: `scene-${scene.id}`,
      sceneId: scene.id,
      label: `${String(sceneIndex + 1).padStart(2, "0")} · ${scene.type}${scene.vo ? ` · ${scene.vo}` : ""}`,
      kind: "scene",
      color: KIND_COLOR.scene,
      start: guideStart,
      end: guideEnd,
      max: editHorizon,
      lane: 0,
      set: (start, end) =>
        updateScene(scene.id, {
          timelineRange: {
            from: start,
            durationInFrames: Math.max(1, end - start),
          },
        }),
    });
    let automatic = sceneStartDelay(scene.motion);
    for (const [index, line] of (scene.content.richHeadline ?? []).entries()) {
      const localStart = line.delay ?? automatic;
      automatic +=
        splitSpan(
          line.text,
          line.splitBy ?? "word",
          line.splitDuration,
          line.entranceDuration,
        ) + staggerDelay(1, scene.motion?.stagger);
      rows.push({
        id: `${scene.id}-line-${index}`,
        sceneId: scene.id,
        objectId: `line-${index}`,
        label: line.text,
        kind: "text",
        color: KIND_COLOR.text,
        start: from + localStart,
        end: from + (line.exitAt ?? durationInFrames),
        min: from,
        max: sceneEnd,
        lane: line.lane,
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
            scene.id,
            (scene.content.richHeadline ?? []).map((value, at) =>
              at === index
                ? { ...value, splitDuration, entranceDuration: undefined }
                : value,
            ),
          ),
        setExitDuration: (exitDuration) =>
          updateSceneRichHeadline(
            scene.id,
            (scene.content.richHeadline ?? []).map((value, at) =>
              at === index ? { ...value, exitDuration } : value,
            ),
          ),
        set: (start, end) =>
          updateSceneRichHeadline(
            scene.id,
            (scene.content.richHeadline ?? []).map((value, at) =>
              at === index
                ? { ...value, delay: start - from, exitAt: end - from }
                : value,
            ),
          ),
        setLane: (lane) =>
          updateSceneRichHeadline(
            scene.id,
            (scene.content.richHeadline ?? []).map((value, at) =>
              at === index ? { ...value, lane } : value,
            ),
          ),
      });
    }
    for (const [index, block] of (scene.content.blocks ?? []).entries())
      rows.push({
        id: `${scene.id}-block-${block.id}`,
        sceneId: scene.id,
        objectId: `block-${block.id}`,
        label: block.text,
        kind: "text",
        color: KIND_COLOR.text,
        start: from + (block.delay ?? 0),
        end: from + (block.exitAt ?? durationInFrames),
        min: from,
        max: sceneEnd,
        lane: block.lane,
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
            scene.id,
            (scene.content.blocks ?? []).map((value, at) =>
              at === index
                ? { ...value, splitDuration, entranceDuration: undefined }
                : value,
            ),
          ),
        setExitDuration: (exitDuration) =>
          updateSceneBlocks(
            scene.id,
            (scene.content.blocks ?? []).map((value, at) =>
              at === index ? { ...value, exitDuration } : value,
            ),
          ),
        set: (start, end) =>
          updateSceneBlocks(
            scene.id,
            (scene.content.blocks ?? []).map((value, at) =>
              at === index
                ? { ...value, delay: start - from, exitAt: end - from }
                : value,
            ),
          ),
        setLane: (lane) =>
          updateSceneBlocks(
            scene.id,
            (scene.content.blocks ?? []).map((value, at) =>
              at === index ? { ...value, lane } : value,
            ),
          ),
      });
    for (const [index, visual] of (scene.content.visuals ?? []).entries()) {
      if (linkedOwnership.get(scene.id)?.has(visual.id)) continue;
      function setVisual(patch: Record<string, unknown>) {
        return updateSceneVisuals(
          scene.id,
          (scene.content.visuals ?? []).map((value, at) =>
            at === index ? { ...value, ...patch } : value,
          ),
        );
      }
      const preview = visualTimelinePreview(visual.visual, customAssets);
      rows.push({
        id: `${scene.id}-visual-${visual.id}`,
        sceneId: scene.id,
        objectId: `visual-${visual.id}`,
        label: preview.label,
        preview,
        kind: "visual",
        color: KIND_COLOR.visual,
        start: from + (visual.delay ?? 0),
        end: from + (visual.exitAt ?? durationInFrames),
        min: from,
        max: sceneEnd,
        lane: visual.lane,
        entranceDuration:
          visual.entrance === "none"
            ? undefined
            : (visual.entranceDuration ?? 18),
        exitDuration:
          visual.exit && visual.exit !== "none"
            ? (visual.exitDuration ?? 18)
            : undefined,
        setEntranceDuration: (entranceDuration) =>
          setVisual({ entranceDuration }),
        setExitDuration: (exitDuration) => setVisual({ exitDuration }),
        set: (start, end) =>
          setVisual({ delay: start - from, exitAt: end - from }),
        setLane: (lane) => setVisual({ lane }),
      });
      if (visual.sfx && visual.sfx !== "none") {
        const cue = from + (visual.sfxAt ?? visual.delay ?? 0);
        const sourceStart = visual.sfxStartFrom ?? 0;
        const shape = audioCueShape(
          audioWaveforms,
          visual.sfx,
          sourceStart,
          visual.sfxDuration,
          `${visual.id}-in`,
        );
        const end = cue + shape.length;
        rows.push({
          id: `${scene.id}-visual-sound-in-${visual.id}`,
          sceneId: scene.id,
          objectId: `sound-visual-${visual.id}-in`,
          label: `${visual.visual.type} IN`,
          kind: "sound",
          color: KIND_COLOR.sound,
          waveform: shape.waveform,
          start: cue,
          end,
          min: from,
          max: sceneEnd,
          trimMin: Math.max(from, cue - sourceStart),
          trimEndMax: cue + shape.available,
          set: (start, nextEnd) => {
            const sameLength = nextEnd - start === end - cue;
            if (sameLength)
              setVisual({ sfxAt: start - from, sfxDuration: shape.length });
            else if (nextEnd === end)
              setVisual({
                sfxAt: start - from,
                sfxStartFrom: sourceStart + start - cue,
                sfxDuration: nextEnd - start,
              });
            else setVisual({ sfxDuration: nextEnd - start });
          },
        });
      }
      if (visual.exit && visual.exitSfx && visual.exitSfx !== "none") {
        const cue =
          from +
          (visual.exitSfxAt ??
            Math.max(
              0,
              (visual.exitAt ?? durationInFrames) - (visual.exitDuration ?? 18),
            ));
        const sourceStart = visual.exitSfxStartFrom ?? 0;
        const shape = audioCueShape(
          audioWaveforms,
          visual.exitSfx,
          sourceStart,
          visual.exitSfxDuration,
          `${visual.id}-out`,
        );
        const end = cue + shape.length;
        rows.push({
          id: `${scene.id}-visual-sound-out-${visual.id}`,
          sceneId: scene.id,
          objectId: `sound-visual-${visual.id}-out`,
          label: `${visual.visual.type} OUT`,
          kind: "sound",
          color: KIND_COLOR.sound,
          waveform: shape.waveform,
          start: cue,
          end,
          min: from,
          max: sceneEnd,
          trimMin: Math.max(from, cue - sourceStart),
          trimEndMax: cue + shape.available,
          set: (start, nextEnd) => {
            const sameLength = nextEnd - start === end - cue;
            if (sameLength)
              setVisual({
                exitSfxAt: start - from,
                exitSfxDuration: shape.length,
              });
            else if (nextEnd === end)
              setVisual({
                exitSfxAt: start - from,
                exitSfxStartFrom: sourceStart + start - cue,
                exitSfxDuration: nextEnd - start,
              });
            else setVisual({ exitSfxDuration: nextEnd - start });
          },
        });
      }
    }
    for (const [index, item] of (scene.content.items ?? []).entries())
      rows.push({
        id: `${scene.id}-step-${index}`,
        sceneId: scene.id,
        objectId: `step-${index}`,
        label: item.label,
        kind: "item",
        color: KIND_COLOR.item,
        start: from + (item.delay ?? (index + 1) * 6),
        end: from + (item.exitAt ?? durationInFrames),
        min: from,
        max: sceneEnd,
        lane: item.lane,
        set: (start, end) =>
          updateSceneItems(
            scene.id,
            (scene.content.items ?? []).map((value, at) =>
              at === index
                ? { ...value, delay: start - from, exitAt: end - from }
                : value,
            ),
          ),
        setLane: (lane) =>
          updateSceneItems(
            scene.id,
            (scene.content.items ?? []).map((value, at) =>
              at === index ? { ...value, lane } : value,
            ),
          ),
      });
    const sceneInId = resolveEntranceSfx({
      override: scene.motion?.sfx,
      entrance: scene.motion?.entrance,
    });
    if (sceneInId) {
      const cue = from + (scene.motion?.sfxAt ?? scene.motion?.startDelay ?? 0);
      const sourceStart = scene.motion?.sfxStartFrom ?? 0;
      const shape = audioCueShape(
        audioWaveforms,
        sceneInId,
        sourceStart,
        scene.motion?.sfxDuration,
        `${scene.id}-in`,
      );
      const end = cue + shape.length;
      rows.push({
        id: `${scene.id}-sound-in`,
        sceneId: scene.id,
        objectId: "sound-scene-in",
        label: "Scene IN",
        kind: "sound",
        color: KIND_COLOR.sound,
        waveform: shape.waveform,
        start: cue,
        end,
        min: from,
        max: sceneEnd,
        trimMin: Math.max(from, cue - sourceStart),
        trimEndMax: cue + shape.available,
        set: (start, nextEnd) => {
          const sameLength = nextEnd - start === end - cue;
          if (sameLength)
            updateSceneMotion(scene.id, {
              sfxAt: start - from,
              sfxDuration: shape.length,
            });
          else if (nextEnd === end)
            updateSceneMotion(scene.id, {
              sfxAt: start - from,
              sfxStartFrom: sourceStart + start - cue,
              sfxDuration: nextEnd - start,
            });
          else updateSceneMotion(scene.id, { sfxDuration: nextEnd - start });
        },
      });
    }
    const sceneOutId = scene.motion?.exit
      ? resolveExitSfx({
          override: scene.motion?.exitSfx,
          exit: scene.motion.exit,
        })
      : undefined;
    if (sceneOutId) {
      const cue =
        from +
        (scene.motion?.exitSfxAt ??
          Math.max(
            0,
            (scene.motion?.exitAt ?? durationInFrames) -
              (scene.motion?.exitDuration ?? 18),
          ));
      const sourceStart = scene.motion?.exitSfxStartFrom ?? 0;
      const shape = audioCueShape(
        audioWaveforms,
        sceneOutId,
        sourceStart,
        scene.motion?.exitSfxDuration,
        `${scene.id}-out`,
      );
      const end = cue + shape.length;
      rows.push({
        id: `${scene.id}-sound-out`,
        sceneId: scene.id,
        objectId: "sound-scene-out",
        label: "Scene OUT",
        kind: "sound",
        color: KIND_COLOR.sound,
        waveform: shape.waveform,
        start: cue,
        end,
        min: from,
        max: sceneEnd,
        trimMin: Math.max(from, cue - sourceStart),
        trimEndMax: cue + shape.available,
        set: (start, nextEnd) => {
          const sameLength = nextEnd - start === end - cue;
          if (sameLength)
            updateSceneMotion(scene.id, {
              exitSfxAt: start - from,
              exitSfxDuration: shape.length,
            });
          else if (nextEnd === end)
            updateSceneMotion(scene.id, {
              exitSfxAt: start - from,
              exitSfxStartFrom: sourceStart + start - cue,
              exitSfxDuration: nextEnd - start,
            });
          else
            updateSceneMotion(scene.id, { exitSfxDuration: nextEnd - start });
        },
      });
    }
  }
  for (const group of linkGroups) {
    const firstMember = group.members[0];
    const lastMember = group.members[group.members.length - 1];
    const firstTiming = timings.find(
      (value) => value.scene.id === firstMember.sceneId,
    )!;
    const lastTiming = timings.find(
      (value) => value.scene.id === lastMember.sceneId,
    )!;
    const firstVisual = firstTiming.scene.content.visuals?.find(
      (value) => value.id === firstMember.entryId,
    );
    const lastVisual = lastTiming.scene.content.visuals?.find(
      (value) => value.id === lastMember.entryId,
    );
    if (!firstVisual || !lastVisual) continue;
    rows.push({
      id: `carry-${group.groupId}-${group.from}`,
      sceneId: firstMember.sceneId,
      objectId: `visual-${firstMember.entryId}`,
      label: `${firstVisual.visual.type} ↔ ${group.members.length} scenes`,
      kind: "visual",
      color: "#f97316",
      start: firstTiming.from + (firstVisual.delay ?? 0),
      end: lastTiming.from + (lastVisual.exitAt ?? lastTiming.durationInFrames),
      lane: firstVisual.lane,
      entranceDuration:
        firstVisual.entrance === "none"
          ? undefined
          : (firstVisual.entranceDuration ?? 18),
      exitDuration:
        lastVisual.exit && lastVisual.exit !== "none"
          ? (lastVisual.exitDuration ?? 18)
          : undefined,
      set: (start, end) => {
        updateSceneVisuals(
          firstMember.sceneId,
          (firstTiming.scene.content.visuals ?? []).map((value) =>
            value.id === firstMember.entryId
              ? { ...value, delay: start - firstTiming.from }
              : value,
          ),
        );
        updateSceneVisuals(
          lastMember.sceneId,
          (lastTiming.scene.content.visuals ?? []).map((value) =>
            value.id === lastMember.entryId
              ? { ...value, exitAt: end - lastTiming.from }
              : value,
          ),
        );
      },
      setLane: (lane) =>
        updateSceneVisuals(
          firstMember.sceneId,
          (firstTiming.scene.content.visuals ?? []).map((value) =>
            value.id === firstMember.entryId ? { ...value, lane } : value,
          ),
        ),
    });
  }
  for (const clip of project.audioClips ?? []) {
    const definition = getSfx(clip.sfxId);
    const info = definition?.src
      ? audioWaveforms.get(definition.src)
      : undefined;
    const sourceStart = clip.startFrom ?? 0;
    const available = Math.max(
      1,
      (info?.durationInFrames ?? sourceStart + (clip.durationInFrames ?? 30)) -
        sourceStart,
    );
    const length = Math.min(clip.durationInFrames ?? available, available);
    const waveform = info
      ? sliceWaveform(info.peaks, sourceStart, length, info.durationInFrames)
      : fallbackWaveform(clip.id);
    const start = clip.from;
    const end = start + length;
    rows.push({
      id: clip.id,
      objectId: `audio-clip-${clip.id}`,
      label: definition?.label ?? clip.sfxId,
      kind: "sound",
      color: "#2563eb",
      waveform,
      start,
      end,
      lane: clip.lane ?? 0,
      setLane: (lane) => updateAudioClip(clip.id, { lane }),
      max: editHorizon,
      trimMin: Math.max(0, start - sourceStart),
      trimEndMax: start + available,
      set: (nextStart, nextEnd) => {
        const sameLength = nextEnd - nextStart === end - start;
        if (sameLength)
          updateAudioClip(clip.id, {
            from: nextStart,
            durationInFrames: length,
          });
        else if (nextEnd === end)
          updateAudioClip(clip.id, {
            from: nextStart,
            startFrom: Math.max(0, sourceStart + nextStart - start),
            durationInFrames: nextEnd - nextStart,
          });
        else
          updateAudioClip(clip.id, { durationInFrames: nextEnd - nextStart });
      },
    });
  }
  return rows;
}
