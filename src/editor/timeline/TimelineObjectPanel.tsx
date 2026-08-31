import React from "react";
import { entrancePresetSchema, exitPresetSchema, kenBurnsPresetSchema, richTextSplitBySchema, type EntrancePreset, type ExitPreset, type KenBurnsPreset } from "../../schema/scene";
import { computeSceneTimings, projectDurationInFrames } from "../../utils/duration";
import { splitSpan, splitText } from "../../video/typography/splitAnimate";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";
import { SfxSelect, VisualFieldsEditor } from "../panels/InspectorPanel";
import { confirmDeleteTimelineObject, describeTimelineObject } from "./deleteTimelineObject";
import { hasKeyframePath, keyframeAtFrame, poseAtFrame, sortedKeyframes } from "../../video/layout/visualKeyframes";
import type { PositionedVisualEntry } from "../../schema/scene";

type InspectorTab = "basic" | "effects" | "audio";

export const TimelineObjectPanel: React.FC<{ selectionId: string; onClose: () => void }> = ({ selectionId, onClose }) => {
  const [tab, setTab] = React.useState<InspectorTab>("basic");
  const project = useProjectStore((state) => state.project);
  const selectedSceneId = useProjectStore((state) => state.selectedSceneId);
  const updateScene = useProjectStore((state) => state.updateScene);
  const updateSceneMotion = useProjectStore((state) => state.updateSceneMotion);
  const updateSceneRichHeadline = useProjectStore((state) => state.updateSceneRichHeadline);
  const updateSceneBlocks = useProjectStore((state) => state.updateSceneBlocks);
  const updateSceneVisuals = useProjectStore((state) => state.updateSceneVisuals);
  const updateSceneItems = useProjectStore((state) => state.updateSceneItems);
  const updateAudioClip = useProjectStore((state) => state.updateAudioClip);

  React.useEffect(() => setTab("basic"), [selectionId]);

  const timing = computeSceneTimings(project).find((entry) => entry.scene.id === selectedSceneId);
  if (!timing || !selectedSceneId) return <EmptyInspector onClose={onClose} />;
  const scene = timing.scene;
  const lines = scene.content.richHeadline ?? [];
  const blocks = scene.content.blocks ?? [];
  const visuals = scene.content.visuals ?? [];
  const steps = scene.content.items ?? [];
  const sceneEnd = timing.durationInFrames;
  const explicitEnd = Math.max(
    scene.motion?.exitAt ?? sceneEnd,
    ...lines.map((line) => line.exitAt ?? sceneEnd),
    ...blocks.map((block) => block.exitAt ?? sceneEnd),
    ...visuals.flatMap((entry) => [entry.exitAt ?? sceneEnd, ...(entry.visual.type === "checklist" ? entry.visual.items.map((item) => item.exitAt ?? entry.exitAt ?? sceneEnd) : [])]),
    ...steps.map((item) => item.exitAt ?? sceneEnd),
  );
  const max = Math.max(sceneEnd * 2, projectDurationInFrames(project) - timing.from, explicitEnd);

  let title = "Objektas";
  let subtitle = "Timeline objektas";
  let basic: React.ReactNode = null;
  let effects: React.ReactNode = null;
  let audio: React.ReactNode = null;

  const lineIndex = /^line-(\d+)$/.exec(selectionId)?.[1];
  const blockId = selectionId.startsWith("block-") ? selectionId.slice(6) : null;
  const visualId = selectionId.startsWith("visual-") ? selectionId.slice(7) : null;
  const stepIndex = /^step-(\d+)$/.exec(selectionId)?.[1];
  const checkMatch = /^check-(.+)-(\d+)$/.exec(selectionId);
  const sceneSound = /^sound-scene-(in|out)$/.exec(selectionId)?.[1] as "in" | "out" | undefined;
  const visualSound = /^sound-visual-(.+)-(in|out)$/.exec(selectionId);
  const audioClipId = selectionId.startsWith("audio-clip-") ? selectionId.slice(11) : null;

  if (audioClipId) {
    const clip = (project.audioClips ?? []).find((value) => value.id === audioClipId);
    if (!clip) return <EmptyInspector onClose={onClose} />;
    title = "Audio klipas";
    subtitle = "Globalus garsas";
    basic = <><TimePoint value={clip.from} max={projectDurationInFrames(project)} onChange={(from) => updateAudioClip(clip.id, { from })} /><Section title="Apkarpymas"><FrameSlider label="Šaltinio IN" value={clip.startFrom ?? 0} min={0} max={Math.max(1, (clip.startFrom ?? 0) + (clip.durationInFrames ?? 30))} fps={project.fps} onChange={(startFrom) => updateAudioClip(clip.id, { startFrom })} /><FrameSlider label="Trukmė" value={clip.durationInFrames ?? 30} min={1} max={Math.max(30, projectDurationInFrames(project))} fps={project.fps} onChange={(durationInFrames) => updateAudioClip(clip.id, { durationInFrames })} /></Section><SliderField label="Garsumas" value={clip.volume ?? 1} min={0} max={2} step={0.05} suffix="×" onChange={(volume) => updateAudioClip(clip.id, { volume })} /></>;
    audio = <Section title="Garsas"><Field label="Garso efektas"><SfxSelect mode="explicit" value={clip.sfxId} onChange={(sfxId) => sfxId && updateAudioClip(clip.id, { sfxId })} /></Field></Section>;
  } else if (sceneSound) {
    const isOut = sceneSound === "out";
    const cue = isOut ? (scene.motion?.exitSfxAt ?? Math.max(0, (scene.motion?.exitAt ?? sceneEnd) - (scene.motion?.exitDuration ?? 18))) : (scene.motion?.sfxAt ?? scene.motion?.startDelay ?? 0);
    const sourceStart = isOut ? scene.motion?.exitSfxStartFrom ?? 0 : scene.motion?.sfxStartFrom ?? 0;
    const soundDuration = isOut ? scene.motion?.exitSfxDuration ?? 30 : scene.motion?.sfxDuration ?? 30;
    title = `Scenos ${isOut ? "OUT" : "IN"} garsas`;
    subtitle = "Timeline garso žymė";
    basic = <><TimePoint value={cue} max={max} onChange={(value) => updateSceneMotion(selectedSceneId, isOut ? { exitSfxAt: value } : { sfxAt: value })} /><Section title="Apkarpymas"><FrameSlider label="Šaltinio IN" value={sourceStart} min={0} max={Math.max(1, sourceStart + soundDuration)} fps={project.fps} onChange={(value) => updateSceneMotion(selectedSceneId, isOut ? { exitSfxStartFrom: value } : { sfxStartFrom: value })} /><FrameSlider label="Trukmė" value={soundDuration} min={1} max={Math.max(30, max)} fps={project.fps} onChange={(value) => updateSceneMotion(selectedSceneId, isOut ? { exitSfxDuration: value } : { sfxDuration: value })} /></Section></>;
    audio = <Section title="Garsas"><Field label="Garso efektas"><SfxSelect mode="auto" value={isOut ? scene.motion?.exitSfx : scene.motion?.sfx} onChange={(value) => updateSceneMotion(selectedSceneId, isOut ? { exitSfx: value } : { sfx: value })} /></Field></Section>;
  } else if (visualSound) {
    const id = visualSound[1];
    const isOut = visualSound[2] === "out";
    const index = visuals.findIndex((entry) => entry.id === id);
    const visual = visuals[index];
    if (!visual) return <EmptyInspector onClose={onClose} />;
    const update = (patch: Partial<typeof visual>) => updateSceneVisuals(selectedSceneId, visuals.map((value, at) => at === index ? { ...value, ...patch } : value));
    const cue = isOut ? (visual.exitSfxAt ?? Math.max(0, (visual.exitAt ?? sceneEnd) - (visual.exitDuration ?? 18))) : (visual.sfxAt ?? visual.delay ?? 0);
    const sourceStart = isOut ? visual.exitSfxStartFrom ?? 0 : visual.sfxStartFrom ?? 0;
    const soundDuration = isOut ? visual.exitSfxDuration ?? 30 : visual.sfxDuration ?? 30;
    title = `${isOut ? "OUT" : "IN"} garsas`;
    subtitle = "Pasirinkto vizualo garsas";
    basic = <><TimePoint value={cue} max={max} onChange={(value) => update(isOut ? { exitSfxAt: value } : { sfxAt: value })} /><Section title="Apkarpymas"><FrameSlider label="Šaltinio IN" value={sourceStart} min={0} max={Math.max(1, sourceStart + soundDuration)} fps={project.fps} onChange={(value) => update(isOut ? { exitSfxStartFrom: value } : { sfxStartFrom: value })} /><FrameSlider label="Trukmė" value={soundDuration} min={1} max={Math.max(30, max)} fps={project.fps} onChange={(value) => update(isOut ? { exitSfxDuration: value } : { sfxDuration: value })} /></Section></>;
    audio = <Section title="Garsas"><Field label="Garso efektas"><SfxSelect mode="explicit" value={isOut ? visual.exitSfx : visual.sfx} onChange={(value) => update(isOut ? { exitSfx: value } : { sfx: value })} /></Field></Section>;
  } else if (selectionId === "text-group") {
    title = "Scenos tekstai";
    subtitle = "Tekstas ir jo laikas";
    basic = <><Section title="Turinys"><Field label="Eyebrow"><input style={inputStyle} value={scene.content.eyebrow ?? ""} onChange={(event) => updateScene(selectedSceneId, { content: { ...scene.content, eyebrow: event.target.value || undefined } })} /></Field><Field label="Headline"><textarea rows={3} style={inputStyle} value={scene.content.headline ?? ""} onChange={(event) => updateScene(selectedSceneId, { content: { ...scene.content, headline: event.target.value || undefined } })} /></Field></Section><TimingFields start={scene.motion?.startDelay ?? 0} end={scene.motion?.exitAt ?? sceneEnd} max={max} onChange={(startDelay, exitAt) => updateSceneMotion(selectedSceneId, { startDelay, exitAt })} /></>;
    effects = <EffectsEditor entrance={scene.motion?.entrance} exit={scene.motion?.exit} entranceDuration={scene.motion?.entranceDuration} exitDuration={scene.motion?.exitDuration} autoEntrance="fade" windowFrames={(scene.motion?.exitAt ?? sceneEnd) - (scene.motion?.startDelay ?? 0)} onChange={(patch) => updateSceneMotion(selectedSceneId, patch)} />;
    audio = <AudioPair entrance={scene.motion?.sfx} exit={scene.motion?.exitSfx} mode="auto" onEntrance={(sfx) => updateSceneMotion(selectedSceneId, { sfx })} onExit={(exitSfx) => updateSceneMotion(selectedSceneId, { exitSfx })} />;
  } else if (lineIndex !== undefined && lines[Number(lineIndex)]) {
    const index = Number(lineIndex);
    const line = lines[index];
    const update = (patch: Partial<typeof line>) => updateSceneRichHeadline(selectedSceneId, lines.map((value, at) => at === index ? { ...value, ...patch } : value));
    title = `Tekstas ${index + 1}`;
    subtitle = "Rich Headline eilutė";
    basic = <><Section title="Turinys"><Field label="Tekstas"><textarea rows={3} style={inputStyle} value={line.text} onChange={(event) => update({ text: event.target.value })} /></Field><SplitFields text={line.text} splitBy={line.splitBy} splitDuration={line.splitDuration} onChange={update} /></Section><TimingFields start={line.delay ?? 0} end={line.exitAt ?? sceneEnd} max={max} onChange={(delay, exitAt) => update({ delay, exitAt })} /></>;
    effects = <EffectsEditor entrance={line.animation} exit={line.exit} entranceDuration={line.splitDuration ?? line.entranceDuration} exitDuration={line.exitDuration} autoEntrance="pop" windowFrames={(line.exitAt ?? sceneEnd) - (line.delay ?? 0)} onChange={(patch) => {
      const { entranceDuration, ...rest } = patch;
      update({ ...renameEntranceField(rest), ...(entranceDuration !== undefined ? { splitDuration: entranceDuration, entranceDuration: undefined } : {}) });
    }} />;
    audio = <AudioPair entrance={line.sfx} mode="explicit" onEntrance={(sfx) => update({ sfx })} />;
  } else if (blockId) {
    const index = blocks.findIndex((item) => item.id === blockId);
    const block = blocks[index];
    if (!block) return <EmptyInspector onClose={onClose} />;
    const update = (patch: Partial<typeof block>) => updateSceneBlocks(selectedSceneId, blocks.map((value, at) => at === index ? { ...value, ...patch } : value));
    title = "Teksto blokas";
    subtitle = block.type;
    basic = <><Section title="Turinys"><Field label="Tekstas"><textarea rows={3} style={inputStyle} value={block.text} onChange={(event) => update({ text: event.target.value })} /></Field><SplitFields text={block.text} splitBy={block.splitBy} splitDuration={block.splitDuration} onChange={update} /></Section><PositionFields x={block.x} y={block.y} scale={block.size ?? 52} scaleMin={8} scaleMax={200} scaleLabel="Dydis" onChange={(patch) => update({ x: patch.x ?? block.x, y: patch.y ?? block.y, size: patch.scale })} /><TimingFields start={block.delay ?? 0} end={block.exitAt ?? sceneEnd} max={max} onChange={(delay, exitAt) => update({ delay, exitAt })} /></>;
    effects = <EffectsEditor entrance={block.animation} exit={block.exit} entranceDuration={block.splitDuration ?? block.entranceDuration} exitDuration={block.exitDuration} autoEntrance="pop" windowFrames={(block.exitAt ?? sceneEnd) - (block.delay ?? 0)} onChange={(patch) => {
      const { entranceDuration, ...rest } = patch;
      update({ ...renameEntranceField(rest), ...(entranceDuration !== undefined ? { splitDuration: entranceDuration, entranceDuration: undefined } : {}) });
    }} />;
    audio = <AudioPair entrance={block.sfx} mode="explicit" onEntrance={(sfx) => update({ sfx })} />;
  } else if (visualId) {
    const index = visuals.findIndex((item) => item.id === visualId);
    const visual = visuals[index];
    if (!visual) return <EmptyInspector onClose={onClose} />;
    const update = (patch: Partial<typeof visual>) => updateSceneVisuals(selectedSceneId, visuals.map((value, at) => at === index ? { ...value, ...patch } : value));
    title = "Vizualas";
    subtitle = visual.visual.type;
    basic = <><Section title="Turinys"><VisualFieldsEditor visual={visual.visual} onChange={(nextVisual) => update({ visual: nextVisual })} /></Section><VisualPoseFields sceneId={selectedSceneId} entry={visual} sceneFrom={timing.from} onChange={(patch) => update(patch)} /><KeyframeFields sceneId={selectedSceneId} entry={visual} sceneFrom={timing.from} max={max} /><TimingFields start={visual.delay ?? 0} end={visual.exitAt ?? sceneEnd} max={max} onChange={(delay, exitAt) => update({ delay, exitAt })} /></>;
    effects = <><EffectsEditor entrance={visual.entrance} exit={visual.exit} entranceDuration={visual.entranceDuration} exitDuration={visual.exitDuration} autoEntrance="scaleIn" windowFrames={(visual.exitAt ?? sceneEnd) - (visual.delay ?? 0)} onChange={update} /><LoopEffectEditor kenBurns={visual.kenBurns} kenBurnsSpeed={visual.kenBurnsSpeed} onChange={update} /></>;
    audio = <AudioPair entrance={visual.sfx} exit={visual.exitSfx} mode="explicit" onEntrance={(sfx) => update({ sfx })} onExit={(exitSfx) => update({ exitSfx })} />;
  } else if (stepIndex !== undefined && steps[Number(stepIndex)]) {
    const index = Number(stepIndex);
    const item = steps[index];
    const update = (patch: Partial<typeof item>) => updateSceneItems(selectedSceneId, steps.map((value, at) => at === index ? { ...value, ...patch } : value));
    title = `Punktas ${index + 1}`;
    subtitle = "Scenos elementas";
    basic = <><Section title="Turinys"><Field label="Pavadinimas"><input style={inputStyle} value={item.label} onChange={(event) => update({ label: event.target.value })} /></Field><Field label="Papildomas tekstas"><textarea rows={2} style={inputStyle} value={item.value ?? ""} onChange={(event) => update({ value: event.target.value || undefined })} /></Field></Section><TimingFields start={item.delay ?? 0} end={item.exitAt ?? sceneEnd} max={max} onChange={(delay, exitAt) => update({ delay, exitAt })} /></>;
  } else if (checkMatch) {
    const itemIndex = Number(checkMatch[2]);
    const id = checkMatch[1];
    const visualIndex = visuals.findIndex((entry) => entry.id === id && entry.visual.type === "checklist");
    const entry = visuals[visualIndex];
    const checklist = entry?.visual.type === "checklist" ? entry.visual : null;
    const item = checklist?.items[itemIndex];
    if (!entry || !checklist || !item) return <EmptyInspector onClose={onClose} />;
    const update = (patch: Partial<typeof item>) => updateSceneVisuals(selectedSceneId, visuals.map((value, at) => at === visualIndex ? { ...value, visual: { ...checklist, items: checklist.items.map((current, atItem) => atItem === itemIndex ? { ...current, ...patch } : current) } } : value));
    title = `Punktas ${itemIndex + 1}`;
    subtitle = "Checklist elementas";
    basic = <><Section title="Turinys"><Field label="Tekstas"><input style={inputStyle} value={item.label} onChange={(event) => update({ label: event.target.value })} /></Field><label style={checkStyle}><input type="checkbox" checked={item.done !== false} onChange={(event) => update({ done: event.target.checked })} /> Pažymėtas</label></Section><TimingFields start={item.delay ?? 0} end={item.exitAt ?? sceneEnd} max={max} onChange={(delay, exitAt) => update({ delay, exitAt })} /></>;
  } else {
    return <EmptyInspector onClose={onClose} />;
  }

  const tabs: { id: InspectorTab; label: string; content: React.ReactNode }[] = [
    { id: "basic", label: "Basic", content: basic },
    { id: "effects", label: "Effects", content: effects },
    { id: "audio", label: "Audio", content: audio },
  ];

  return <aside style={panelStyle}>
    <div style={headerStyle}><div><div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div><div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 2 }}>{subtitle}</div></div><button onClick={onClose} style={closeStyle} title="Grįžti į scenos nustatymus">×</button></div>
    <div style={tabsStyle}>{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} style={{ ...tabStyle, color: tab === item.id ? editorColors.accent : editorColors.textDim, background: tab === item.id ? editorColors.panel : "transparent" }}>{item.label}</button>)}</div>
    <div style={bodyStyle}>
      {tabs.find((item) => item.id === tab)?.content ?? <EmptyTab />}
      {tab === "basic" ? <DeleteObjectButton selectionId={selectionId} onDeleted={onClose} /> : null}
    </div>
  </aside>;
};

