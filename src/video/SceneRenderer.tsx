import { type ReactNode } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { getSceneDefinition } from "../registries/sceneRegistry";
import type { VideoProject } from "../schema/project";
import type { Scene } from "../schema/scene";
import { computeSceneTimings } from "../utils/duration";
import {
  hoistedOwnership,
  resolveHoistedLinkGroups,
} from "../utils/visualLinks";
import { Background } from "./backgrounds";
import { resolveTextZone, textZoneJustify } from "./layout/layoutPresets";
import { transitionStyle } from "./motion/transitions";
import { sceneStartDelay, staggerDelay } from "./scenes/EnterOnCue";
import { BlockLayer } from "./typography/BlockLayer";
import { LinkedVisual } from "./typography/LinkedVisual";
import { RichHeadline } from "./typography/RichHeadline";
import { splitSpan } from "./typography/splitAnimate";
import { VisualsLayer } from "./typography/VisualsLayer";
type TransitionedSceneProps = {
  scene: Scene;
  durationInFrames: number;
  durationSeconds: number;
  fps: number;
  hoistedLayerIds?: Set<string>;
  contentOverride?: Scene["content"];
};
function TransitionedScene({
  scene,
  durationInFrames,
  durationSeconds,
  fps,
  hoistedLayerIds,
  contentOverride,
}: TransitionedSceneProps) {
  const frameInScene = useCurrentFrame();
  const style = transitionStyle(scene.motion?.transition, {
    frameInScene,
    durationInFrames,
    fps,
  });
  const Component = getSceneDefinition(scene.type).component;
  return (
    <AbsoluteFill>
      <Background id={scene.background} />

      <AbsoluteFill style={style}>
        <Component
          {...scene}
          content={
            contentOverride ??
            (hoistedLayerIds?.size
              ? {
                  ...scene.content,
                  visuals: scene.content.visuals?.filter(
                    (v) => !hoistedLayerIds.has(v.id),
                  ),
                }
              : scene.content)
          }
          durationSeconds={durationSeconds}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
type SceneRendererProps = {
  project: VideoProject;
};
export function SceneRenderer({ project }: SceneRendererProps) {
  const timings = computeSceneTimings(project);
  const linkGroups = resolveHoistedLinkGroups(timings);
  const hoisted = hoistedOwnership(linkGroups);
  const baseContent = new Map<string, Scene["content"]>();
  const overflow: ReactNode[] = [];
  for (const timing of timings) {
    const { scene, from, durationInFrames } = timing;
    const hoistedIds = hoisted.get(scene.id) ?? new Set<string>();
    let automatic = sceneStartDelay(scene.motion);
    const resolvedLines = (scene.content.richHeadline ?? []).map((line) => {
      const delay = line.delay ?? automatic;
      automatic +=
        splitSpan(
          line.text,
          line.splitBy ?? "word",
          line.splitDuration,
          line.entranceDuration,
        ) + staggerDelay(1, scene.motion?.stagger);
      return { ...line, delay };
    });
    const hasOverflowLines = resolvedLines.some(
      (line) => (line.exitAt ?? durationInFrames) > durationInFrames,
    );
    const overflowLines = hasOverflowLines ? resolvedLines : [];
    const overflowBlocks = (scene.content.blocks ?? []).filter(
      (block) => (block.exitAt ?? durationInFrames) > durationInFrames,
    );
    const hasOverflowItems = (scene.content.items ?? []).some(
      (item) => (item.exitAt ?? durationInFrames) > durationInFrames,
    );
    const overflowVisuals = (scene.content.visuals ?? [])
      .map((visual) => {
        const effectiveExit =
          visual.visual.type === "checklist"
            ? Math.max(
                visual.exitAt ?? durationInFrames,
                ...visual.visual.items.map(
                  (item) => item.exitAt ?? visual.exitAt ?? durationInFrames,
                ),
              )
            : (visual.exitAt ?? durationInFrames);
        return effectiveExit === visual.exitAt
          ? visual
          : { ...visual, exitAt: effectiveExit };
      })
      .filter(
        (visual) =>
          !hoistedIds.has(visual.id) &&
          (visual.exitAt ?? durationInFrames) > durationInFrames,
      );
    const overflowLineSet = new Set(overflowLines);
    const overflowBlockIds = new Set(overflowBlocks.map((block) => block.id));
    const overflowVisualIds = new Set(
      overflowVisuals.map((visual) => visual.id),
    );
    baseContent.set(scene.id, {
      ...scene.content,
      richHeadline: resolvedLines.filter((line) => !overflowLineSet.has(line)),
      blocks: scene.content.blocks?.filter(
        (block) => !overflowBlockIds.has(block.id),
      ),
      visuals: scene.content.visuals?.filter(
        (visual) =>
          !hoistedIds.has(visual.id) && !overflowVisualIds.has(visual.id),
      ),
      items: hasOverflowItems ? [] : scene.content.items,
    });
    if (overflowLines.length) {
      const end = Math.max(
        durationInFrames,
        ...overflowLines.map((line) => line.exitAt ?? durationInFrames),
      );
      overflow.push(
        <Sequence
          key={`overflow-lines-${scene.id}`}
          from={from}
          durationInFrames={end}
          name={`overflow:${scene.id}:text`}
        >
          <AbsoluteFill
            className="pl-[130px] pr-[130px] pt-[220px] pb-[500px] flex flex-col items-center"
            style={{
              justifyContent:
                textZoneJustify[resolveTextZone(scene.layout, "center")],
            }}
          >
            <RichHeadline
              lines={overflowLines}
              stagger={scene.motion?.stagger}
              baseDelay={sceneStartDelay(scene.motion)}
              motion={scene.motion}
              durationSeconds={end / project.fps}
              x={scene.content.richHeadlineX}
              y={scene.content.richHeadlineY}
            />
          </AbsoluteFill>
        </Sequence>,
      );
    }
    for (const block of overflowBlocks) {
      const end = Math.max(1, block.exitAt ?? durationInFrames);
      overflow.push(
        <Sequence
          key={`overflow-block-${scene.id}-${block.id}`}
          from={from}
          durationInFrames={end}
          name={`overflow:${scene.id}:block`}
        >
          <BlockLayer
            blocks={[block]}
            baseDelay={sceneStartDelay(scene.motion)}
            durationInFrames={end}
          />
        </Sequence>,
      );
    }
    for (const visual of overflowVisuals) {
      const end = Math.max(1, visual.exitAt ?? durationInFrames);
      overflow.push(
        <Sequence
          key={`overflow-visual-${scene.id}-${visual.id}`}
          from={from}
          durationInFrames={end}
          name={`overflow:${scene.id}:visual`}
        >
          <VisualsLayer
            visuals={[visual]}
            durationSeconds={end / project.fps}
            baseDelay={sceneStartDelay(scene.motion)}
          />
        </Sequence>,
      );
    }
    if (hasOverflowItems) {
      const end = Math.max(
        durationInFrames,
        ...(scene.content.items ?? []).map(
          (item) => item.exitAt ?? durationInFrames,
        ),
      );
      const Component = getSceneDefinition(scene.type).component;
      const content: Scene["content"] = {
        ...scene.content,
        headline: undefined,
        richHeadline: [],
        blocks: [],
        visuals: [],
      };
      overflow.push(
        <Sequence
          key={`overflow-items-${scene.id}`}
          from={from}
          durationInFrames={end}
          name={`overflow:${scene.id}:items`}
        >
          <Component
            {...scene}
            content={content}
            motion={{
              ...scene.motion,
              exit: "none",
              sfx: "none",
              exitSfx: "none",
            }}
            durationSeconds={end / project.fps}
          />
        </Sequence>,
      );
    }
  }
  return (
    <>
      {timings.map(({ scene, from, durationInFrames, durationSeconds }) => (
        <Sequence
          key={scene.id}
          from={from}
          durationInFrames={durationInFrames}
          name={scene.id}
        >
          <TransitionedScene
            scene={scene}
            durationInFrames={durationInFrames}
            durationSeconds={durationSeconds}
            fps={project.fps}
            hoistedLayerIds={hoisted.get(scene.id)}
            contentOverride={baseContent.get(scene.id)}
          />
        </Sequence>
      ))}

      {overflow}

      {linkGroups.map((group) => (
        <Sequence
          key={`link-${group.groupId}-${group.from}`}
          from={group.from}
          durationInFrames={group.durationInFrames}
          name={`link:${group.groupId}`}
        >
          <LinkedVisual group={group} />
        </Sequence>
      ))}
    </>
  );
}
