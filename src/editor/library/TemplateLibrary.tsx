import React from "react";
import { scriptTemplateRegistry } from "../../registries/scriptTemplates";
import { useProjectStore } from "../state/projectStore";
import { editorColors } from "../theme";

export const TemplateLibrary: React.FC = () => {
  const useScriptTemplate = useProjectStore((s) => s.useScriptTemplate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
