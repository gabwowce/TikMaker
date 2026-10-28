import { Button, Fieldset, TextInput } from "@mantine/core";
import type { PositionedVisualEntry } from "../../schema/scene";
import {
  formatDuration,
  frameStep,
  framesToSeconds,
} from "../../utils/timecode";
import {
  keyframePins,
  keyframesFor,
  poseAtFrame,
  type KeyframeProperty,
} from "../../video/layout/visualKeyframes";
import { useProjectStore } from "../state/projectStore";
import { PositionFields } from "./ObjectControls";

export type VisualPoseFieldsProps = {
  sceneId: string;
  entry: PositionedVisualEntry;
  sceneFrom: number;
  onChange: (patch: Partial<PositionedVisualEntry>) => void;
};

export function VisualPoseFields({
  sceneId,
  entry,
  sceneFrom,
  onChange,
}: VisualPoseFieldsProps) {
  const playheadFrame = useProjectStore((state) => state.playheadFrame);
  const addVisualKeyframe = useProjectStore((state) => state.addVisualKeyframe);
  const updateVisualKeyframe = useProjectStore(
    (state) => state.updateVisualKeyframe,
  );
  const localFrame = Math.max(0, playheadFrame - sceneFrom);
  const pose = poseAtFrame(entry, localFrame);
  const positionKeys = keyframesFor(entry, "position");
  const scaleKeys = keyframesFor(entry, "scale");
  function apply(patch: { x?: number; y?: number; scale?: number }) {
    const movesPosition = patch.x !== undefined || patch.y !== undefined;
    const movesScale = patch.scale !== undefined;
    if (movesPosition) {
      if (positionKeys.length >= 2) {
        const here = positionKeys.find(
          (keyframe) => keyframe.frame === localFrame,
        );
        if (here)
          updateVisualKeyframe(sceneId, entry.id, here.id, {
            x: patch.x,
            y: patch.y,
          });
        else
          addVisualKeyframe(sceneId, entry.id, localFrame, "position", {
            x: patch.x,
            y: patch.y,
          });
      } else {
        onChange({ x: patch.x ?? entry.x, y: patch.y ?? entry.y });
      }
    }
    if (movesScale) {
      if (scaleKeys.length >= 2) {
        const here = scaleKeys.find(
          (keyframe) => keyframe.frame === localFrame,
        );
        if (here)
          updateVisualKeyframe(sceneId, entry.id, here.id, {
            scale: patch.scale,
          });
        else
          addVisualKeyframe(sceneId, entry.id, localFrame, "scale", {
            scale: patch.scale,
          });
      } else {
        onChange({ scale: patch.scale });
      }
    }
  }
  return (
    <>
      <PositionFields
        x={pose.x}
        y={pose.y}
        scale={pose.scale ?? 1}
        scaleMin={0.1}
        scaleMax={4}
        scaleLabel="Scale"
        onChange={apply}
      />
    </>
  );
}

export type KeyframeFieldsProps = {
  sceneId: string;
  entry: PositionedVisualEntry;
  sceneFrom: number;
  max: number;
};

export function KeyframeFields({
  sceneId,
  entry,
  sceneFrom,
  max,
}: KeyframeFieldsProps) {
  const playheadFrame = useProjectStore((state) => state.playheadFrame);
  const localFrame = Math.min(Math.max(0, playheadFrame - sceneFrom), max);
  return (
    <Fieldset legend="Keyframes">
      <KeyframeTrack
        sceneId={sceneId}
        entry={entry}
        property="position"
        label="Position"
        localFrame={localFrame}
        max={max}
      />
      <KeyframeTrack
        sceneId={sceneId}
        entry={entry}
        property="scale"
        label="Scale"
        localFrame={localFrame}
        max={max}
      />
    </Fieldset>
  );
}

export type KeyframeTrackProps = {
  sceneId: string;
  entry: PositionedVisualEntry;
  property: KeyframeProperty;
  label: string;
  localFrame: number;
  max: number;
};

export function KeyframeTrack({
  sceneId,
  entry,
  property,
  label,
  localFrame,
  max,
}: KeyframeTrackProps) {
  const fps = useProjectStore((state) => state.project.fps);
  const addVisualKeyframe = useProjectStore((state) => state.addVisualKeyframe);
  const updateVisualKeyframe = useProjectStore(
    (state) => state.updateVisualKeyframe,
  );
  const removeVisualKeyframe = useProjectStore(
    (state) => state.removeVisualKeyframe,
  );
  const keyframes = keyframesFor(entry, property);
  function describe(keyframe: (typeof keyframes)[number]) {
    return property === "scale"
      ? `${(keyframe.scale ?? entry.scale ?? 1).toFixed(2)}×`
      : `x ${Math.round(keyframe.x ?? entry.x)} y ${Math.round(keyframe.y ?? entry.y)}`;
  }
  function clear(keyframe: (typeof keyframes)[number]) {
    const other: KeyframeProperty = property === "scale" ? "position" : "scale";
    if (keyframePins(keyframe, other)) {
      updateVisualKeyframe(
        sceneId,
        entry.id,
        keyframe.id,
        property === "scale"
          ? { scale: undefined }
          : { x: undefined, y: undefined },
      );
    } else {
      removeVisualKeyframe(sceneId, entry.id, keyframe.id);
    }
  }
  return (
    <div className="mb-2.5">
      <div className="text-[10px] uppercase [letter-spacing:0.6px] text-editor-muted mb-1">
        {label} ({keyframes.length})
      </div>
      {keyframes.map((keyframe, index) => (
        <div
          key={keyframe.id}
          className="flex items-center gap-1.5 p-[4px_6px] mb-1 rounded-[5px] border border-solid border-editor-border bg-[#1d1d1d]"
        >
          <span
            className={`${property === "scale" ? "text-[#38bdf8]" : "text-editor-accent"}`}
          >
            ◆
          </span>
          <span className="text-[10px] text-editor-muted w-4">{index + 1}</span>
          <TextInput
            type="number"
            min={0}
            max={max}
            step={frameStep(fps)}
            value={framesToSeconds(keyframe.frame, fps)}
            onChange={(event) =>
              updateVisualKeyframe(sceneId, entry.id, keyframe.id, {
                frame: Math.round(Number(event.target.value) * fps),
              })
            }
            className="w-14"
          />
          <span className="text-[10px] text-editor-muted flex-1">
            s · {describe(keyframe)}
          </span>
          <Button
            variant="default"
            className="min-w-5"
            aria-label={`Remove ${label.toLowerCase()} keyframe`}
            onClick={() => clear(keyframe)}
          >
            ×
          </Button>
        </div>
      ))}
      <Button
        variant="default"
        className="w-full mt-1"
        onClick={() =>
          addVisualKeyframe(sceneId, entry.id, localFrame, property)
        }
      >
        ◆ {label} at {formatDuration(localFrame, fps)}
      </Button>
    </div>
  );
}