/**
 * A layer's position/scale, edited at the playhead.
 *
 * Once a layer has a keyframe path, "where is this layer" is a question with a
 * different answer every frame, so the sliders can no longer edit the entry's
 * single `x`/`y`/`scale` — doing that would shift the WHOLE path, which is
 * never what dragging one point means. Instead they write to the keyframe under
 * the playhead, creating one there if the author is on a frame that has none.
 * A layer with no keyframes still edits its base pose, exactly as before.
 */
const VisualPoseFields: React.FC<{ sceneId: string; entry: PositionedVisualEntry; sceneFrom: number; onChange: (patch: Partial<PositionedVisualEntry>) => void }> = ({ sceneId, entry, sceneFrom, onChange }) => {
  const playheadFrame = useProjectStore((state) => state.playheadFrame);
  const addVisualKeyframe = useProjectStore((state) => state.addVisualKeyframe);
  const updateVisualKeyframe = useProjectStore((state) => state.updateVisualKeyframe);
  const localFrame = Math.max(0, playheadFrame - sceneFrom);
  const keyed = hasKeyframePath(entry);
  const pose = poseAtFrame(entry, localFrame);
  const here = keyframeAtFrame(entry, localFrame);

  function apply(patch: { x?: number; y?: number; scale?: number }) {
    if (!keyed) {
      onChange({ x: patch.x ?? entry.x, y: patch.y ?? entry.y, scale: patch.scale ?? entry.scale });
      return;
    }
    if (here) updateVisualKeyframe(sceneId, entry.id, here.id, patch);
    else addVisualKeyframe(sceneId, entry.id, localFrame, patch);
  }

  return <>
    <PositionFields x={pose.x} y={pose.y} scale={pose.scale ?? 1} scaleMin={0.1} scaleMax={4} scaleLabel="Mastelis" onChange={apply} />
    {keyed ? <div style={hintStyle}>{here ? "Redaguoji keyframe'ą ties playhead'u." : "Pakeitimas sukurs naują keyframe'ą ties playhead'u."}</div> : null}
  </>;
};

