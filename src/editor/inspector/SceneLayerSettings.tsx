import { Fieldset } from "@mantine/core";
import type { Scene } from "../../schema/scene";
import { useProjectStore } from "../state/projectStore";
import { SceneObjectList } from "./SceneObjectList";

export function SceneLayerSettings({ scene }: { scene: Scene }) {
  const selectedSceneId = scene.id;

  const updateSceneVisuals = useProjectStore((s) => s.updateSceneVisuals);

  return (
    <>
      <Fieldset
        legend={`Layers${(scene.content.visuals?.length ?? 0) > 0 ? ` (${scene.content.visuals!.length})` : ""}`}
      >
        <SceneObjectList
          rows={(scene.content.visuals ?? []).map((entry) => ({
            id: `visual-${entry.id}`,
            label: entry.visual.type,
            detail: `x${Math.round(entry.x)} y${Math.round(entry.y)}${entry.scale ? ` · ${entry.scale.toFixed(2)}×` : ""}${entry.link ? " · carried across scenes" : ""}`,
          }))}
          emptyLabel="No layers"
          onMove={(id, direction) => {
            const visuals = [...(scene.content.visuals ?? [])];
            const at = visuals.findIndex(
              (entry) => `visual-${entry.id}` === id,
            );
            const to = at + direction;
            if (at === -1 || to < 0 || to >= visuals.length) return;
            [visuals[at], visuals[to]] = [visuals[to], visuals[at]];
            updateSceneVisuals(selectedSceneId, visuals);
          }}
          onRemove={(id) =>
            updateSceneVisuals(
              selectedSceneId,
              (scene.content.visuals ?? []).filter(
                (entry) => `visual-${entry.id}` !== id,
              ),
            )
          }
        />
      </Fieldset>
    </>
  );
}
