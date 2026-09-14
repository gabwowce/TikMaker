import { ActionIcon, NativeSelect, Textarea } from "@mantine/core";
import { scenePlanRoleSchema, type Scene } from "../../schema/scene";
import {
  sceneOnScreenText,
  withOnScreenText,
} from "../../utils/projectStoryPlan";
import { useProjectStore } from "../state/projectStore";
type Props = {
  scene: Scene;
  index: number;
  sceneCount: number;
};
export function StoryboardSceneForm({ scene, index, sceneCount }: Props) {
  const updateScene = useProjectStore((state) => state.updateScene);
  const moveScene = useProjectStore((state) => state.moveScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  function updatePlan(patch: Partial<NonNullable<Scene["plan"]>>) {
    updateScene(scene.id, {
      plan: { role: "benefit", ...scene.plan, ...patch },
    });
  }
  function updateText(value: string) {
    updateScene(scene.id, withOnScreenText(scene, value));
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="flex-1">Scene {index + 1}</strong>
        <ActionIcon
          aria-label="Move scene up"
          disabled={index === 0}
          onClick={() => moveScene(scene.id, "up")}
        >
          ↑
        </ActionIcon>
        <ActionIcon
          aria-label="Move scene down"
          disabled={index === sceneCount - 1}
          onClick={() => moveScene(scene.id, "down")}
        >
          ↓
        </ActionIcon>
        <ActionIcon
          color="red"
          aria-label="Delete scene"
          onClick={() => removeScene(scene.id)}
        >
          ×
        </ActionIcon>
      </div>

      <NativeSelect
        label="Role"
        data={scenePlanRoleSchema.options}
        value={scene.plan?.role ?? "benefit"}
        onChange={(event) =>
          updatePlan({
            role: scenePlanRoleSchema.parse(event.currentTarget.value),
          })
        }
      />
      <Textarea
        label="Scene purpose"
        rows={2}
        value={scene.plan?.purpose ?? ""}
        onChange={(event) =>
          updatePlan({ purpose: event.currentTarget.value || undefined })
        }
      />
      <Textarea
        label="Voiceover"
        value={scene.vo ?? ""}
        onChange={(event) =>
          updateScene(scene.id, { vo: event.currentTarget.value || undefined })
        }
      />
      <Textarea
        label="On-screen text"
        value={sceneOnScreenText(scene)}
        onChange={(event) => updateText(event.currentTarget.value)}
      />
      <Textarea
        label="What to show"
        value={scene.plan?.visualBrief ?? ""}
        onChange={(event) =>
          updatePlan({ visualBrief: event.currentTarget.value || undefined })
        }
      />
      <Textarea
        label="Notes"
        value={scene.notes ?? ""}
        onChange={(event) =>
          updateScene(scene.id, {
            notes: event.currentTarget.value || undefined,
          })
        }
      />
    </div>
  );
}
