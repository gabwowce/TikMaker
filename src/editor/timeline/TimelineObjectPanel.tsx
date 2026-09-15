import { sceneTimelineEnd } from "./sceneTimelineEnd";
import {
  ActionIcon,
  Checkbox,
  Fieldset,
  Tabs,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useEffect, useState, type ReactNode } from "react";
import {
  computeSceneTimings,
  projectDurationInFrames,
} from "../../utils/duration";
import {
  sceneOnScreenText,
  withOnScreenText,
} from "../../utils/projectStoryPlan";
import { resolveTextEntranceSfx } from "../../video/motion/sfxDefaults";
import { fontSizes } from "../../video/typography/tokens";
import { SfxSelect } from "../inspector/SfxSelect";
import { VisualFieldsEditor } from "../inspector/VisualFieldsEditor";
import { useProjectStore } from "../state/projectStore";
import {
  AudioPair,
  DeleteObjectButton,
  EmptyInspector,
  EmptyTab,
  Field,
  FrameSlider,
  PositionFields,
  SliderField,
  TimePoint,
  TimingFields,
} from "./ObjectControls";
import {
  EffectsEditor,
  LoopEffectEditor,
  renameEntranceField,
} from "./ObjectEffects";
import { KeyframeFields, VisualPoseFields } from "./ObjectKeyframes";
import {
  SplitFields,
  TextPlacementFields,
  TypographyFields,
} from "./ObjectTextSettings";
import { parseSelection } from "./selectionId";

type InspectorTab = "basic" | "effects" | "audio";

type TimelineObjectPanelProps = {
  selectionId: string;
  onClose: () => void;
};

