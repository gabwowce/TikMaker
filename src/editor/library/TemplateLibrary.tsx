import React from "react";
import { scriptTemplateRegistry } from "../../registries/scriptTemplates";
import { useProjectStore } from "../state/projectStore";
import { instantiateSavedTemplate, useSavedTemplatesStore } from "../state/savedTemplatesStore";
import { editorColors } from "../theme";

const smallActionStyle: React.CSSProperties = {
  fontSize: 10,
  padding: "3px 8px",
  borderRadius: 4,
  border: `1px solid ${editorColors.border}`,
  background: "transparent",
  color: editorColors.textDim,
  cursor: "pointer",
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: editorColors.textDim,
  padding: "6px 2px 0",
};

export const TemplateLibrary: React.FC = () => {
  const useScriptTemplate = useProjectStore((s) => s.useScriptTemplate);
  const loadProject = useProjectStore((s) => s.loadProject);
  const templates = useSavedTemplatesStore((s) => s.templates);
  const loadTemplates = useSavedTemplatesStore((s) => s.load);
  const removeTemplate = useSavedTemplatesStore((s) => s.remove);
  const renameTemplate = useSavedTemplatesStore((s) => s.rename);

  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {templates.length ? (
        <>
          <div style={sectionLabelStyle}>Tavo šablonai</div>
          {templates.map((template) => (
            <div
              key={template.id}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${editorColors.border}`,
                background: editorColors.panelElevated,
              }}
            >
              <button
                onClick={() => loadProject(instantiateSavedTemplate(template))}
                style={{
                  textAlign: "left",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: editorColors.text,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{template.name}</div>
                <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 3, lineHeight: 1.4 }}>
                  {template.description || `${template.project.scenes.length} scenos`}
                </div>
              </button>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <button
                  style={smallActionStyle}
                  onClick={() => {
                    const name = window.prompt("Naujas šablono pavadinimas", template.name);
                    if (name?.trim()) renameTemplate(template.id, name.trim());
                  }}
                >
                  Pervadinti
                </button>
                <button
                  style={smallActionStyle}
                  onClick={() => {
                    if (window.confirm(`Ištrinti šabloną „${template.name}“?`)) removeTemplate(template.id);
                  }}
                >
                  Ištrinti
                </button>
              </div>
            </div>
          ))}
          <div style={sectionLabelStyle}>Įmontuoti šablonai</div>
        </>
      ) : null}
      <div style={{ fontSize: 11, color: editorColors.textDim, lineHeight: 1.5, padding: "0 2px 2px" }}>
        Geriausiai veikiantys TikTok scenarijų šablonai — pasirink vieną, jis atsidarys kaip naujas projektas su
        pavyzdiniu turiniu, kurį gali redaguoti kaip įprastą sceną.
      </div>
      {scriptTemplateRegistry.map((template) => (
        <button
          key={template.id}
          onClick={() => useScriptTemplate(template.id)}
          style={{
            textAlign: "left",
            padding: "12px 12px 10px",
            borderRadius: 8,
            border: `1px solid ${editorColors.border}`,
            background: editorColors.panelElevated,
            color: editorColors.text,
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>{template.name}</div>
          <div style={{ fontSize: 11, color: editorColors.textDim, marginTop: 3, lineHeight: 1.4 }}>
            {template.description}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
            {template.flow.map((step, i) => (
              <span
                key={i}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "rgba(255,112,36,0.12)",
                  color: editorColors.accent,
                }}
              >
                {step}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
};