/**
 * The keyframe path itself: add one at the playhead, retime or delete the ones
 * that exist. The timeline draws the same list as draggable diamonds — this is
 * the numeric view of it, for the frame you cannot hit by hand.
 */
const KeyframeFields: React.FC<{ sceneId: string; entry: PositionedVisualEntry; sceneFrom: number; max: number }> = ({ sceneId, entry, sceneFrom, max }) => {
  const fps = useProjectStore((state) => state.project.fps);
  const playheadFrame = useProjectStore((state) => state.playheadFrame);
  const addVisualKeyframe = useProjectStore((state) => state.addVisualKeyframe);
  const updateVisualKeyframe = useProjectStore((state) => state.updateVisualKeyframe);
  const removeVisualKeyframe = useProjectStore((state) => state.removeVisualKeyframe);
  const localFrame = Math.min(Math.max(0, playheadFrame - sceneFrom), max);
  const keyframes = sortedKeyframes(entry);

  return <Section title={`Keyframes (${keyframes.length})`}>
    <div style={hintStyle}>Pozicija ir mastelis per laiką. Vienas keyframe'as tik prisega pozą — kelias prasideda nuo dviejų.</div>
    {keyframes.map((keyframe, index) => (
      <div key={keyframe.id} style={keyframeRowStyle}>
        <span style={{ color: editorColors.accent }}>◆</span>
        <span style={{ fontSize: 10, color: editorColors.textDim, width: 16 }}>{index + 1}</span>
        <input type="number" min={0} max={max} step={0.1} value={Number((keyframe.frame / fps).toFixed(2))} onChange={(event) => updateVisualKeyframe(sceneId, entry.id, keyframe.id, { frame: Math.round(Number(event.target.value) * fps) })} style={{ ...numberInputStyle, width: 46, textAlign: "left" }} />
        <span style={{ fontSize: 10, color: editorColors.textDim, flex: 1 }}>s · x {Math.round(keyframe.x ?? entry.x)} y {Math.round(keyframe.y ?? entry.y)} · {(keyframe.scale ?? entry.scale ?? 1).toFixed(2)}×</span>
        <button style={smallIconButtonStyle} title="Pašalinti keyframe'ą" onClick={() => removeVisualKeyframe(sceneId, entry.id, keyframe.id)}>×</button>
      </div>
    ))}
    <button style={addKeyframeStyle} onClick={() => addVisualKeyframe(sceneId, entry.id, localFrame)}>
      ◆ Pridėti keyframe'ą ties {(localFrame / fps).toFixed(2)}s
    </button>
  </Section>;
};