export function TimelineObjectPanel({
  selectionId: rawSelectionId,
  onClose,
}: TimelineObjectPanelProps) {
  const [tab, setTab] = useState<InspectorTab>("basic");
  const project = useProjectStore((state) => state.project);
  const openSceneId = useProjectStore((state) => state.selectedSceneId);
  const updateScene = useProjectStore((state) => state.updateScene);
  const updateSceneMotion = useProjectStore((state) => state.updateSceneMotion);
  const updateSceneRichHeadline = useProjectStore(
    (state) => state.updateSceneRichHeadline,
  );
  const updateSceneBlocks = useProjectStore((state) => state.updateSceneBlocks);
  const updateSceneVisuals = useProjectStore(
    (state) => state.updateSceneVisuals,
  );
  const updateSceneItems = useProjectStore((state) => state.updateSceneItems);
  const updateAudioClip = useProjectStore((state) => state.updateAudioClip);
  useEffect(() => setTab("basic"), [rawSelectionId]);
  const parsed = parseSelection(rawSelectionId);
  const selectionId = parsed.objectId;
  const selectedSceneId = parsed.sceneId ?? openSceneId;
  const timing = computeSceneTimings(project).find(
    (entry) => entry.scene.id === selectedSceneId,
  );
  if (!timing || !selectedSceneId) return <EmptyInspector onClose={onClose} />;
  const scene = timing.scene;
  const lines = scene.content.richHeadline ?? [];
  const blocks = scene.content.blocks ?? [];
  const visuals = scene.content.visuals ?? [];
  const steps = scene.content.items ?? [];
  const sceneEnd = timing.durationInFrames;
  const max = sceneTimelineEnd(project, timing);
  let title = "Object";
  let subtitle = "Timeline object";
  let basic: ReactNode = null;
  let effects: ReactNode = null;
  let audio: ReactNode = null;
  const lineIndex = /^line-(\d+)$/.exec(selectionId)?.[1];
  const blockId = selectionId.startsWith("block-")
    ? selectionId.slice(6)
    : null;
  const visualId = selectionId.startsWith("visual-")
    ? selectionId.slice(7)
    : null;
  const stepIndex = /^step-(\d+)$/.exec(selectionId)?.[1];
  const checkMatch = /^check-(.+)-(\d+)$/.exec(selectionId);
  const sceneSound = /^sound-scene-(in|out)$/.exec(selectionId)?.[1] as
    | "in"
    | "out"
    | undefined;
  const visualSound = /^sound-visual-(.+)-(in|out)$/.exec(selectionId);
  const audioClipId = selectionId.startsWith("audio-clip-")
    ? selectionId.slice(11)
    : null;
  if (audioClipId) {
    const clip = (project.audioClips ?? []).find(
      (value) => value.id === audioClipId,
    );
    if (!clip) return <EmptyInspector onClose={onClose} />;
    title = "Audio clip";
    subtitle = "Global audio";
    basic = (
      <>
        <TimePoint
          value={clip.from}
          max={projectDurationInFrames(project)}
          onChange={(from) => updateAudioClip(clip.id, { from })}
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
            onChange={(startFrom) => updateAudioClip(clip.id, { startFrom })}
          />
          <FrameSlider
            label="Duration"
            value={clip.durationInFrames ?? 30}
            min={1}
            max={Math.max(30, projectDurationInFrames(project))}
            fps={project.fps}
            onChange={(durationInFrames) =>
              updateAudioClip(clip.id, { durationInFrames })
            }
          />
        </Fieldset>
        <SliderField
          label="Volume"
          value={clip.volume ?? 1}
          min={0}
          max={2}
          step={0.05}
          suffix="×"
          onChange={(volume) => updateAudioClip(clip.id, { volume })}
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
            updateAudioClip(clip.id, {
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
    audio = (
      <Fieldset legend="Sound">
        <Field label="Sound effect">
          <SfxSelect
            mode="explicit"
            value={clip.sfxId}
            onChange={(sfxId) => sfxId && updateAudioClip(clip.id, { sfxId })}
          />
        </Field>
      </Fieldset>
    );
  } else if (sceneSound) {
    const isOut = sceneSound === "out";
    const cue = isOut
      ? (scene.motion?.exitSfxAt ??
        Math.max(
          0,
          (scene.motion?.exitAt ?? sceneEnd) -
            (scene.motion?.exitDuration ?? 18),
        ))
      : (scene.motion?.sfxAt ?? scene.motion?.startDelay ?? 0);
    const sourceStart = isOut
      ? (scene.motion?.exitSfxStartFrom ?? 0)
      : (scene.motion?.sfxStartFrom ?? 0);
    const soundDuration = isOut
      ? (scene.motion?.exitSfxDuration ?? 30)
      : (scene.motion?.sfxDuration ?? 30);
    title = `Scene ${isOut ? "OUT" : "IN"} sound`;
    subtitle = "Timeline sound cue";
    basic = (
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
    audio = (
      <Fieldset legend="Sound">
        <Field label="Sound effect">
          <SfxSelect
            mode="auto"
            value={isOut ? scene.motion?.exitSfx : scene.motion?.sfx}
            onChange={(value) =>
              updateSceneMotion(
                scene.id,
                isOut ? { exitSfx: value } : { sfx: value },
              )
            }
          />
        </Field>
      </Fieldset>
    );
  } else if (visualSound) {
    const id = visualSound[1];
    const isOut = visualSound[2] === "out";
    const index = visuals.findIndex((entry) => entry.id === id);
    const visual = visuals[index];
    if (!visual) return <EmptyInspector onClose={onClose} />;
    function update(patch: Partial<typeof visual>) {
      return updateSceneVisuals(
        scene.id,
        visuals.map((value, at) =>
          at === index ? { ...value, ...patch } : value,
        ),
      );
    }
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
    title = `${isOut ? "OUT" : "IN"} sound`;
    subtitle = "Selected visual's sound";
    basic = (
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
              update(
                isOut ? { exitSfxDuration: value } : { sfxDuration: value },
              )
            }
          />
        </Fieldset>
      </>
    );
    audio = (
      <Fieldset legend="Sound">
        <Field label="Sound effect">
          <SfxSelect
            mode="explicit"
            value={isOut ? visual.exitSfx : visual.sfx}
            onChange={(value) =>
              update(isOut ? { exitSfx: value } : { sfx: value })
            }
          />
        </Field>
      </Fieldset>
    );
  } else if (selectionId === "text-group") {
    title = "Scene text";
    subtitle = "Text and timing";
    basic = (
      <>
        <Fieldset legend="Content">
          <Field label="On-screen text">
            <Textarea
              rows={4}
              className="w-full"
              value={sceneOnScreenText(scene)}
              onChange={(event) =>
                updateScene(
                  scene.id,
                  withOnScreenText(scene, event.target.value),
                )
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
    effects = (
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
    audio = (
      <AudioPair
        entrance={scene.motion?.sfx}
        exit={scene.motion?.exitSfx}
        mode="auto"
        onEntrance={(sfx) => updateSceneMotion(scene.id, { sfx })}
        onExit={(exitSfx) => updateSceneMotion(scene.id, { exitSfx })}
      />
    );
  } else if (lineIndex !== undefined && lines[Number(lineIndex)]) {
    const index = Number(lineIndex);
    const line = lines[index];
    function update(patch: Partial<typeof line>) {
      return updateSceneRichHeadline(
        scene.id,
        lines.map((value, at) =>
          at === index ? { ...value, ...patch } : value,
        ),
      );
    }
    title = `Text ${index + 1}`;
    subtitle = "Rich headline line";
    basic = (
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
    effects = (
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
          onChange={(patch) => {
            const { entranceDuration, ...rest } = patch;
            update({
              ...renameEntranceField(rest),
              ...(entranceDuration !== undefined
                ? {
                    splitDuration: entranceDuration,
                    entranceDuration: undefined,
                  }
                : {}),
            });
          }}
        />
      </>
    );
    audio = (
      <AudioPair
        entrance={line.sfx}
        mode="auto"
        autoEntranceSfx={resolveTextEntranceSfx({
          entrance: line.animation ?? "pop",
          splitBy: line.splitBy ?? "word",
        })}
        onEntrance={(sfx) => update({ sfx })}
      />
    );
  } else if (blockId) {
    const index = blocks.findIndex((item) => item.id === blockId);
    const block = blocks[index];
    if (!block) return <EmptyInspector onClose={onClose} />;
    function update(patch: Partial<typeof block>) {
      return updateSceneBlocks(
        scene.id,
        blocks.map((value, at) =>
          at === index ? { ...value, ...patch } : value,
        ),
      );
    }
    title = "Text block";
    subtitle = block.type;
    basic = (
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
    effects = (
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
          onChange={(patch) => {
            const { entranceDuration, ...rest } = patch;
            update({
              ...renameEntranceField(rest),
              ...(entranceDuration !== undefined
                ? {
                    splitDuration: entranceDuration,
                    entranceDuration: undefined,
                  }
                : {}),
            });
          }}
        />
      </>
    );
    audio = (
      <AudioPair
        entrance={block.sfx}
        mode="auto"
        autoEntranceSfx={resolveTextEntranceSfx({
          entrance: block.animation ?? "pop",
          splitBy: block.splitBy ?? "word",
        })}
        onEntrance={(sfx) => update({ sfx })}
      />
    );
  } else if (visualId) {
    const index = visuals.findIndex((item) => item.id === visualId);
    const visual = visuals[index];
    if (!visual) return <EmptyInspector onClose={onClose} />;
    function update(patch: Partial<typeof visual>) {
      return updateSceneVisuals(
        scene.id,
        visuals.map((value, at) =>
          at === index ? { ...value, ...patch } : value,
        ),
      );
    }
    title = "Visual";
    subtitle = visual.visual.type;
    basic = (
      <>
        <Fieldset legend="Content">
          <VisualFieldsEditor
            visual={visual.visual}
            onChange={(nextVisual) => update({ visual: nextVisual })}
          />
        </Fieldset>
        <VisualPoseFields
          sceneId={selectedSceneId}
          entry={visual}
          sceneFrom={timing.from}
          onChange={(patch) => update(patch)}
        />
        <KeyframeFields
          sceneId={selectedSceneId}
          entry={visual}
          sceneFrom={timing.from}
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
    effects = (
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
      </>
    );
    audio = (
      <AudioPair
        entrance={visual.sfx}
        exit={visual.exitSfx}
        mode="explicit"
        onEntrance={(sfx) => update({ sfx })}
        onExit={(exitSfx) => update({ exitSfx })}
      />
    );
  } else if (stepIndex !== undefined && steps[Number(stepIndex)]) {
    const index = Number(stepIndex);
    const item = steps[index];
    function update(patch: Partial<typeof item>) {
      return updateSceneItems(
        scene.id,
        steps.map((value, at) =>
          at === index ? { ...value, ...patch } : value,
        ),
      );
    }
    title = `Item ${index + 1}`;
    subtitle = "Scene item";
    basic = (
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
  } else if (checkMatch) {
    const itemIndex = Number(checkMatch[2]);
    const id = checkMatch[1];
    const visualIndex = visuals.findIndex(
      (entry) => entry.id === id && entry.visual.type === "checklist",
    );
    const entry = visuals[visualIndex];
    const checklist = entry?.visual.type === "checklist" ? entry.visual : null;
    const item = checklist?.items[itemIndex];
    if (!entry || !checklist || !item)
      return <EmptyInspector onClose={onClose} />;
    function update(patch: Partial<typeof item>) {
      if (!checklist) return;
      return updateSceneVisuals(
        scene.id,
        visuals.map((value, at) =>
          at === visualIndex
            ? {
                ...value,
                visual: {
                  ...checklist,
                  items: checklist.items.map((current, atItem) =>
                    atItem === itemIndex ? { ...current, ...patch } : current,
                  ),
                },
              }
            : value,
        ),
      );
    }
    title = `Item ${itemIndex + 1}`;
    subtitle = "Checklist item";
    basic = (
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
  } else {
    return <EmptyInspector onClose={onClose} />;
  }
  const tabs: {
    id: InspectorTab;
    label: string;
    content: ReactNode;
  }[] = [
    { id: "basic", label: "Basic", content: basic },
    { id: "effects", label: "Effects", content: effects },
    { id: "audio", label: "Audio", content: audio },
  ];
  return (
    <aside className="editor-ui w-[clamp(300px,_23vw,_480px)] shrink-0 min-h-0 flex flex-col border-0 border-l border-solid border-editor-border bg-editor-panel text-editor-text">
      <div className="flex justify-between items-start p-[16px_16px_12px] shrink-0">
        <div>
          <div className="text-[14px] font-bold">{title}</div>
          <div className="text-[10px] text-editor-muted mt-0.5">{subtitle}</div>
        </div>
        <ActionIcon
          variant="default"
          onClick={onClose}
          className="w-7"
          aria-label="Back to scene settings"
        >
          ×
        </ActionIcon>
      </div>
      <Tabs
        value={tab}
        onChange={(value) => setTab(value as InspectorTab)}
        className="mx-4 mb-2"
      >
        <Tabs.List grow>
          {tabs.map((item) => (
            <Tabs.Tab key={item.id} value={item.id}>
              {item.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <div className="flex-1 min-h-0 overflow-y-auto p-[4px_16px_20px]">
        {tabs.find((item) => item.id === tab)?.content ?? <EmptyTab />}
        {tab === "basic" ? (
          <DeleteObjectButton
            selectionId={rawSelectionId}
            onDeleted={onClose}
          />
        ) : null}
      </div>
    </aside>
  );
}
