import { editorColors } from "./theme";
const css = `
  .panel-stack > :nth-child(2) {
    width: 100% !important;

    flex: 1 1 0;
    min-height: 0;
    border-left: none !important;
  }

  :root {
    --editor-panel: ${editorColors.panel};
    --editor-panel-raised: ${editorColors.panelElevated};
    --editor-border: ${editorColors.border};
    --editor-text: ${editorColors.text};
    --editor-muted: ${editorColors.textDim};
    --editor-accent: ${editorColors.accent};
    color-scheme: dark;
    scrollbar-color: ${editorColors.border} transparent;
    scrollbar-width: thin;
  }

  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: #333333;

    border: 2px solid transparent;
    background-clip: padding-box;
    border-radius: 6px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #4a4a4a;
    background-clip: padding-box;
  }

  ::-webkit-scrollbar-corner {
    background: transparent;
  }
`;
export function GlobalStyles() {
  return <style>{css}</style>;
}