/**
 * How a text element breaks up as it comes in, and how long that takes.
 *
 * `splitBy` decides the unit (a word, a letter, the whole line) and
 * `splitDuration` the time from the first unit appearing to the last — the two
 * only mean anything together, which is why they are one control. The gap
 * between units is derived, so a four-word line and a twelve-word line both
 * finish in the time you asked for instead of the long one dragging on.
 */
const SplitFields: React.FC<{
  text: string;
  splitBy?: "word" | "letter" | "line";
  splitDuration?: number;
  onChange: (patch: { splitBy?: "word" | "letter" | "line"; splitDuration?: number }) => void;
}> = ({ text, splitBy, splitDuration, onChange }) => {
  const fps = useProjectStore((state) => state.project.fps);
  const resolved = splitBy ?? "word";
  const automatic = splitSpan(text, resolved);
  // `splitText` keeps the whitespace between words as its own unit (they carry
  // the same stagger), so the raw count reads as "7 words" for a four-word
  // line. The label counts what a person sees.
  const visible = splitText(text, resolved).filter((unit) => unit.trim().length > 0).length;

  return <>
    <Field label="Skaidymas">
      <select style={inputStyle} value={resolved} onChange={(event) => onChange({ splitBy: event.target.value as typeof splitBy })}>
        {richTextSplitBySchema.options.map((value) => <option key={value}>{value}</option>)}
      </select>
    </Field>
    {resolved === "line" ? (
      // A line split is one unit, so there is no spread to spend time on — the
      // knob would be a slider that does nothing.
      <div style={hintStyle}>Visa eilutė atsiranda iš karto — skaidymo trukmė netaikoma.</div>
    ) : (
      <>
        <SliderField
          label={`Animacijos trukmė (${visible} ${resolved === "letter" ? "raidės" : "žodžiai"})`}
          value={(splitDuration ?? automatic) / fps}
          min={0}
          max={4}
          step={0.05}
          suffix="s"
          onChange={(seconds) => onChange({ splitDuration: Math.round(seconds * fps) })}
        />
        <div style={{ ...hintStyle, marginTop: -6, marginBottom: 6 }}>
          Nuo pradžios iki pabaigos — kada paskutinis {resolved === "letter" ? "simbolis" : "žodis"} baigia atsirasti.
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <button style={smallIconButtonStyle} title="Grįžti prie automatinio tempo" onClick={() => onChange({ splitDuration: undefined })}>
            ↺ Auto
          </button>
          <span style={hintStyle}>
            {splitDuration === undefined ? `auto · ${(automatic / fps).toFixed(2)}s` : `${(splitDuration / fps).toFixed(2)}s`}
          </span>
        </div>
      </>
    )}
  </>;
};

