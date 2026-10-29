import { Fieldset } from "@mantine/core";
import { useProjectStore } from "../../state/projectStore";
import { EmptyTab } from "../../timeline/ObjectControls";
import {
  EffectsEditor,
  LoopEffectEditor,
  renameEntranceField,
  VisualEffectsEditor,
} from "../../timeline/ObjectEffects";
import { SplitFields } from "../../timeline/ObjectTextSettings";
import type { SelectedObject } from "./selectedObject";

// The "Effects" tab: how the selected object appears, moves and leaves.
export function EffectsTab({ object }: { object: SelectedObject }) {
  switch (object.kind) {
    case "text-line":
      return <TextLineEffects object={object} />;
    case "text-block":
      return <TextBlockEffects object={object} />;
    case "visual":
      return <VisualEffects object={object} />;
    case "scene-text":
      return <SceneTextEffects object={object} />;
    default:
      return <EmptyTab />; // sounds, steps and checklist items have no effects
  }
}

type Of<K extends SelectedObject["kind"]> = {
  object: Extract<SelectedObject, { kind: K }>;
};

// Text in: its split duration doubles as the entrance duration.
function textEntrancePatch(patch: Record<string, unknown>) {
  const { entranceDuration, ...rest } = patch;
  return {
    ...renameEntranceField(rest),
    ...(entranceDuration !== undefined
      ? {
          splitDuration: entranceDuration as number,
          entranceDuration: undefined,
        }
      : {}),
  };
}

// Text N
function TextLineEffects({ object }: Of<"text-line">) {
  const { line, update, sceneEnd } = object;
  return (
    <>
      <Fieldset legend="Text splitting">
        <SplitFields
          text={line.text}
          splitBy={line.splitBy}
          splitDuration={line.splitDuration}
          onChange={update}
        />
      </Fieldset>
      <EffectsEditor
        entrance={line.animation}
        exit={line.exit}
        entranceDuration={line.splitDuration ?? line.entranceDuration}
        exitDuration={line.exitDuration}
        autoEntrance="pop"
        ownsInDuration={false}
        windowFrames={(line.exitAt ?? sceneEnd) - (line.delay ?? 0)}
        onChange={(patch) => update(textEntrancePatch(patch))}
      />
    </>
  );
}

// Text block
function TextBlockEffects({ object }: Of<"text-block">) {
  const { block, update, sceneEnd } = object;
  return (
    <>
      <Fieldset legend="Text splitting">
        <SplitFields
          text={block.text}
          splitBy={block.splitBy}
          splitDuration={block.splitDuration}
          onChange={update}
        />
      </Fieldset>
      <EffectsEditor
        entrance={block.animation}
        exit={block.exit}
        entranceDuration={block.splitDuration ?? block.entranceDuration}
        exitDuration={block.exitDuration}
        autoEntrance="pop"
        ownsInDuration={false}
        windowFrames={(block.exitAt ?? sceneEnd) - (block.delay ?? 0)}
        onChange={(patch) => update(textEntrancePatch(patch))}
      />
    </>
  );
}

// Visual: …
function VisualEffects({ object }: Of<"visual">) {
  const { visual, update, sceneEnd } = object;
  return (
    <>
      <EffectsEditor
        entrance={visual.entrance}
        exit={visual.exit}
        entranceDuration={visual.entranceDuration}
        exitDuration={visual.exitDuration}
        autoEntrance="scaleIn"
        windowFrames={(visual.exitAt ?? sceneEnd) - (visual.delay ?? 0)}
        onChange={update}
      />
      <LoopEffectEditor
        kenBurns={visual.kenBurns}
        kenBurnsSpeed={visual.kenBurnsSpeed}
        onChange={update}
      />
      <VisualEffectsEditor effects={visual.effects} onChange={update} />
    </>
  );
}

// Scene text
function SceneTextEffects({ object }: Of<"scene-text">) {
  const { scene, sceneEnd } = object;
  const updateSceneMotion = useProjectStore((state) => state.updateSceneMotion);
  return (
    <EffectsEditor
      entrance={scene.motion?.entrance}
      exit={scene.motion?.exit}
      entranceDuration={scene.motion?.entranceDuration}
      exitDuration={scene.motion?.exitDuration}
      autoEntrance="fade"
      windowFrames={
        (scene.motion?.exitAt ?? sceneEnd) - (scene.motion?.startDelay ?? 0)
      }
      onChange={(patch) => updateSceneMotion(scene.id, patch)}
    />
  );
}
