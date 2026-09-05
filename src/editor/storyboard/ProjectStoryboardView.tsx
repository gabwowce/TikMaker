import React, { useMemo } from "react";
import { scenePlanRoleSchema, type Scene } from "../../schema/scene";
import { projectDurationInFrames, computeSceneTimings } from "../../utils/duration";
import { projectPlanJson, sceneOnScreenText, withOnScreenText } from "../../utils/projectStoryPlan";
import { isVoiceClip } from "../../utils/voiceClips";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";

export const ProjectStoryboardView: React.FC<{ onOpenScenes: () => void }> = ({ onOpenScenes }) => {
  const project = useProjectStore((state) => state.project);
  const selectedId = useProjectStore((state) => state.selectedSceneId);
  const selectScene = useProjectStore((state) => state.selectScene);
  const updateScene = useProjectStore((state) => state.updateScene);
  const updateStory = useProjectStore((state) => state.updateProjectStoryPlan);
  const moveScene = useProjectStore((state) => state.moveScene);
  const duplicateScene = useProjectStore((state) => state.duplicateScene);
  const removeScene = useProjectStore((state) => state.removeScene);
  const addScene = useProjectStore((state) => state.addScene);
  const timings = useMemo(() => computeSceneTimings(project), [project]);
  const selected = project.scenes.find((scene) => scene.id === selectedId) ?? project.scenes[0];
  const selectedIndex = selected ? project.scenes.indexOf(selected) : -1;
  const seconds = projectDurationInFrames(project) / project.fps;

  const updateSelected = (patch: Partial<Scene>) => selected && updateScene(selected.id, patch);
  const updateText = (value: string) => selected && updateScene(selected.id, withOnScreenText(selected, value));

  const downloadPlan = () => {
    const blob = new Blob([projectPlanJson(project)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.id}.plan.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 50, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", borderBottom: `1px solid ${editorColors.border}`, background: editorColors.panel }}>
        <strong style={{ fontSize: 13 }}>{project.title}</strong>
        <label style={topLabelStyle}>Tikslas <input type="number" min={1} value={project.storyPlan?.targetDuration ?? ""} placeholder="—" onChange={(event) => updateStory({ targetDuration: event.target.value ? Number(event.target.value) : undefined })} style={{ ...inputStyle, width: 58 }} /> s</label>
        <span style={{ fontSize: 11, color: seconds > (project.storyPlan?.targetDuration ?? Infinity) ? "#ff8a65" : editorColors.textDim }}>{project.scenes.length} kadrai · {seconds.toFixed(1)}s</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => void navigator.clipboard.writeText(projectPlanJson(project))} style={buttonStyle}>Copy AI JSON</button>
        <button onClick={downloadPlan} style={buttonStyle}>Export AI JSON</button>
        <button onClick={onOpenScenes} style={primaryButtonStyle}>Atidaryti montažą →</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(360px, 1fr) minmax(320px, 440px)" }}>
        <div style={{ overflowY: "auto", padding: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            {project.scenes.map((scene, index) => {
              const status = sceneStatus(scene, index, project, timings);
              return <button key={scene.id} onClick={() => selectScene(scene.id)} style={{ padding: 11, display: "grid", gridTemplateColumns: "28px 92px 1fr auto", gap: 8, alignItems: "start", textAlign: "left", borderRadius: 8, border: `1px solid ${scene.id === selected?.id ? editorColors.accent : editorColors.border}`, background: scene.id === selected?.id ? "rgba(255,112,36,.08)" : editorColors.panelElevated, color: editorColors.text, cursor: "pointer" }}>
                <span style={{ color: editorColors.textDim }}>{index + 1}.</span>
                <span style={{ color: editorColors.accent, fontSize: 10, textTransform: "uppercase" }}>{scene.plan?.role}</span>
                <span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{scene.vo || sceneOnScreenText(scene) || "Tuščias kadras"}</span><span style={{ display: "block", marginTop: 3, fontSize: 10, color: editorColors.textDim }}>{scene.plan?.purpose || "Trūksta kadro tikslo"}</span></span>
                <span style={{ fontSize: 10, color: status === "Complete" ? "#75c98b" : "#ffb15c" }}>● {status}</span>
              </button>;
            })}
          </div>
          <button onClick={() => addScene("visual-explainer")} style={{ ...buttonStyle, width: "100%", marginTop: 10, borderStyle: "dashed" }}>+ Pridėti trūkstamą kadrą</button>
        </div>

        <aside style={{ overflowY: "auto", borderLeft: `1px solid ${editorColors.border}`, background: editorColors.panel, padding: 16 }}>
          {!selected ? <div style={{ color: editorColors.textDim }}>Pridėk pirmą kadrą.</div> : <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}><strong style={{ flex: 1 }}>Kadras {selectedIndex + 1}</strong><button disabled={selectedIndex <= 0} onClick={() => moveScene(selected.id, "up")} style={smallButtonStyle}>↑</button><button disabled={selectedIndex >= project.scenes.length - 1} onClick={() => moveScene(selected.id, "down")} style={smallButtonStyle}>↓</button><button onClick={() => duplicateScene(selected.id)} style={smallButtonStyle}>Dubl.</button><button onClick={() => removeScene(selected.id)} style={smallButtonStyle}>×</button></div>
            <Field label="Rolė"><select value={selected.plan?.role ?? "benefit"} onChange={(event) => updateSelected({ plan: { ...selected.plan, role: scenePlanRoleSchema.parse(event.target.value) } })} style={inputStyle}>{scenePlanRoleSchema.options.map((role) => <option key={role}>{role}</option>)}</select></Field>
            <Field label="Kadro tikslas"><textarea rows={2} value={selected.plan?.purpose ?? ""} onChange={(event) => updateSelected({ plan: { role: selected.plan?.role ?? "benefit", ...selected.plan, purpose: event.target.value || undefined } })} style={inputStyle} /></Field>
            <Field label="Įgarsinimas"><textarea rows={3} value={selected.vo ?? ""} onChange={(event) => updateSelected({ vo: event.target.value || undefined })} style={inputStyle} /></Field>
            <Field label="Tekstas ekrane" hint="Kiekviena nauja eilutė = atskiras animuojamas teksto objektas"><textarea rows={3} value={sceneOnScreenText(selected)} onChange={(event) => updateText(event.target.value)} style={inputStyle} /></Field>
            <Field label="Ką rodyti"><textarea rows={3} value={selected.plan?.visualBrief ?? ""} onChange={(event) => updateSelected({ plan: { role: selected.plan?.role ?? "benefit", ...selected.plan, visualBrief: event.target.value || undefined } })} style={inputStyle} /></Field>
            <Field label="Pastabos"><textarea rows={3} value={selected.notes ?? ""} onChange={(event) => updateSelected({ notes: event.target.value || undefined })} style={inputStyle} /></Field>
          </div>}
        </aside>
      </div>
    </div>
  );
};

function sceneStatus(scene: Scene, index: number, project: ReturnType<typeof useProjectStore.getState>["project"], timings: ReturnType<typeof computeSceneTimings>): string {
  if (!scene.vo?.trim()) return "Needs VO";
  if (!sceneOnScreenText(scene).trim()) return "Needs text";
  if (!scene.plan?.visualBrief?.trim() && !scene.content.visuals?.length) return "Needs visual";
  const timing = timings[index];
  const voice = timing && (project.audioClips ?? []).find((clip) => clip.from === timing.from && isVoiceClip(clip));
  if (!voice) return "Needs audio";
  if (voice.voiceText && voice.voiceText.trim() !== scene.vo.trim()) return "Audio outdated";
  return "Complete";
}

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => <label style={{ display: "block" }}><span style={{ display: "block", marginBottom: 4, color: editorColors.textDim, fontSize: 9, textTransform: "uppercase", letterSpacing: .7 }}>{label}</span>{children}{hint ? <span style={{ display: "block", marginTop: 3, color: editorColors.textDim, fontSize: 9 }}>{hint}</span> : null}</label>;
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "7px 8px", borderRadius: 6, border: `1px solid ${editorColors.border}`, background: "#222", color: editorColors.text, font: "inherit", fontSize: 12, resize: "vertical" };
const buttonStyle: React.CSSProperties = { padding: "7px 10px", borderRadius: 6, border: `1px solid ${editorColors.border}`, background: editorColors.panelElevated, color: editorColors.text, fontSize: 11, cursor: "pointer" };
const primaryButtonStyle: React.CSSProperties = { ...buttonStyle, borderColor: editorColors.accent, color: editorColors.accent };
const smallButtonStyle: React.CSSProperties = { ...buttonStyle, padding: "4px 7px" };
const topLabelStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: editorColors.textDim };
