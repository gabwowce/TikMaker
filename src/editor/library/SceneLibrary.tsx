import { Button, TextInput, UnstyledButton } from "@mantine/core";
import { useEffect, useState } from "react";
import {
  getSceneDefinition,
  sceneRegistry,
} from "../../registries/sceneRegistry";
import { usePreferences } from "../state/fileLibrary";
import { useProjectStore } from "../state/projectStore";
import {
  instantiateSavedScene,
  useSavedScenesStore,
} from "../state/savedScenesStore";

function describe(scene: ReturnType<typeof instantiateSavedScene>): string {
  const bits: string[] = [getSceneDefinition(scene.type).name];
  const headline =
    scene.content.headline ??
    scene.content.richHeadline?.map((l) => l.text).join(" ");
  if (headline)
    bits.push(`“${headline.slice(0, 40)}${headline.length > 40 ? "…" : ""}”`);
  if (scene.visual) bits.push(scene.visual.type);
  const layers = scene.content.visuals?.length ?? 0;
  if (layers) bits.push(`+${layers} layer${layers === 1 ? "" : "s"}`);
  return bits.join(" · ");
}
export function SceneLibrary() {
  const addScene = useProjectStore((s) => s.addScene);
  const insertScene = useProjectStore((s) => s.insertScene);
  const currentScene = useProjectStore((s) =>
    s.project.scenes.find((sc) => sc.id === s.selectedSceneId),
  );
  const saved = useSavedScenesStore((s) => s.scenes);
  const loadSaved = useSavedScenesStore((s) => s.load);
  const saveScene = useSavedScenesStore((s) => s.save);
  const removeSaved = useSavedScenesStore((s) => s.remove);
  const renameSaved = useSavedScenesStore((s) => s.rename);
  const [name, setName] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const hidden = usePreferences((s) => s.hiddenSceneTypes);
  const toggleHidden = usePreferences((s) => s.toggleHidden);
  const visibleSceneTypes = showHidden
    ? sceneRegistry
    : sceneRegistry.filter((scene) => !hidden.includes(scene.type));
  useEffect(() => {
    loadSaved();
  }, [loadSaved]);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[0_0_6px]">
          Your Scenes ({saved.length})
        </div>

        {currentScene ? (
          <div className="flex gap-1.5 mb-2">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this scene…"
              className="flex-1 min-w-0"
            />
            <Button
              variant="default"
              className={`${name.trim() ? "opacity-[1]" : "opacity-[0.5]"}`}
              disabled={!name.trim()}
              onClick={() => {
                saveScene(currentScene, name.trim());
                setName("");
              }}
            >
              Save scene
            </Button>
          </div>
        ) : null}

        {saved.length === 0 ? (
          <div className="text-[11px] text-editor-muted">
            Nothing saved yet.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {saved.map((entry) => (
              <div key={entry.id} className="relative">
                <UnstyledButton
                  className="w-full block min-w-0 rounded-md p-2 text-left"
                  aria-label="Add a copy of this scene after the selected one"
                  onClick={() => insertScene(instantiateSavedScene(entry))}
                >
                  <div className="text-[12px] font-semibold pr-10">
                    {entry.name}
                  </div>
                  <div className="text-[10px] text-editor-muted mt-0.5">
                    {describe(entry.scene)}
                  </div>
                </UnstyledButton>
                <div className="absolute top-1.5 right-1.5 flex gap-1">
                  <Button
                    variant="default"
                    aria-label="Rename"
                    onClick={() => {
                      const next = window.prompt(
                        "Rename saved scene",
                        entry.name,
                      );
                      if (next?.trim()) renameSaved(entry.id, next.trim());
                    }}
                  >
                    ✎
                  </Button>
                  <Button
                    variant="default"
                    aria-label="Delete from your saved scenes"
                    onClick={() => {
                      if (window.confirm(`Delete saved scene "${entry.name}"?`))
                        removeSaved(entry.id);
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <div className="text-[11px] uppercase tracking-[1px] text-editor-muted m-[0_0_6px]">
            Blank Scenes
          </div>
          {hidden.length ? (
            <Button variant="default" onClick={() => setShowHidden((v) => !v)}>
              {showHidden
                ? "Hide hidden scenes"
                : `Show hidden scenes (${hidden.length})`}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          {visibleSceneTypes.map((scene) => {
            const isHidden = hidden.includes(scene.type);
            return (
              <div
                key={scene.type}
                className={`relative ${isHidden ? "opacity-[0.45]" : "opacity-[1]"}`}
              >
                <UnstyledButton
                  onClick={() => addScene(scene.type)}
                  className="w-full block min-w-0 rounded-md p-2 text-left"
                >
                  <div className="text-[13px] font-semibold pr-6.5">
                    {scene.name}
                  </div>
                </UnstyledButton>
                <Button
                  variant="default"
                  className="absolute top-1.5 right-1.5"
                  aria-label={
                    isHidden
                      ? "Restore to list"
                      : "Hide from the list. Projects using this scene type will still work."
                  }
                  onClick={() => toggleHidden("hiddenSceneTypes", scene.type)}
                >
                  {isHidden ? "↺" : "✕"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
