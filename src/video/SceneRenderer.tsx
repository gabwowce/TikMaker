import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import type { Scene } from "../schema/scene";
import { getSceneDefinition } from "../registries/sceneRegistry";
import { transitionStyle } from "./motion/transitions";
import { Background } from "./backgrounds";
import { computeSceneTimings } from "../utils/duration";
import { resolveHoistedLinkGroups, hoistedOwnership } from "../utils/visualLinks";
import { LinkedVisual } from "./typography/LinkedVisual";
import type { VideoProject } from "../schema/project";
import { VisualsLayer } from "./typography/VisualsLayer";
import { BlockLayer } from "./typography/BlockLayer";
import { RichHeadline } from "./typography/RichHeadline";
import { sceneStartDelay, staggerDelay } from "./scenes/EnterOnCue";
import { splitSpan } from "./typography/splitAnimate";
import { safeAreaPadding } from "./typography/SafeArea";
import { resolveTextZone, textZoneJustify } from "./layout/layoutPresets";

const TransitionedScene: React.FC<{
  scene: Scene;
  durationInFrames: number;
  durationSeconds: number;
  fps: number;
  /** Ids of this scene's `content.visuals[]` entries drawn by a hoisted chain
   * instead of by the scene, so the asset isn't rendered twice. */
  hoistedLayerIds?: Set<string>;
  contentOverride?: Scene["content"];
}> = ({ scene, durationInFrames, durationSeconds, fps, hoistedLayerIds, contentOverride }) => {
  const frameInScene = useCurrentFrame();
  const style = transitionStyle(scene.motion?.transition, { frameInScene, durationInFrames, fps });
  const Component = getSceneDefinition(scene.type).component;

  return (
    <AbsoluteFill>
      {/* Outside the transform on purpose. The background is the surface the video
          is drawn ON, not part of what moves across it — sliding it made the whole
          frame, grid and glow included, travel with the text, which reads as the
          camera panning rather than as a cut. Every scene shares one background in
          practice (the editor edits it project-wide), so a static plate under a
          sliding content layer is also what the viewer expects. */}
      <Background id={scene.background} />

      <AbsoluteFill style={style}>
        <Component
          {...scene}
          content={contentOverride ?? (hoistedLayerIds?.size
            ? { ...scene.content, visuals: scene.content.visuals?.filter((v) => !hoistedLayerIds.has(v.id)) }
            : scene.content)}
          durationSeconds={durationSeconds}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const SceneRenderer: React.FC<{ project: VideoProject }> = ({ project }) => {
  const timings = computeSceneTimings(project);
  const linkGroups = resolveHoistedLinkGroups(timings);
  const hoisted = hoistedOwnership(linkGroups);
  const baseContent = new Map<string, Scene["content"]>();
  const overflow: React.ReactNode[] = [];

  for (const timing of timings) {
    const { scene, from, durationInFrames } = timing;
    const hoistedIds = hoisted.get(scene.id) ?? new Set<string>();
    let automatic = sceneStartDelay(scene.motion);
    const resolvedLines = (scene.content.richHeadline ?? []).map((line) => {
      const delay = line.delay ?? automatic;
      automatic += splitSpan(line.text, line.splitBy ?? "word", line.splitDuration, line.entranceDuration) + staggerDelay(1, scene.motion?.stagger);
      return { ...line, delay };
    });
    // Rich headline lines are one composed text group. If one line crosses the
    // cut, hoist the whole group so their spacing/order does not collapse into
    // several independently centered overlays.
    const hasOverflowLines = resolvedLines.some((line) => (line.exitAt ?? durationInFrames) > durationInFrames);
    const overflowLines = hasOverflowLines ? resolvedLines : [];
    const overflowBlocks = (scene.content.blocks ?? []).filter((block) => (block.exitAt ?? durationInFrames) > durationInFrames);
    const hasOverflowItems = (scene.content.items ?? []).some((item) => (item.exitAt ?? durationInFrames) > durationInFrames);
    const overflowVisuals = (scene.content.visuals ?? [])
      .map((visual) => {
        const effectiveExit = visual.visual.type === "checklist"
          ? Math.max(visual.exitAt ?? durationInFrames, ...visual.visual.items.map((item) => item.exitAt ?? visual.exitAt ?? durationInFrames))
          : visual.exitAt ?? durationInFrames;
        return effectiveExit === visual.exitAt ? visual : { ...visual, exitAt: effectiveExit };
      })
      .filter((visual) => !hoistedIds.has(visual.id) && (visual.exitAt ?? durationInFrames) > durationInFrames);
    const overflowLineSet = new Set(overflowLines);
    const overflowBlockIds = new Set(overflowBlocks.map((block) => block.id));
    const overflowVisualIds = new Set(overflowVisuals.map((visual) => visual.id));

    baseContent.set(scene.id, {
      ...scene.content,
      richHeadline: resolvedLines.filter((line) => !overflowLineSet.has(line)),
      blocks: scene.content.blocks?.filter((block) => !overflowBlockIds.has(block.id)),
      visuals: scene.content.visuals?.filter((visual) => !hoistedIds.has(visual.id) && !overflowVisualIds.has(visual.id)),
      items: hasOverflowItems ? [] : scene.content.items,
    });

    if (overflowLines.length) {
      const end = Math.max(durationInFrames, ...overflowLines.map((line) => line.exitAt ?? durationInFrames));
      overflow.push(
        <Sequence key={`overflow-lines-${scene.id}`} from={from} durationInFrames={end} name={`overflow:${scene.id}:text`}>
          <AbsoluteFill style={{ ...safeAreaPadding, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: textZoneJustify[resolveTextZone(scene.layout, "center")] }}>
            <RichHeadline lines={overflowLines} stagger={scene.motion?.stagger} baseDelay={sceneStartDelay(scene.motion)} motion={scene.motion} durationSeconds={end / project.fps} x={scene.content.richHeadlineX} y={scene.content.richHeadlineY} />
          </AbsoluteFill>
        </Sequence>
      );
    }
    for (const block of overflowBlocks) {
      const end = Math.max(1, block.exitAt ?? durationInFrames);
      overflow.push(<Sequence key={`overflow-block-${scene.id}-${block.id}`} from={from} durationInFrames={end} name={`overflow:${scene.id}:block`}><BlockLayer blocks={[block]} baseDelay={sceneStartDelay(scene.motion)} durationInFrames={end} /></Sequence>);
    }
    for (const visual of overflowVisuals) {
      const end = Math.max(1, visual.exitAt ?? durationInFrames);
      overflow.push(<Sequence key={`overflow-visual-${scene.id}-${visual.id}`} from={from} durationInFrames={end} name={`overflow:${scene.id}:visual`}><VisualsLayer visuals={[visual]} durationSeconds={end / project.fps} baseDelay={sceneStartDelay(scene.motion)} /></Sequence>);
    }
    if (hasOverflowItems) {
      const end = Math.max(durationInFrames, ...(scene.content.items ?? []).map((item) => item.exitAt ?? durationInFrames));
      const Component = getSceneDefinition(scene.type).component;
      const content: Scene["content"] = {
        ...scene.content,
        headline: undefined,
        richHeadline: [],
        blocks: [],
        visuals: [],
      };
      overflow.push(
        <Sequence key={`overflow-items-${scene.id}`} from={from} durationInFrames={end} name={`overflow:${scene.id}:items`}>
          <Component {...scene} content={content} motion={{ ...scene.motion, exit: "none", sfx: "none", exitSfx: "none" }} durationSeconds={end / project.fps} />
        </Sequence>
      );
    }
  }

  return (
    <>
      {timings.map(({ scene, from, durationInFrames, durationSeconds }) => (
        <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
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

      {/* A scene owns these layers, but does not clip them. Their absolute OUT
          can cross any number of later scene cuts. */}
      {overflow}

      {/* Rendered after the scenes so the carried element stays continuous on
          top of the cut it travels across — see `resolveHoistedLinkGroups`. */}
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
};