/** The same delete for every object, next to the object — the Delete key runs
 * the identical path (see `confirmDeleteTimelineObject`). Hidden for the
 * objects that cannot be removed at all, rather than shown as a dead button. */
const DeleteObjectButton: React.FC<{ selectionId: string; onDeleted: () => void }> = ({ selectionId, onDeleted }) => {
  const { label, deletable } = describeTimelineObject(selectionId);
  if (!deletable) return null;
  return (
    <button
      style={dangerButtonStyle}
      title="Delete klavišas daro tą patį"
      onClick={() => {
        if (confirmDeleteTimelineObject(selectionId)) onDeleted();
      }}
    >
      Pašalinti · {label.length > 24 ? `${label.slice(0, 24)}…` : label}
    </button>
  );
};

type EffectPatch = { entrance?: EntrancePreset; exit?: ExitPreset; entranceDuration?: number; exitDuration?: number };

/**
 * Text objects call their entrance `animation`, everything else calls it
 * `entrance`. Renaming just that ONE key and spreading the rest is the whole
 * job — the previous version rebuilt the patch field by field, so a patch
 * carrying only `{entrance}` also wrote `exit: undefined`, and picking an IN
 * effect silently erased the OUT effect next to it.
 */
function renameEntranceField(patch: EffectPatch): { animation?: EntrancePreset } & Omit<EffectPatch, "entrance"> {
  const { entrance, ...rest } = patch;
  return "entrance" in patch ? { ...rest, animation: entrance } : rest;
}

