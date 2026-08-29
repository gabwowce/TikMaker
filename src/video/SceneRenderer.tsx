import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import type { Scene } from "../schema/scene";
import { getSceneDefinition } from "../registries/sceneRegistry";
import { transitionStyle } from "./motion/transitions";
import { computeSceneTimings } from "../utils/duration";
import { resolveHoistedLinkGroups, hoistedOwnership } from "../utils/visualLinks";
import { LinkedVisual } from "./typography/LinkedVisual";
import type { VideoProject } from "../schema/project";

const TransitionedScene: React.FC<{
  scene: Scene;
  durationInFrames: number;
  durationSeconds: number;
  fps: number;
  /** Ids of this scene's `content.visuals[]` entries drawn by a hoisted chain
   * instead of by the scene, so the asset isn't rendered twice. */
  hoistedLayerIds?: Set<string>;
}> = ({ scene, durationInFrames, durationSeconds, fps, hoistedLayerIds }) => {
  const frameInScene = useCurrentFrame();
  const style = transitionStyle(scene.motion?.transition, { frameInScene, durationInFrames, fps });
  const Component = getSceneDefinition(scene.type).component;

  return (
    <AbsoluteFill style={style}>
      <Component
        {...scene}
        content={
          hoistedLayerIds?.size
            ? { ...scene.content, visuals: scene.content.visuals?.filter((v) => !hoistedLayerIds.has(v.id)) }
            : scene.content
        }
        durationSeconds={durationSeconds}
      />
    </AbsoluteFill>
  );
};

export const SceneRenderer: React.FC<{ project: VideoProject }> = ({ project }) => {
  const timings = computeSceneTimings(project);
  const linkGroups = resolveHoistedLinkGroups(timings);
  const hoisted = hoistedOwnership(linkGroups);

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
          />
        </Sequence>
      ))}

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
