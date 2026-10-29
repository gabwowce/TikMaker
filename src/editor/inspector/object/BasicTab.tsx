import { Checkbox, Fieldset, Textarea, TextInput } from "@mantine/core";
import { projectDurationInFrames } from "../../../utils/duration";
import { fontSizes } from "../../../video/typography/tokens";
import { useProjectStore } from "../../state/projectStore";
import { HighlightFields } from "../../timeline/HighlightFields";
import {
  Field,
  FrameSlider,
  PositionFields,
  SliderField,
  TimePoint,
  TimingFields,
} from "../../timeline/ObjectControls";
import {
  KeyframeFields,
  VisualPoseFields,
} from "../../timeline/ObjectKeyframes";
import {
  TextPlacementFields,
  TypographyFields,
} from "../../timeline/ObjectTextSettings";
import { VisualFieldsEditor } from "../VisualFieldsEditor";
import type { SelectedObject } from "./selectedObject";

// The "Basic" tab: content, style, position and timing of the selected object.
export function BasicTab({ object }: { object: SelectedObject }) {
  switch (object.kind) {
    case "audio-clip":
      return <AudioClipBasic object={object} />;
    case "scene-sound":
      return <SceneSoundBasic object={object} />;
    case "visual-sound":
      return <VisualSoundBasic object={object} />;
    case "scene-text":
      return <SceneTextBasic object={object} />;
    case "text-line":
      return <TextLineBasic object={object} />;
    case "text-block":
      return <TextBlockBasic object={object} />;
    case "visual":
      return <VisualBasic object={object} />;
    case "step":
      return <StepBasic object={object} />;
    case "checklist-item":
      return <ChecklistItemBasic object={object} />;
  }
}

type Of<K extends SelectedObject["kind"]> = {
  object: Extract<SelectedObject, { kind: K }>;
};