/**
 * IN and OUT for one object.
 *
 * `autoEntrance` is the preset this object falls back to when no entrance is
 * set — `scaleIn` for a visual layer, `pop` for text, `fade` for the scene's
 * own content. Naming it on the card matters: "Auto" reads as "off", so
 * clearing an entrance and watching the object keep animating looks like a bug
 * rather than a fallback. **"be efekto" (the explicit `none` preset) is how you
 * actually turn an entrance off**, and it is labelled to say so.
 *
 * OUT has no such fallback — unset really is no exit — so both its ∅ card and
 * its `none` preset mean the same thing there.
 */
const EffectsEditor: React.FC<EffectPatch & { autoEntrance: string; windowFrames?: number; onChange: (patch: EffectPatch) => void }> = ({ entrance, exit, entranceDuration, exitDuration, autoEntrance, windowFrames, onChange }) => <>
  <EffectPicker title="IN efektas" values={entrancePresetSchema.options} value={entrance} emptyLabel={`auto · ${friendlyEffect(autoEntrance)}`} onChange={(value) => onChange({ entrance: value as EntrancePreset | undefined })} />
  <DurationSlider label="IN trukmė" value={entranceDuration ?? 18} windowFrames={windowFrames} onChange={(value) => onChange({ entranceDuration: value })} />
  <EffectPicker title="OUT efektas" values={exitPresetSchema.options} value={exit} emptyLabel="be efekto" onChange={(value) => onChange({ exit: value as ExitPreset | undefined })} />
  <DurationSlider label="OUT trukmė" value={exitDuration ?? 18} windowFrames={windowFrames} onChange={(value) => onChange({ exitDuration: value })} />
</>;

/**
 * The third kind of motion, which the IN/OUT pair has no room for: one that
 * runs for the object's WHOLE time on screen rather than its first or last ~18
 * frames. That is what makes a parked prop drift and a mockup breathe, and it
 * is layered ON TOP of the entrance/exit rather than replacing them — so an
 * object can slide in, spin the whole way through, and fade out.
 *
 * Only visual layers have it (`positionedVisualSchema.kenBurns`), which is why
 * it is a separate component rather than another row inside `EffectsEditor`:
 * text objects would get a control that silently does nothing.
 */
const LoopEffectEditor: React.FC<{ kenBurns?: KenBurnsPreset; kenBurnsSpeed?: number; onChange: (patch: { kenBurns?: KenBurnsPreset; kenBurnsSpeed?: number }) => void }> = ({ kenBurns, kenBurnsSpeed, onChange }) => <>
  <EffectPicker title="Nuolatinis efektas (visą laiką)" values={kenBurnsPresetSchema.options} value={kenBurns} emptyLabel="be efekto" onChange={(value) => onChange({ kenBurns: value as KenBurnsPreset | undefined })} />
  {kenBurns && CYCLIC_KEN_BURNS.has(kenBurns) ? (
    // The one-way ramps (zoomIn/panLeft/…) are sized to the object's own
    // duration and have no rate to scale, so the slider would be a dead knob
    // on everything except the three cyclic presets.
    <SliderField label="Greitis" value={kenBurnsSpeed ?? 1} min={0.1} max={5} step={0.05} suffix="×" onChange={(value) => onChange({ kenBurnsSpeed: value === 1 ? undefined : value })} />
  ) : null}
</>;

/** Presets driven by raw frame count rather than a 0→1 ramp — the only ones a
 * speed multiplier means anything for. Mirrors the set in `kenBurns.ts`. */
const CYCLIC_KEN_BURNS = new Set<string>(["float", "rotateCW", "rotateCCW"]);

const EffectPicker: React.FC<{ title: string; values: readonly string[]; value?: string; emptyLabel: string; onChange: (value?: string) => void }> = ({ title, values, value, emptyLabel, onChange }) => <Section title={title}><div style={effectGridStyle}><button onClick={() => onChange(undefined)} style={effectCardStyle(!value)}><span style={effectPreviewStyle}>∅</span><span>{emptyLabel}</span></button>{values.map((preset) => <button key={preset} onClick={() => onChange(preset)} style={effectCardStyle(value === preset)}><span style={effectPreviewStyle}>{effectGlyph(preset)}</span><span>{friendlyEffect(preset)}</span></button>)}</div></Section>;

