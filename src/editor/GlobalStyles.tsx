import React from "react";
import { editorColors } from "./theme";

/**
 * The only global stylesheet in the app.
 *
 * Everything else here is inline styles, which is fine for elements we render —
 * but a scrollbar isn't one of them. There is no element to style, so the
 * browser paints its own light-mode chrome down the side of a dark editor and
 * every scrolling panel gets a bright stripe. That has to be CSS, and it should
 * read its colours from the SAME `editorColors` the panels do rather than
 * repeating hex values that then drift from the theme.
 *
 * `color-scheme: dark` is the half that isn't scrollbars: it also switches
 * native form controls, the page's own backdrop and Firefox's scrollbars, which
 * ignore the WebKit pseudo-elements entirely.
 */
const css = `
  /**
   * The right column stacks a small Scene/Object switch above whichever panel
   * is showing. Both panels size THEMSELVES — each sets the column width and
   * expects to be a direct flex child of the row — so once they sit inside a
   * wrapper they have to be told to fill it instead. This cannot be an inline
   * style: the rule targets a child rendered by another component.
   */
  .panel-stack > :nth-child(2) {
    width: 100% !important;
    /* Basis 0, not auto: with auto the panel's own tall content sets the
       basis and the box grows past the column instead of scrolling inside it. */
    flex: 1 1 0;
    min-height: 0;
    border-left: none !important;
  }

  :root {
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
    /* Inset by a transparent border so the thumb reads as a floating bar
       rather than filling the gutter edge to edge. */
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

export const GlobalStyles: React.FC = () => <style>{css}</style>;
