import { Checkbox, Fieldset, NativeSelect, TextInput } from "@mantine/core";
import type { Scene } from "../../schema/scene";
import {
  entrancePresetSchema,
  exitPresetSchema,
  transitionPresetSchema,
} from "../../schema/scene";
import { pacingWarning, resolveSceneDuration } from "../../utils/pacing";
import { Warning } from "./controls";
import { useProjectStore } from "../state/projectStore";
import { DistanceControl, SecondsSlider } from "./controls";
import { SfxSelect } from "./SfxSelect";

export function SceneMotionSettings({ scene }: { scene: Scene }) {
  const selectedSceneId = scene.id;

  const updateScene = useProjectStore((s) => s.updateScene);
  const updateSceneEntrance = useProjectStore((s) => s.updateSceneEntrance);
  const updateSceneExit = useProjectStore((s) => s.updateSceneExit);
  const updateSceneExitDuration = useProjectStore(
    (s) => s.updateSceneExitDuration,
  );
  const updateSceneMotion = useProjectStore((s) => s.updateSceneMotion);

  const updateSceneTransition = useProjectStore((s) => s.updateSceneTransition);
  const updateSceneStagger = useProjectStore((s) => s.updateSceneStagger);

  const updateSceneSfx = useProjectStore((s) => s.updateSceneSfx);
  const updateSceneExitSfx = useProjectStore((s) => s.updateSceneExitSfx);

  const isAuto = typeof scene.durationSeconds !== "number";
  const resolved = resolveSceneDuration(scene);

  return (
    <>
      <Fieldset legend="Timing & Motion">
        <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[16px_0_6px]">
          Duration
        </div>

        <>
          <label className="text-[11px] text-editor-muted flex gap-1.5 items-center mb-1.5">
            <Checkbox
              checked={isAuto}
              onChange={(e) =>
                updateScene(selectedSceneId, {
                  durationSeconds: e.target.checked
                    ? undefined
                    : Number(resolved.toFixed(1)),
                })
              }
            />
            Fit to voiceover / reading time ({resolved.toFixed(1)}s)
          </label>
          {!isAuto ? (
            <>
              <TextInput
                type="number"
                step={0.1}
                min={0.5}
                className="w-full"
                value={scene.durationSeconds}
                onChange={(e) =>
                  updateScene(selectedSceneId, {
                    durationSeconds: Number(e.target.value),
                  })
                }
              />
              <Warning text={pacingWarning(scene)} />
            </>
          ) : null}
        </>

        <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[16px_0_6px]">
          Entrance
        </div>

        <NativeSelect
          className="w-full"
          value={scene.motion?.entrance ?? "fade"}
          onChange={(e) =>
            updateSceneEntrance(
              selectedSceneId,
              entrancePresetSchema.parse(e.target.value),
            )
          }
        >
          {entrancePresetSchema.options.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </NativeSelect>
        <SecondsSlider
          label="Entrance duration"
          frames={scene.motion?.entranceDuration ?? 18}
          minFrames={1}
          maxFrames={60}
          onChange={(entranceDuration) =>
            updateSceneMotion(selectedSceneId, { entranceDuration })
          }
        />

        <DistanceControl
          label="Entrance distance"
          value={scene.motion?.entranceDistance}
          onChange={(entranceDistance) =>
            updateSceneMotion(selectedSceneId, { entranceDistance })
          }
        />

        <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[16px_0_6px]">
          Exit
        </div>

        <NativeSelect
          className="w-full mb-1.5"
          value={scene.motion?.exit ?? ""}
          onChange={(e) =>
            updateSceneExit(
              selectedSceneId,
              (e.target.value || undefined) as
                | (typeof exitPresetSchema)["options"][number]
                | undefined,
            )
          }
        >
          <option value="">none (hard cut)</option>
          {exitPresetSchema.options.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </NativeSelect>
        {scene.motion?.exit ? (
          <SecondsSlider
            label="Exit duration"
            frames={scene.motion?.exitDuration ?? 18}
            minFrames={1}
            maxFrames={60}
            onChange={(exitDuration) =>
              updateSceneExitDuration(selectedSceneId, exitDuration)
            }
          />
        ) : null}
        {scene.motion?.exit ? (
          <DistanceControl
            label="Exit distance"
            value={scene.motion?.exitDistance}
            onChange={(exitDistance) =>
              updateSceneMotion(selectedSceneId, { exitDistance })
            }
          />
        ) : null}

        <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[16px_0_6px]">
          Sound
        </div>

        <div className="grid [grid-template-columns:1fr_1fr] gap-1.5">
          <div>
            <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
              In
            </div>
            <SfxSelect
              mode="auto"
              value={scene.motion?.sfx}
              onChange={(sfx) => updateSceneSfx(selectedSceneId, sfx)}
            />
          </div>
          <div>
            <div className="text-[9px] uppercase [letter-spacing:0.4px] text-editor-muted mb-[3px]">
              Out
            </div>
            <SfxSelect
              mode="auto"
              value={scene.motion?.exitSfx}
              onChange={(sfx) => updateSceneExitSfx(selectedSceneId, sfx)}
            />
          </div>
        </div>

        <SecondsSlider
          label="Element stagger"
          frames={scene.motion?.stagger ?? 6}
          maxFrames={60}
          onChange={(stagger) => updateSceneStagger(selectedSceneId, stagger)}
        />

        <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[16px_0_6px]">
          Transition
        </div>
        <NativeSelect
          className="w-full"
          value={scene.motion?.transition ?? "cut"}
          onChange={(e) =>
            updateSceneTransition(
              selectedSceneId,
              transitionPresetSchema.parse(e.target.value),
            )
          }
        >
          {transitionPresetSchema.options.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
        </NativeSelect>
      </Fieldset>
    </>
  );
}
