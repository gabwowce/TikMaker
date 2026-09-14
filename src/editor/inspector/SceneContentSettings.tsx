import { Button, Fieldset, TextInput, Textarea } from "@mantine/core";
import type { Scene, StepItem } from "../../schema/scene";
import { VisualThumb } from "../library/VisualThumb";
import { useProjectStore } from "../state/projectStore";
import { SceneObjectList, StackPositionFields } from "./SceneObjectList";
import type { VisualMotionValue } from "./VisualMotionEditor";
import { VisualMotionEditor } from "./VisualMotionEditor";
import { VoiceoverGenerator } from "./VoiceoverGenerator";

export function SceneContentSettings({ scene }: { scene: Scene }) {
  const selectedSceneId = scene.id;
  const updateSceneContent = useProjectStore((s) => s.updateSceneContent);
  const updateScene = useProjectStore((s) => s.updateScene);

  const updateSceneRichHeadline = useProjectStore(
    (s) => s.updateSceneRichHeadline,
  );
  const updateSceneLeftRight = useProjectStore((s) => s.updateSceneLeftRight);
  const updateSceneItems = useProjectStore((s) => s.updateSceneItems);
  const updateSceneBlocks = useProjectStore((s) => s.updateSceneBlocks);

  const setActiveVisualSlot = useProjectStore((s) => s.setActiveVisualSlot);

  const isComparison = scene.type === "comparison";
  const isSteps = scene.type === "steps";

  function updateItem(index: number, patch: Partial<StepItem>) {
    const items = [...(scene.content.items ?? [])];
    items[index] = { ...items[index], ...patch };
    updateSceneItems(selectedSceneId, items);
  }

  function updateColumnMotion(
    side: "left" | "right",
    patch: Partial<VisualMotionValue>,
  ) {
    const column = { ...scene.content[side] };
    if ("entrance" in patch) column.visualEntrance = patch.entrance;
    if ("entranceDuration" in patch)
      column.visualEntranceDuration = patch.entranceDuration;
    if ("exit" in patch) column.visualExit = patch.exit;
    if ("exitDuration" in patch) column.visualExitDuration = patch.exitDuration;
    if ("entranceDistance" in patch)
      column.visualEntranceDistance = patch.entranceDistance;
    if ("exitDistance" in patch) column.visualExitDistance = patch.exitDistance;
    if ("kenBurns" in patch) column.visualKenBurns = patch.kenBurns;
    if ("kenBurnsSpeed" in patch)
      column.visualKenBurnsSpeed = patch.kenBurnsSpeed;
    if ("scale" in patch) column.visualScale = patch.scale;
    if ("sfx" in patch) column.visualSfx = patch.sfx;
    if ("exitSfx" in patch) column.visualExitSfx = patch.exitSfx;
    updateSceneLeftRight(scene.id, side, column);
  }
  return (
    <>
      <Fieldset legend="Content">
        {!isSteps && !isComparison ? (
          <>
            <Fieldset
              legend={`Text (${(scene.content.richHeadline ?? []).length})`}
            >
              <SceneObjectList
                rows={(scene.content.richHeadline ?? []).map((line, index) => ({
                  id: `line-${index}`,
                  label: line.text,
                  detail: `${line.size}${line.pill ? " · pill" : ""}${line.x !== undefined && line.y !== undefined ? ` · x${Math.round(line.x)} y${Math.round(line.y)}` : ""}`,
                }))}
                emptyLabel="No text"
                addLabel="+ Text"
                onAdd={() => {
                  const lines = scene.content.richHeadline ?? [];
                  if (lines.length >= 6) return;
                  updateSceneRichHeadline(selectedSceneId, [
                    ...lines,
                    { text: "New text", size: "headline" as const },
                  ]);
                }}
                onMove={(id, direction) => {
                  const lines = [...(scene.content.richHeadline ?? [])];
                  const at = Number(id.slice(5));
                  const to = at + direction;
                  if (to < 0 || to >= lines.length) return;
                  [lines[at], lines[to]] = [lines[to], lines[at]];
                  updateSceneRichHeadline(selectedSceneId, lines);
                }}
                onRemove={(id) => {
                  const at = Number(id.slice(5));
                  updateSceneRichHeadline(
                    selectedSceneId,
                    (scene.content.richHeadline ?? []).filter(
                      (_, index) => index !== at,
                    ),
                  );
                }}
              />
              <div className="mt-2.5">
                <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[16px_0_6px]">
                  Text column position
                </div>

                <StackPositionFields
                  x={scene.content.richHeadlineX}
                  y={scene.content.richHeadlineY}
                  onChange={(patch) =>
                    updateSceneContent(selectedSceneId, patch)
                  }
                />
              </div>
            </Fieldset>
          </>
        ) : null}

        {isComparison ? (
          <>
            {(["left", "right"] as const).map((side) => (
              <div key={side}>
                <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[16px_0_6px]">
                  {side === "left" ? "Left column" : "Right column"}
                </div>
                <TextInput
                  className="w-full mb-1.5"
                  value={scene.content[side]?.label ?? ""}
                  onChange={(e) =>
                    updateSceneLeftRight(selectedSceneId, side, {
                      label: e.target.value,
                    })
                  }
                  placeholder="Label"
                />
                <TextInput
                  className="w-full mb-1.5"
                  value={scene.content[side]?.headline ?? ""}
                  onChange={(e) =>
                    updateSceneLeftRight(selectedSceneId, side, {
                      headline: e.target.value,
                    })
                  }
                  placeholder="Headline"
                />
                <Textarea
                  className="w-full"
                  value={scene.content[side]?.body ?? ""}
                  onChange={(e) =>
                    updateSceneLeftRight(selectedSceneId, side, {
                      body: e.target.value,
                    })
                  }
                  placeholder="Body"
                />
                <Button
                  variant="default"
                  className="mt-1.5"
                  onClick={() => setActiveVisualSlot(side)}
                >
                  Assign visual from Visuals tab →
                </Button>
                {scene.content[side]?.visual ? (
                  <div className="mt-2">
                    <div className="flex gap-2 items-center mb-1.5">
                      <VisualThumb
                        visual={scene.content[side]!.visual!}
                        height={40}
                      />
                    </div>
                    <VisualMotionEditor
                      entranceFallbackLabel="none (moves with the column)"
                      showScale
                      value={{
                        entrance: scene.content[side]?.visualEntrance,
                        entranceDuration:
                          scene.content[side]?.visualEntranceDuration,
                        exit: scene.content[side]?.visualExit,
                        exitDuration: scene.content[side]?.visualExitDuration,
                        entranceDistance:
                          scene.content[side]?.visualEntranceDistance,
                        exitDistance: scene.content[side]?.visualExitDistance,
                        kenBurns: scene.content[side]?.visualKenBurns,
                        kenBurnsSpeed: scene.content[side]?.visualKenBurnsSpeed,
                        scale: scene.content[side]?.visualScale,
                        sfx: scene.content[side]?.visualSfx,
                        exitSfx: scene.content[side]?.visualExitSfx,
                      }}
                      onChange={(patch) => updateColumnMotion(side, patch)}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </>
        ) : null}

        {isSteps ? (
          <>
            <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[16px_0_6px]">
              Items
            </div>
            <div className="flex flex-col gap-2">
              {(scene.content.items ?? []).map((item, index) => (
                <div
                  key={index}
                  className="border border-solid border-editor-border rounded-lg p-2"
                >
                  <TextInput
                    className="w-full mb-1.5"
                    value={item.label}
                    onChange={(e) =>
                      updateItem(index, { label: e.target.value })
                    }
                    placeholder="Label"
                  />
                  <div className="flex gap-1.5">
                    <TextInput
                      className="w-full"
                      value={item.value ?? ""}
                      onChange={(e) =>
                        updateItem(index, { value: e.target.value })
                      }
                      placeholder="Optional value"
                    />
                    <Button
                      variant="default"
                      onClick={() =>
                        updateSceneItems(
                          selectedSceneId,
                          (scene.content.items ?? []).filter(
                            (_, i) => i !== index,
                          ),
                        )
                      }
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="default"
                onClick={() =>
                  updateSceneItems(selectedSceneId, [
                    ...(scene.content.items ?? []),
                    { label: "New step" },
                  ])
                }
              >
                + Add item
              </Button>
            </div>
          </>
        ) : null}
      </Fieldset>

      {(scene.content.blocks ?? []).length ? (
        <Fieldset
          legend={`Legacy text blocks (${scene.content.blocks!.length})`}
        >
          <SceneObjectList
            rows={(scene.content.blocks ?? []).map((block) => ({
              id: `block-${block.id}`,
              label: block.text,
              detail: `${block.type} · x${Math.round(block.x)} y${Math.round(block.y)}`,
            }))}
            emptyLabel=""
            onRemove={(id) =>
              updateSceneBlocks(
                selectedSceneId,
                (scene.content.blocks ?? []).filter(
                  (block) => `block-${block.id}` !== id,
                ),
              )
            }
          />
        </Fieldset>
      ) : null}

      <Fieldset legend="Voiceover">
        <Textarea
          rows={3}
          className="w-full"
          value={scene.vo ?? ""}
          placeholder="What you say during this scene…"
          onChange={(e) => {
            const vo = e.target.value || undefined;
            updateScene(selectedSceneId, { vo });
          }}
        />
        {scene.vo ? null : null}
        <VoiceoverGenerator sceneId={selectedSceneId} text={scene.vo} />
      </Fieldset>

      <Fieldset legend="Notes">
        <Textarea
          rows={3}
          className="w-full"
          value={scene.notes ?? ""}
          placeholder="e.g. Chrome integration recording"
          onChange={(e) =>
            updateScene(selectedSceneId, {
              notes: e.target.value || undefined,
            })
          }
        />
      </Fieldset>
    </>
  );
}
