import { ActionIcon, UnstyledButton } from "@mantine/core";
import { useProjectStore } from "../state/projectStore";
import { useSavedBackgroundsStore } from "../state/savedBackgroundsStore";
import { BackgroundSwatch } from "./BackgroundSwatch";
import { CustomBackgroundBuilder } from "./CustomBackgroundBuilder";
export function BackgroundLibrary() {
  const selectedSceneId = useProjectStore((state) => state.selectedSceneId);
  const updateSceneBackground = useProjectStore(
    (state) => state.updateSceneBackground,
  );
  const backgrounds = useSavedBackgroundsStore((state) => state.backgrounds);
  const removeBackground = useSavedBackgroundsStore((state) => state.remove);
  return (
    <div className="editor-ui flex flex-col gap-4">
      <h3 className="m-0 text-sm font-semibold">Your Backgrounds</h3>
      <div className="grid gap-2">
        {backgrounds.map((saved) => (
          <div
            key={saved.id}
            className="overflow-hidden rounded border border-solid border-editor-border"
          >
            <UnstyledButton
              className="block w-full"
              aria-label={`Apply ${saved.name}`}
              disabled={!selectedSceneId}
              onClick={() =>
                selectedSceneId &&
                updateSceneBackground(selectedSceneId, saved.background)
              }
            >
              <BackgroundSwatch background={saved.background} />
            </UnstyledButton>
            <div className="flex items-center justify-between gap-2 px-3 py-1">
              <span className="text-xs">{saved.name}</span>
              <ActionIcon
                aria-label={`Delete ${saved.name}`}
                color="red"
                onClick={() => removeBackground(saved.id)}
              >
                ×
              </ActionIcon>
            </div>
          </div>
        ))}
      </div>
      <h3 className="m-0 text-sm font-semibold">Build your own</h3>
      <CustomBackgroundBuilder sceneId={selectedSceneId} />
    </div>
  );
}
