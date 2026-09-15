import { type ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import {
  resolveTextZone,
  textZoneJustify,
  type TextZone,
} from "../layout/layoutPresets";
import { SceneSfx } from "../motion/SceneSfx";
import { BlockLayer } from "../typography/BlockLayer";
import { RichHeadline } from "../typography/RichHeadline";
import { safeAreaPadding } from "../typography/SafeArea";
import { VisualsLayer } from "../typography/VisualsLayer";
import {
  EnterOnCue,
  sceneStartDelay,
  staggerDelay,
  useSceneExitStyle,
} from "./EnterOnCue";
import type { SceneComponentProps } from "./types";
type SceneFrameProps = {
  content: SceneComponentProps["content"];
  motion: SceneComponentProps["motion"];
  durationSeconds: number;
  layout?: SceneComponentProps["layout"];
  textZone?: TextZone;
  gap?: number;
  children?: ReactNode;
};
export function SceneFrame({
  content,
  motion,
  durationSeconds,
  layout,
  textZone = "center",
  gap = 40,
  children,
}: SceneFrameProps) {
  const { fps } = useVideoConfig();
  const sharedExitStyle = useSceneExitStyle(durationSeconds, motion);
  const exitStyle = content.richHeadline?.length ? {} : sharedExitStyle;
  const baseDelay = sceneStartDelay(motion);
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          ...safeAreaPadding,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: textZoneJustify[resolveTextZone(layout, textZone)],
          gap,
          ...exitStyle,
        }}
      >
        {children}
      </AbsoluteFill>

      <BlockLayer
        blocks={content.blocks}
        baseDelay={baseDelay}
        durationInFrames={Math.round(durationSeconds * fps)}
      />
      <VisualsLayer
        visuals={content.visuals}
        durationSeconds={durationSeconds}
        baseDelay={baseDelay}
      />
      <SceneSfx motion={motion} durationSeconds={durationSeconds} />
    </AbsoluteFill>
  );
}
// Scenos antraštė. Po parseProject visas tekstas yra richHeadline, todėl
// atskiro content.headline kelio nebėra — septynios scenos piešė tą patį.
export function SceneHeadline({
  content,
  motion,
  durationSeconds,
}: {
  content: SceneComponentProps["content"];
  motion: SceneComponentProps["motion"];
  durationSeconds: number;
}) {
  if (!content.richHeadline?.length) return null;
  return (
    <RichHeadline
      lines={content.richHeadline}
      stagger={motion?.stagger}
      baseDelay={sceneStartDelay(motion)}
      motion={motion}
      durationSeconds={durationSeconds}
      x={content.richHeadlineX}
      y={content.richHeadlineY}
    />
  );
}
export function useSceneCues(motion: SceneComponentProps["motion"]) {
  const baseDelay = sceneStartDelay(motion);
  return {
    baseDelay,
    cue: (index: number) => staggerDelay(index, motion?.stagger, baseDelay),
  };
}
type SceneCueProps = {
  motion: SceneComponentProps["motion"];
  delay: number;
  fallback?: "fade" | "slideUp";
  children: ReactNode;
};
export function SceneCue({
  motion,
  delay,
  fallback = "fade",
  children,
}: SceneCueProps) {
  return (
    <EnterOnCue
      distance={motion?.entranceDistance}
      duration={motion?.entranceDuration}
      preset={motion?.entrance ?? fallback}
      delay={delay}
    >
      {children}
    </EnterOnCue>
  );
}
