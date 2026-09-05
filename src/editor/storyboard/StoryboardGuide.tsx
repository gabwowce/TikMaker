import React, { useMemo, useState } from "react";
import { computeSceneTimings } from "../../utils/duration";
import { sceneOnScreenText, withOnScreenText } from "../../utils/projectStoryPlan";
import { isVoiceClip } from "../../utils/voiceClips";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";

export const StoryboardGuide: React.FC<{ onOpenStoryboard: () => void }> = ({ onOpenStoryboard }) => {
  const [open, setOpen] = useState(false);
  const project = useProjectStore((state) => state.project);
  const selectedId = useProjectStore((state) => state.selectedSceneId);
  const selectScene = useProjectStore((state) => state.selectScene);
  const updateScene = useProjectStore((state) => state.updateScene);
  const sceneIndex = Math.max(0, project.scenes.findIndex((scene) => scene.id === selectedId));
  const scene = project.scenes[sceneIndex];
  const timings = useMemo(() => computeSceneTimings(project), [project]);
  if (!scene) return null;

  const timing = timings[sceneIndex];
  const voice = (project.audioClips ?? []).find((clip) => clip.from === timing?.from && isVoiceClip(clip));
  const audio = !voice ? "Trūksta audio" : voice.voiceText && voice.voiceText.trim() !== (scene.vo ?? "").trim() ? "Audio pasenęs" : "Audio paruoštas";
  const changePlan = (patch: Partial<NonNullable<typeof scene.plan>>) => updateScene(scene.id, { plan: { role: scene.plan?.role ?? "benefit", ...scene.plan, ...patch } });

  return <div style={{ position: "absolute", left: 12, top: 12, zIndex: 30, width: open ? 340 : "auto", maxWidth: "calc(100% - 24px)", maxHeight: "calc(100% - 24px)", display: "flex", flexDirection: "column", border: `1px solid ${editorColors.border}`, borderRadius: 9, background: "rgba(22,22,22,.96)", boxShadow: "0 12px 36px rgba(0,0,0,.45)", overflow: "hidden" }}>
    <button onClick={() => setOpen((value) => !value)} style={{ border: 0, background: "transparent", color: editorColors.text, padding: "9px 11px", cursor: "pointer", display: "flex", gap: 8 }}><span style={{ color: editorColors.accent }}>▤</span><strong style={{ fontSize: 12 }}>Planas {sceneIndex + 1}/{project.scenes.length}</strong><span style={{ marginLeft: "auto" }}>{open ? "−" : "+"}</span></button>
    {open ? <div style={{ overflowY: "auto", borderTop: `1px solid ${editorColors.border}` }}>
      <div style={{ padding: 12, display: "grid", gap: 9 }}>
        <GuideField label="Tikslas" value={scene.plan?.purpose} onChange={(purpose) => changePlan({ purpose })} />
        <GuideField label="Įgarsinimas" value={scene.vo} onChange={(vo) => updateScene(scene.id, { vo })} rows={3} />
        <div style={{ marginTop: -5, fontSize: 10, color: audio === "Audio paruoštas" ? "#75c98b" : audio === "Audio pasenęs" ? "#ffb15c" : editorColors.textDim }}>● {audio}</div>
        <GuideField label="Tekstas ekrane" value={sceneOnScreenText(scene)} onChange={(value) => updateScene(scene.id, withOnScreenText(scene, value ?? ""))} rows={3} />
        <GuideField label="Ką rodyti" value={scene.plan?.visualBrief} onChange={(visualBrief) => changePlan({ visualBrief })} />
        <GuideField label="Pastabos" value={scene.notes} onChange={(notes) => updateScene(scene.id, { notes })} />
      </div>
      <div style={{ borderTop: `1px solid ${editorColors.border}`, padding: 7, display: "grid", gap: 3 }}>{project.scenes.map((entry, index) => <button key={entry.id} onClick={() => selectScene(entry.id)} style={{ minWidth: 0, border: 0, borderRadius: 5, padding: "6px 7px", textAlign: "left", cursor: "pointer", background: index === sceneIndex ? "rgba(255,112,36,.14)" : "transparent", color: index === sceneIndex ? editorColors.text : editorColors.textDim, fontSize: 10, display: "flex", gap: 7 }}><span>{index + 1}.</span><span style={{ flexShrink: 0, color: index === sceneIndex ? editorColors.accent : editorColors.textDim, textTransform: "uppercase", width: 64 }}>{entry.plan?.role}</span><span style={{ minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.vo || sceneOnScreenText(entry) || "Tuščias kadras"}</span></button>)}</div>
      <button onClick={onOpenStoryboard} style={{ width: "100%", border: 0, borderTop: `1px solid ${editorColors.border}`, background: editorColors.panelElevated, color: editorColors.accent, padding: 9, cursor: "pointer", fontSize: 11 }}>Redaguoti visą planą →</button>
    </div> : null}
  </div>;
};

const GuideField: React.FC<{ label: string; value?: string; rows?: number; onChange: (value?: string) => void }> = ({ label, value, rows = 2, onChange }) => <label><span style={{ display: "block", fontSize: 9, textTransform: "uppercase", letterSpacing: .7, color: editorColors.textDim, marginBottom: 3 }}>{label}</span><textarea rows={rows} value={value ?? ""} onChange={(event) => onChange(event.target.value || undefined)} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: `1px solid ${editorColors.border}`, borderRadius: 5, background: editorColors.panelElevated, color: editorColors.text, padding: "6px 7px", fontFamily: "inherit", fontSize: 11, lineHeight: 1.4 }} /></label>;
