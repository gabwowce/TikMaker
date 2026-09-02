import React from "react";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";
import { computeSceneTimings } from "../../utils/duration";
import { qualifySelection } from "../timeline/selectionId";

/**
 * ONE way to add text.
 *
 * There used to be three — "Headline line", "Free text", "Badge / pill" — and
 * they were not three different things. They were one thing with three
 * preset field values, except the choice was permanent: a block could never
 * become a pill, and a headline could never be positioned freely, because they
 * were stored in different arrays with different fields.
 *
 * Now there is a text object. Whether it sits in the scene's column or at a
 * point of its own, whether it has a pill box, what colour and size it is —
 * all of that is a setting on the selected object, changeable at any time,
 * which is what someone reaching for "Badge / pill" actually wanted.
 */
export const TextLibrary: React.FC = () => {
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const project = useProjectStore((s) => s.project);
  const scene = project.scenes.find((value) => value.id === selectedSceneId);
  const updateSceneRichHeadline = useProjectStore((s) => s.updateSceneRichHeadline);
  const selectObject = useProjectStore((s) => s.selectObject);
  const playheadFrame = useProjectStore((s) => s.playheadFrame);

  if (!scene || !selectedSceneId) {
    return <div style={{ color: editorColors.textDim, fontSize: 11 }}>Pasirink kadrą, į kurį nori pridėti tekstą.</div>;
  }

  const lines = scene.content.richHeadline ?? [];
  // The schema caps the stack at six, and a silently ignored click reads as a
  // broken button.
  const full = lines.length >= 6;

  const add = () => {
    if (full) return;
    const sceneFrom = computeSceneTimings(project).find((entry) => entry.scene.id === selectedSceneId)?.from ?? 0;
    const delay = Math.max(0, playheadFrame - sceneFrom);
    updateSceneRichHeadline(selectedSceneId, [
      ...lines,
      { text: "Naujas tekstas", size: "headline", animation: "slideUp", delay },
    ]);
    // Selected straight away, because the next thing you want is its settings.
    selectObject(qualifySelection(selectedSceneId, `line-${lines.length}`));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 10, color: editorColors.textDim, lineHeight: 1.5 }}>
        Tekstas įdedamas ties playhead'u ir iš karto pažymimas — turinys, šriftas, spalva, registras, vieta, dydis,
        pill, animacija ir garsas nustatomi dešinėje.
      </div>

      <button
        onClick={add}
        disabled={full}
        style={{
          position: "relative",
          textAlign: "left",
          padding: "13px 14px",
          borderRadius: 8,
          border: `1px solid ${full ? editorColors.border : editorColors.accent}`,
          background: editorColors.panelElevated,
          color: editorColors.text,
          cursor: full ? "default" : "pointer",
          opacity: full ? 0.5 : 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <strong style={{ fontSize: 12 }}>Tekstas</strong>
        <span style={{ fontSize: 10, color: editorColors.textDim }}>
          {full ? "Scenoje jau šešios eilutės — daugiau schema neleidžia." : "Nauja teksto eilutė šioje scenoje."}
        </span>
        <span style={{ position: "absolute", right: 12, top: 16, color: editorColors.accent, fontSize: 18 }}>+</span>
      </button>

      {lines.length ? (
        <div style={{ fontSize: 10, color: editorColors.textDim }}>
          Šioje scenoje: {lines.length} {lines.length === 1 ? "eilutė" : "eilutės"}. Sąrašas — Inspector'iaus Content
          kortelėje.
        </div>
      ) : null}
    </div>
  );
};