/**
 * How long the animation runs — anchored to the object's own window, not the
 * scene's: an IN occupies its first N frames, an OUT its last N. So "1s OUT" on
 * a 3s visual animates across that whole final second.
 *
 * The ceiling is the object's own time on screen rather than a flat 2s, which
 * made a longer move impossible to ask for on anything but the shortest clip.
 */
const DurationSlider: React.FC<{ label: string; value: number; windowFrames?: number; onChange: (frames: number) => void }> = ({ label, value, windowFrames, onChange }) => {
  const fps = useProjectStore((state) => state.project.fps);
  const maxSeconds = Math.max(0.3, Math.min(60, (windowFrames ?? 2 * fps) / fps));
  return <SliderField label={label} value={value / fps} min={1 / fps} max={maxSeconds} step={0.05} suffix="s" onChange={(next) => onChange(Math.max(1, Math.round(next * fps)))} />;
};

const TimingFields: React.FC<{ start: number; end: number; max: number; onChange: (start: number, end: number) => void }> = ({ start, end, max, onChange }) => {
  const fps = useProjectStore((state) => state.project.fps);
  return <Section title="Laikas"><FrameSlider label="IN" value={start} min={0} max={Math.max(0, end - 1)} fps={fps} onChange={(value) => onChange(value, end)} /><FrameSlider label="OUT" value={end} min={Math.min(max, start + 1)} max={max} fps={fps} onChange={(value) => onChange(start, value)} /></Section>;
};

const TimePoint: React.FC<{ value: number; max: number; onChange: (value: number) => void }> = ({ value, max, onChange }) => {
  const fps = useProjectStore((state) => state.project.fps);
  return <Section title="Laikas"><FrameSlider label="Pozicija" value={value} min={0} max={Math.max(1, max - 1)} fps={fps} onChange={onChange} /></Section>;
};

const FrameSlider: React.FC<{ label: string; value: number; min: number; max: number; fps: number; onChange: (value: number) => void }> = ({ label, value, min, max, fps, onChange }) => <SliderField label={label} value={Number((value / fps).toFixed(2))} min={min / fps} max={max / fps} step={0.1} suffix="s" onChange={(seconds) => onChange(Math.max(min, Math.min(max, Math.round(seconds * fps))))} />;

const PositionFields: React.FC<{ x: number; y: number; scale: number; scaleMin: number; scaleMax: number; scaleLabel: string; onChange: (patch: { x?: number; y?: number; scale?: number }) => void }> = ({ x, y, scale, scaleMin, scaleMax, scaleLabel, onChange }) => <Section title="Pozicija"><SliderField label="X" value={x} min={0} max={100} step={0.5} suffix="%" onChange={(value) => onChange({ x: value })} /><SliderField label="Y" value={y} min={0} max={100} step={0.5} suffix="%" onChange={(value) => onChange({ y: value })} /><SliderField label={scaleLabel} value={scale} min={scaleMin} max={scaleMax} step={scaleMax > 10 ? 1 : 0.05} suffix={scaleMax > 10 ? "px" : "×"} onChange={(value) => onChange({ scale: value })} /></Section>;

