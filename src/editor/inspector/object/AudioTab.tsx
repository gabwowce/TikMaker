import { Fieldset } from "@mantine/core";
import { resolveTextEntranceSfx } from "../../../video/motion/sfxDefaults";
import { useProjectStore } from "../../state/projectStore";
import { AudioPair, EmptyTab, Field } from "../../timeline/ObjectControls";
import { SfxSelect } from "../SfxSelect";
import type { SelectedObject } from "./selectedObject";

// The "Audio" tab: which sound plays when the selected object appears / leaves.
export function AudioTab({ object }: { object: SelectedObject }) {
  switch (object.kind) {
    case "text-line":
      return (
        <TextAudio
          entrance={object.line.animation}
          splitBy={object.line.splitBy}
          sfx={object.line.sfx}
          onSfx={(sfx) => object.update({ sfx })}
        />
      );
    case "text-block":
      return (
        <TextAudio
          entrance={object.block.animation}
          splitBy={object.block.splitBy}
          sfx={object.block.sfx}
          onSfx={(sfx) => object.update({ sfx })}
        />
      );
    case "visual":
      return (
        <AudioPair
          entrance={object.visual.sfx}
          exit={object.visual.exitSfx}
          mode="explicit"
          onEntrance={(sfx) => object.update({ sfx })}
          onExit={(exitSfx) => object.update({ exitSfx })}
        />
      );
    case "scene-text":
      return <SceneTextAudio object={object} />;
    case "scene-sound":
      return <SceneSoundAudio object={object} />;
    case "visual-sound":
      return (
        <SoundField
          mode="explicit"
          value={object.isOut ? object.visual.exitSfx : object.visual.sfx}
          onChange={(value) =>
            object.update(object.isOut ? { exitSfx: value } : { sfx: value })
          }
        />
      );
    case "audio-clip":
      return (
        <SoundField
          mode="explicit"
          value={object.clip.sfxId}
          onChange={(sfxId) => sfxId && object.update({ sfxId })}
        />
      );
    default:
      return <EmptyTab />; // steps and checklist items have no sound of their own
  }
}

type Of<K extends SelectedObject["kind"]> = {
  object: Extract<SelectedObject, { kind: K }>;
};

// Text N and text blocks: the automatic sound depends on how the text appears.
function TextAudio(props: {
  entrance?: Parameters<typeof resolveTextEntranceSfx>[0]["entrance"];
  splitBy?: Parameters<typeof resolveTextEntranceSfx>[0]["splitBy"];
  sfx?: string;
  onSfx: (sfx: string | undefined) => void;
}) {
  return (
    <AudioPair
      entrance={props.sfx}
      mode="auto"
      autoEntranceSfx={resolveTextEntranceSfx({
        entrance: props.entrance ?? "pop",
        splitBy: props.splitBy ?? "word",
      })}
      onEntrance={props.onSfx}
    />
  );
}

// Scene text
function SceneTextAudio({ object }: Of<"scene-text">) {
  const { scene } = object;
  const updateSceneMotion = useProjectStore((state) => state.updateSceneMotion);
  return (
    <AudioPair
      entrance={scene.motion?.sfx}
      exit={scene.motion?.exitSfx}
      mode="auto"
      onEntrance={(sfx) => updateSceneMotion(scene.id, { sfx })}
      onExit={(exitSfx) => updateSceneMotion(scene.id, { exitSfx })}
    />
  );
}

// Scene IN / OUT sound cue
function SceneSoundAudio({ object }: Of<"scene-sound">) {
  const { scene, isOut } = object;
  const updateSceneMotion = useProjectStore((state) => state.updateSceneMotion);
  return (
    <SoundField
      mode="auto"
      value={isOut ? scene.motion?.exitSfx : scene.motion?.sfx}
      onChange={(value) =>
        updateSceneMotion(scene.id, isOut ? { exitSfx: value } : { sfx: value })
      }
    />
  );
}

// One "Sound effect" picker
function SoundField(props: {
  mode: "auto" | "explicit";
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Fieldset legend="Sound">
      <Field label="Sound effect">
        <SfxSelect
          mode={props.mode}
          value={props.value}
          onChange={props.onChange}
        />
      </Field>
    </Fieldset>
  );
}