// Text N (a line of the scene's headline)
function TextLineBasic({ object }: Of<"text-line">) {
  const { line, update, sceneEnd, max } = object;
  return (
    <>
      <Fieldset legend="Content">
        <Field label="Text">
          <Textarea
            rows={3}
            className="w-full"
            value={line.text}
            onChange={(event) => update({ text: event.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-[11px] text-editor-muted cursor-pointer">
          <Checkbox
            checked={line.pill ?? false}
            onChange={(event) =>
              update({ pill: event.target.checked || undefined })
            }
          />
          Pill (light background, dark text)
        </label>
        <HighlightFields
          text={line.text}
          highlights={line.highlights}
          highlightStyle={line.highlightStyle}
          highlightColor={line.highlightColor}
          onChange={update}
        />
      </Fieldset>
      <TypographyFields
        font={line.font}
        defaultFont="tanker"
        textCase={line.textCase}
        defaultCase="upper"
        color={line.color}
        defaultColorHint={line.pill ? "auto · dark" : "auto · white"}
        letterSpacing={line.letterSpacing}
        onChange={update}
      />
      <TextPlacementFields
        x={line.x}
        y={line.y}
        sizePx={line.sizePx}
        sizeFallback={fontSizes[line.size]}
        onChange={update}
      />
      <TimingFields
        start={line.delay ?? 0}
        end={line.exitAt ?? sceneEnd}
        max={max}
        onChange={(delay, exitAt) => update({ delay, exitAt })}
      />
    </>
  );
}

// Text block (added with "+ Text")
function TextBlockBasic({ object }: Of<"text-block">) {
  const { block, update, sceneEnd, max } = object;
  return (
    <>
      <Fieldset legend="Content">
        <Field label="Text">
          <Textarea
            rows={3}
            className="w-full"
            value={block.text}
            onChange={(event) => update({ text: event.target.value })}
          />
        </Field>
      </Fieldset>
      <TypographyFields
        font={block.font}
        defaultFont="tanker"
        textCase={block.textCase}
        defaultCase={(block.font ?? "tanker") === "tanker" ? "upper" : "none"}
        color={block.color}
        defaultColorHint="auto · white"
        letterSpacing={block.letterSpacing}
        onChange={update}
      />
      <PositionFields
        x={block.x}
        y={block.y}
        scale={block.size ?? 52}
        scaleMin={8}
        scaleMax={200}
        scaleLabel="Size"
        onChange={(patch) =>
          update({
            x: patch.x ?? block.x,
            y: patch.y ?? block.y,
            size: patch.scale,
          })
        }
      />
      <TimingFields
        start={block.delay ?? 0}
        end={block.exitAt ?? sceneEnd}
        max={max}
        onChange={(delay, exitAt) => update({ delay, exitAt })}
      />
    </>
  );
}

// Visual: … (picture, logo, recording, diagram …)
function VisualBasic({ object }: Of<"visual">) {
  const { visual, update, scene, sceneFrom, sceneEnd, max } = object;
  return (
    <>
      <Fieldset legend="Content">
        <VisualFieldsEditor
          visual={visual.visual}
          onChange={(nextVisual) => update({ visual: nextVisual })}
        />
      </Fieldset>
      <VisualPoseFields
        sceneId={scene.id}
        entry={visual}
        sceneFrom={sceneFrom}
        onChange={(patch) => update(patch)}
      />
      <KeyframeFields
        sceneId={scene.id}
        entry={visual}
        sceneFrom={sceneFrom}
        max={max}
      />
      <TimingFields
        start={visual.delay ?? 0}
        end={visual.exitAt ?? sceneEnd}
        max={max}
        onChange={(delay, exitAt) => update({ delay, exitAt })}
      />
    </>
  );
}

// Scene text (eyebrow + headline of the older scene types)
function SceneTextBasic({ object }: Of<"scene-text">) {
  const { scene, sceneEnd, max } = object;
  const updateScene = useProjectStore((state) => state.updateScene);
  const updateSceneMotion = useProjectStore((state) => state.updateSceneMotion);
  return (
    <>
      <Fieldset legend="Content">
        <Field label="Eyebrow">
          <TextInput
            className="w-full"
            value={scene.content.eyebrow ?? ""}
            onChange={(event) =>
              updateScene(scene.id, {
                content: {
                  ...scene.content,
                  eyebrow: event.target.value || undefined,
                },
              })
            }
          />
        </Field>
        <Field label="Headline">
          <Textarea
            rows={3}
            className="w-full"
            value={scene.content.headline ?? ""}
            onChange={(event) =>
              updateScene(scene.id, {
                content: {
                  ...scene.content,
                  headline: event.target.value || undefined,
                },
              })
            }
          />
        </Field>
      </Fieldset>
      <TimingFields
        start={scene.motion?.startDelay ?? 0}
        end={scene.motion?.exitAt ?? sceneEnd}
        max={max}
        onChange={(startDelay, exitAt) =>
          updateSceneMotion(scene.id, { startDelay, exitAt })
        }
      />
    </>
  );
}

// Item N of a steps scene
function StepBasic({ object }: Of<"step">) {
  const { item, update, sceneEnd, max } = object;
  return (
    <>
      <Fieldset legend="Content">
        <Field label="Title">
          <TextInput
            className="w-full"
            value={item.label}
            onChange={(event) => update({ label: event.target.value })}
          />
        </Field>
        <Field label="Additional text">
          <Textarea
            rows={2}
            className="w-full"
            value={item.value ?? ""}
            onChange={(event) =>
              update({ value: event.target.value || undefined })
            }
          />
        </Field>
      </Fieldset>
      <TimingFields
        start={item.delay ?? 0}
        end={item.exitAt ?? sceneEnd}
        max={max}
        onChange={(delay, exitAt) => update({ delay, exitAt })}
      />
    </>
  );
}

// Item N of a checklist visual
function ChecklistItemBasic({ object }: Of<"checklist-item">) {
  const { item, update, sceneEnd, max } = object;
  return (
    <>
      <Fieldset legend="Content">
        <Field label="Text">
          <TextInput
            className="w-full"
            value={item.label}
            onChange={(event) => update({ label: event.target.value })}
          />
        </Field>
        <label className="flex items-center gap-2 text-[12px] mb-2">
          <Checkbox
            checked={item.done !== false}
            onChange={(event) => update({ done: event.target.checked })}
          />{" "}
          Checked
        </label>
      </Fieldset>
      <TimingFields
        start={item.delay ?? 0}
        end={item.exitAt ?? sceneEnd}
        max={max}
        onChange={(delay, exitAt) => update({ delay, exitAt })}
      />
    </>
  );
}

// Audio clip (voiceover or sound on the whole-video timeline)
function AudioClipBasic({ object }: Of<"audio-clip">) {
  const { clip, update, project } = object;
  return (
    <>
      <TimePoint
        value={clip.from}
        max={projectDurationInFrames(project)}
        onChange={(from) => update({ from })}
      />
      <Fieldset legend="Trim">
        <FrameSlider
          label="Source IN"
          value={clip.startFrom ?? 0}
          min={0}
          max={Math.max(
            1,
            (clip.startFrom ?? 0) + (clip.durationInFrames ?? 30),
          )}
          fps={project.fps}
          onChange={(startFrom) => update({ startFrom })}
        />
        <FrameSlider
          label="Duration"
          value={clip.durationInFrames ?? 30}
          min={1}
          max={Math.max(30, projectDurationInFrames(project))}
          fps={project.fps}
          onChange={(durationInFrames) => update({ durationInFrames })}
        />
      </Fieldset>
      <SliderField
        label="Volume"
        value={clip.volume ?? 1}
        min={0}
        max={2}
        step={0.05}
        suffix="×"
        onChange={(volume) => update({ volume })}
      />
      <SliderField
        label="Speed"
        value={clip.playbackRate ?? 1}
        min={0.5}
        max={2}
        step={0.05}
        suffix="×"
        onChange={(playbackRate) => {
          const previous = clip.playbackRate ?? 1;
          const length = clip.durationInFrames;
          update({
            playbackRate,
            durationInFrames:
              length === undefined
                ? undefined
                : Math.max(1, Math.round(length * (previous / playbackRate))),
          });
        }}
      />
    </>
  );
}

// Scene IN / OUT sound cue
function SceneSoundBasic({ object }: Of<"scene-sound">) {
  const { scene, isOut, sceneEnd, max, project } = object;
  const updateSceneMotion = useProjectStore((state) => state.updateSceneMotion);
  const motion = scene.motion;
  const cue = isOut
    ? (motion?.exitSfxAt ??
      Math.max(0, (motion?.exitAt ?? sceneEnd) - (motion?.exitDuration ?? 18)))
    : (motion?.sfxAt ?? motion?.startDelay ?? 0);
  const sourceStart = isOut
    ? (motion?.exitSfxStartFrom ?? 0)
    : (motion?.sfxStartFrom ?? 0);
  const soundDuration = isOut
    ? (motion?.exitSfxDuration ?? 30)
    : (motion?.sfxDuration ?? 30);
  return (
    <>
      <TimePoint
        value={cue}
        max={max}
        onChange={(value) =>
          updateSceneMotion(
            scene.id,
            isOut ? { exitSfxAt: value } : { sfxAt: value },
          )
        }
      />
      <Fieldset legend="Trim">
        <FrameSlider
          label="Source IN"
          value={sourceStart}
          min={0}
          max={Math.max(1, sourceStart + soundDuration)}
          fps={project.fps}
          onChange={(value) =>
            updateSceneMotion(
              scene.id,
              isOut ? { exitSfxStartFrom: value } : { sfxStartFrom: value },
            )
          }
        />
        <FrameSlider
          label="Duration"
          value={soundDuration}
          min={1}
          max={Math.max(30, max)}
          fps={project.fps}
          onChange={(value) =>
            updateSceneMotion(
              scene.id,
              isOut ? { exitSfxDuration: value } : { sfxDuration: value },
            )
          }
        />
      </Fieldset>
    </>
  );
}

// IN / OUT sound of a visual
function VisualSoundBasic({ object }: Of<"visual-sound">) {
  const { visual, isOut, update, sceneEnd, max, project } = object;
  const cue = isOut
    ? (visual.exitSfxAt ??
      Math.max(0, (visual.exitAt ?? sceneEnd) - (visual.exitDuration ?? 18)))
    : (visual.sfxAt ?? visual.delay ?? 0);
  const sourceStart = isOut
    ? (visual.exitSfxStartFrom ?? 0)
    : (visual.sfxStartFrom ?? 0);
  const soundDuration = isOut
    ? (visual.exitSfxDuration ?? 30)
    : (visual.sfxDuration ?? 30);
  return (
    <>
      <TimePoint
        value={cue}
        max={max}
        onChange={(value) =>
          update(isOut ? { exitSfxAt: value } : { sfxAt: value })
        }
      />
      <Fieldset legend="Trim">
        <FrameSlider
          label="Source IN"
          value={sourceStart}
          min={0}
          max={Math.max(1, sourceStart + soundDuration)}
          fps={project.fps}
          onChange={(value) =>
            update(
              isOut ? { exitSfxStartFrom: value } : { sfxStartFrom: value },
            )
          }
        />
        <FrameSlider
          label="Duration"
          value={soundDuration}
          min={1}
          max={Math.max(30, max)}
          fps={project.fps}
          onChange={(value) =>
            update(isOut ? { exitSfxDuration: value } : { sfxDuration: value })
          }
        />
      </Fieldset>
    </>
  );
}