const SliderField: React.FC<{ label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (value: number) => void }> = ({ label, value, min, max, step, suffix, onChange }) => {
  const begin = useProjectStore((state) => state.beginHistoryTransaction);
  const end = useProjectStore((state) => state.endHistoryTransaction);
  return <div style={{ marginBottom: 14 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}><span style={labelStyle}>{label}</span><label style={numberPillStyle}><input type="number" min={min} max={max} step={step} value={Number(value.toFixed(2))} onChange={(event) => onChange(Number(event.target.value))} style={numberInputStyle} /><span>{suffix}</span></label></div><input type="range" min={min} max={max} step={step} value={value} onPointerDown={begin} onPointerUp={end} onPointerCancel={end} onKeyDown={begin} onKeyUp={end} onChange={(event) => onChange(Number(event.target.value))} style={rangeStyle} /></div>;
};

const AudioPair: React.FC<{ entrance?: string; exit?: string; mode: "auto" | "explicit"; onEntrance: (value?: string) => void; onExit?: (value?: string) => void }> = ({ entrance, exit, mode, onEntrance, onExit }) => <Section title="Garsai"><Field label="IN garsas"><SfxSelect mode={mode} value={entrance} onChange={onEntrance} /></Field>{onExit ? <Field label="OUT garsas"><SfxSelect mode={mode} value={exit} onChange={onExit} /></Field> : null}</Section>;

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <section style={sectionStyle}><div style={sectionTitle}>{title}</div>{children}</section>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label style={{ display: "block", marginBottom: 12 }}><div style={labelStyle}>{label}</div>{children}</label>;
const EmptyTab = () => <div style={emptyStyle}>Šis objektas šiame tabe nustatymų neturi.</div>;
const EmptyInspector: React.FC<{ onClose: () => void }> = ({ onClose }) => <aside style={panelStyle}><div style={headerStyle}><div style={{ color: editorColors.textDim }}>Objektas neberastas.</div><button onClick={onClose} style={closeStyle}>×</button></div></aside>;

/** Splitting on every capital turns `rotateCW` into "rotate C W", so the few
 * presets whose names are acronyms get their label written out instead. */
const EFFECT_LABELS: Record<string, string> = {
  rotateCW: "rotate CW",
  rotateCCW: "rotate CCW",
  // The preset that means "animate nothing". Spelled out because next to a card
  // labelled "auto" the bare word "none" reads as the same thing, and it isn't:
  // auto falls back to a default preset, this one really is no animation.
  none: "be efekto",
};
const friendlyEffect = (preset: string) => EFFECT_LABELS[preset] ?? preset.replace(/([A-Z])/g, " $1").trim();
/** One glyph per preset, looked up by name rather than by substring: a
 * substring test silently gave every new preset the generic ✦, so the picker
 * showed six identical cards the moment the effect list grew. */
const EFFECT_GLYPHS: Record<string, string> = {
  none: "✦",
  fade: "◐",
  slideUp: "↑",
  slideDown: "↓",
  slideLeft: "←",
  slideRight: "→",
  scaleIn: "◎",
  scaleOut: "◎",
  pop: "✦",
  zoomSettleRight: "⇢",
  zoomSettleLeft: "⇠",
  zoomSettleTop: "⇡",
  zoomSettleBottom: "⇣",
  burstOut: "✷",
  zoomIn: "⤢",
  zoomOut: "⤡",
  blurIn: "◍",
  blurOut: "◍",
  spinIn: "↺",
  spinOut: "↻",
  flipIn: "⇋",
  flipOut: "⇌",
  bounceIn: "⤻",
  dropIn: "⭳",
  dropOut: "⭳",
  rollIn: "⟲",
  rollOut: "⟳",
  panLeft: "←",
  panRight: "→",
  panUp: "↑",
  panDown: "↓",
  float: "≈",
  rotateCW: "↻",
  rotateCCW: "↺",
};
const effectGlyph = (preset: string) => EFFECT_GLYPHS[preset] ?? "✦";
const effectCardStyle = (active: boolean): React.CSSProperties => ({ minWidth: 0, padding: "8px 4px", display: "grid", gap: 5, justifyItems: "center", borderRadius: 7, border: `1px solid ${active ? editorColors.accent : editorColors.border}`, background: active ? "rgba(255,112,36,.12)" : editorColors.panelElevated, color: active ? editorColors.accent : editorColors.textDim, cursor: "pointer", fontSize: 9, overflow: "hidden" });
const effectPreviewStyle: React.CSSProperties = { width: 34, height: 28, display: "grid", placeItems: "center", borderRadius: 5, background: "#111", color: "white", fontSize: 17 };
const effectGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 };
const panelStyle: React.CSSProperties = { width: "clamp(300px, 23vw, 480px)", flexShrink: 0, minHeight: 0, display: "flex", flexDirection: "column", borderLeft: `1px solid ${editorColors.border}`, background: editorColors.panel, color: editorColors.text };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 16px 12px", flexShrink: 0 };
const bodyStyle: React.CSSProperties = { flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 16px 20px" };
const tabsStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, margin: "0 16px 8px", padding: 3, borderRadius: 8, background: editorColors.panelElevated, flexShrink: 0 };
const tabStyle: React.CSSProperties = { padding: "7px 0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 650 };
const closeStyle: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, border: `1px solid ${editorColors.border}`, background: editorColors.panelElevated, color: editorColors.text, cursor: "pointer", fontSize: 18 };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 9px", borderRadius: 6, border: `1px solid ${editorColors.border}`, background: "#222", color: editorColors.text, fontSize: 12, resize: "vertical" };
const labelStyle: React.CSSProperties = { fontSize: 10, color: editorColors.textDim, textTransform: "uppercase", letterSpacing: ".05em" };
const sectionStyle: React.CSSProperties = { padding: "12px 0 14px", borderBottom: `1px solid ${editorColors.border}` };
const sectionTitle: React.CSSProperties = { fontSize: 10, fontWeight: 750, color: editorColors.accent, marginBottom: 12, letterSpacing: ".08em", textTransform: "uppercase" };
const numberPillStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 5, border: `1px solid ${editorColors.border}`, background: "#222", color: editorColors.textDim, fontSize: 10 };
const numberInputStyle: React.CSSProperties = { width: 58, padding: 0, border: 0, outline: 0, background: "transparent", color: editorColors.text, textAlign: "right", fontSize: 11 };
const rangeStyle: React.CSSProperties = { width: "100%", margin: 0, accentColor: editorColors.accent };
const checkStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 8 };
const emptyStyle: React.CSSProperties = { padding: "24px 8px", color: editorColors.textDim, textAlign: "center", fontSize: 11 };
const hintStyle: React.CSSProperties = { fontSize: 10, color: editorColors.textDim, lineHeight: 1.45, marginBottom: 8 };
const keyframeRowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "4px 6px", marginBottom: 4, borderRadius: 5, border: `1px solid ${editorColors.border}`, background: "#1d1d1d" };
const smallIconButtonStyle: React.CSSProperties = { minWidth: 20, height: 20, padding: "0 6px", borderRadius: 4, border: `1px solid ${editorColors.border}`, background: "transparent", color: editorColors.textDim, cursor: "pointer", fontSize: 11 };
const addKeyframeStyle: React.CSSProperties = { width: "100%", padding: 8, marginTop: 4, borderRadius: 6, border: `1px dashed ${editorColors.border}`, background: "transparent", color: editorColors.accent, cursor: "pointer", fontSize: 11 };
const dangerButtonStyle: React.CSSProperties = { width: "100%", padding: 9, marginTop: 12, borderRadius: 6, border: "1px solid #5a2a1a", background: "#301818", color: "#ff8a65", cursor: "pointer" };
