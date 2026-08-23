import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import type { Scene } from "../schema/scene";
import { getSceneDefinition } from "../registries/sceneRegistry";
import { transitionStyle } from "./motion/transitions";

const TransitionedScene: React.FC<{ scene: Scene; durationInFrames: number; fps: number }> = ({
  scene,
  durationInFrames,
  fps,
}) => {
  const frameInScene = useCurrentFrame();
  const style = transitionStyle(scene.motion?.transition, { frameInScene, durationInFrames, fps });
  const Component = getSceneDefinition(scene.type).component;

  return (
    <AbsoluteFill style={style}>
      <Component {...scene} />
    </AbsoluteFill>
  );
};

export const SceneRenderer: React.FC<{ scenes: Scene[]; fps: number }> = ({ scenes, fps }) => {
  let startFrame = 0;

  return (
    <>
      {scenes.map((scene) => {
        const durationInFrames = Math.round(scene.durationSeconds * fps);
        const from = startFrame;
        startFrame += durationInFrames;

        return (
          <Sequence key={scene.id} from={from} durationInFrames={durationInFrames} name={scene.id}>
            <TransitionedScene scene={scene} durationInFrames={durationInFrames} fps={fps} />
          </Sequence>
        );
      })}
    </>
  );
};
