import React, { useEffect, useState } from "react";
import { sceneRegistry, getSceneDefinition } from "../../registries/sceneRegistry";
import { useProjectStore } from "../state/projectStore";
import { useSavedScenesStore, instantiateSavedScene } from "../state/savedScenesStore";
import { editorColors } from "../theme";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: editorColors.textDim,
  margin: "0 0 6px",
};

const cardStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${editorColors.border}`,
  background: editorColors.panelElevated,
  color: editorColors.text,
  cursor: "pointer",
  width: "100%",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "4px 8px",
  fontSize: 10,
  borderRadius: 6,
  border: `1px solid ${editorColors.border}`,
  background: "transparent",
  color: editorColors.textDim,
  cursor: "pointer",
};

/** One-line summary so a saved scene is recognisable without opening it. */
function describe(scene: ReturnType<typeof instantiateSavedScene>): string {
  const bits: string[] = [getSceneDefinition(scene.type).name];
  const headline = scene.content.headline ?? scene.content.richHeadline?.map((l) => l.text).join(" ");
  if (headline) bits.push(`“${headline.slice(0, 40)}${headline.length > 40 ? "…" : ""}”`);
  if (scene.visual) bits.push(scene.visual.type);
  const layers = scene.content.visuals?.length ?? 0;
  if (layers) bits.push(`+${layers} layer${layers === 1 ? "" : "s"}`);
  return bits.join(" · ");
}

export const SceneLibrary: React.FC = () => {
  const addScene = useProjectStore((s) => s.addScene);
  const insertScene = useProjectStore((s) => s.insertScene);
  const currentScene = useProjectStore((s) => s.project.scenes.find((sc) => sc.id === s.selectedSceneId));

  const saved = useSavedScenesStore((s) => s.scenes);
  const loadSaved = useSavedScenesStore((s) => s.load);
  const saveScene = useSavedScenesStore((s) => s.save);
  const removeSaved = useSavedScenesStore((s) => s.remove);
  const renameSaved = useSavedScenesStore((s) => s.rename);

  const [name, setName] = useState("");

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={sectionTitleStyle}>Your Scenes ({saved.length})</div>
        <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 8, lineHeight: 1.4 }}>
          Keep a scene you like — copy, visual, layers, animations and all — and drop it into any project later. It's
          saved with fresh ids, so you can reuse the same one as many times as you want.
        </div>

        {currentScene ? (
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this scene…"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "6px 8px",
                borderRadius: 6,
                border: `1px solid ${editorColors.border}`,
                background: editorColors.panelElevated,
                color: editorColors.text,
                fontSize: 11,
              }}
            />
            <button
              style={{ ...smallButtonStyle, opacity: name.trim() ? 1 : 0.5 }}
              disabled={!name.trim()}
              onClick={() => {
                saveScene(currentScene, name.trim());
                setName("");
              }}
            >
              Save scene
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 8 }}>
            Select a scene to save it here.
          </div>
        )}

        {saved.length === 0 ? (
          <div style={{ fontSize: 11, color: editorColors.textDim }}>Nothing saved yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {saved.map((entry) => (
              <div key={entry.id} style={{ position: "relative" }}>
                <button
                  style={cardStyle}
                  title="Add a copy of this scene after the selected one"
                  onClick={() => insertScene(instantiateSavedScene(entry))}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, paddingRight: 40 }}>{entry.name}</div>
                  <div style={{ fontSize: 10, color: editorColors.textDim, marginTop: 2 }}>
                    {describe(entry.scene)}
                  </div>
                </button>
                <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4 }}>
                  <button
                    style={smallButtonStyle}
                    title="Rename"
                    onClick={() => {
                      const next = window.prompt("Rename saved scene", entry.name);
                      if (next?.trim()) renameSaved(entry.id, next.trim());
                    }}
                  >
                    ✎
                  </button>
                  <button
                    style={smallButtonStyle}
                    title="Delete from your saved scenes"
                    onClick={() => {
                      if (window.confirm(`Delete saved scene "${entry.name}"?`)) removeSaved(entry.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={sectionTitleStyle}>Blank Scenes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sceneRegistry.map((scene) => (
            <button key={scene.type} onClick={() => addScene(scene.type)} style={cardStyle}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{scene.name}</div>
              <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 2 }}>{scene.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
