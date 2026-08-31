import React from "react";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";
import { computeSceneTimings } from "../../utils/duration";

const presets = [
  { id: "headline", label: "Headline line", description: "A styled Rich Headline line in the scene text stack." },
  { id: "text", label: "Free text", description: "An independently positioned text layer." },
  { id: "badge", label: "Badge / pill", description: "A small independently positioned label." },
] as const;

export const TextLibrary: React.FC = () => {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const project = useProjectStore((s) => s.project);
  const scene = project.scenes.find((value) => value.id === selectedSceneId);
  const updateSceneRichHeadline = useProjectStore((s) => s.updateSceneRichHeadline);
  const updateSceneBlocks = useProjectStore((s) => s.updateSceneBlocks);
  const playheadFrame = useProjectStore((s) => s.playheadFrame);
  if (!scene || !selectedSceneId) return <div style={{ color: editorColors.textDim, fontSize: 11 }}>Pasirink kadrą, į kurį nori pridėti tekstą.</div>;

  const add = (id: typeof presets[number]["id"]) => {
    const sceneFrom = computeSceneTimings(project).find((entry) => entry.scene.id === selectedSceneId)?.from ?? 0;
    const localDelay = Math.max(0, playheadFrame - sceneFrom);
    if (id === "headline") {
      updateSceneRichHeadline(selectedSceneId, [...(scene.content.richHeadline ?? []), { text: "NEW HEADLINE", size: "headline", animation: "slideUp", delay: localDelay }]);
      return;
    }
    const blocks = scene.content.blocks ?? [];
    updateSceneBlocks(selectedSceneId, [...blocks, {
      id: `block-${Date.now().toString(36)}`,
      type: id,
      text: id === "badge" ? "NEW BADGE" : "NEW TEXT",
      x: 50,
      y: 50 + blocks.length * 6,
      animation: id === "badge" ? "pop" : "slideUp",
      splitBy: "word",
      delay: localDelay,
    }]);
  };

  return <div>
    <div style={{ fontSize: 10, color: editorColors.textDim, marginBottom: 10 }}>Paspaudus elementas įdedamas ties dabartiniu playhead ir iškart atsiranda timeline.</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{presets.map((preset) => <button key={preset.id} onClick={() => add(preset.id)} style={cardStyle}><strong style={{ fontSize: 12 }}>{preset.label}</strong><span style={{ fontSize: 10, color: editorColors.textDim }}>{preset.description}</span><span style={{ position: "absolute", right: 10, top: 16, color: editorColors.accent, fontSize: 18 }}>+</span></button>)}</div>
  </div>;
};

const cardStyle: React.CSSProperties = { position: "relative", display: "flex", flexDirection: "column", gap: 4, padding: "12px 34px 12px 12px", textAlign: "left", borderRadius: 8, border: `1px solid ${editorColors.border}`, background: editorColors.panelElevated, color: editorColors.text, cursor: "pointer" };
