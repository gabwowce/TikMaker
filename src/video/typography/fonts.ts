import { fontFamilies } from "./tokens";
import { assetUrl } from "../../utils/assetUrl";

const fontFiles: Record<string, { file: string; weight: string }> = {
  [fontFamilies.clashBold]: { file: "ClashDisplay-Bold.woff2", weight: "700" },
  [fontFamilies.clashSemibold]: { file: "ClashDisplay-Semibold.woff2", weight: "600" },
  [fontFamilies.clashMedium]: { file: "ClashDisplay-Medium.woff2", weight: "500" },
  [fontFamilies.panchangSemibold]: { file: "Panchang-Semibold.woff2", weight: "600" },
  [fontFamilies.panchangMedium]: { file: "Panchang-Medium.woff2", weight: "500" },
  [fontFamilies.tanker]: { file: "Tanker-Regular.otf", weight: "400" },
};

let injected = false;

export function ensureFontsLoaded() {
  if (injected || typeof document === "undefined") return;
  injected = true;

  const style = document.createElement("style");
  style.textContent = Object.entries(fontFiles)
    .map(
      ([family, { file, weight }]) => `
        @font-face {
          font-family: "${family}";
          src: url("${assetUrl(`/fonts/${file}`)}") format("${file.endsWith(".otf") ? "opentype" : "woff2"}");
          font-weight: ${weight};
          font-style: normal;
          font-display: block;
        }
      `
    )
    .join("\n");
  document.head.appendChild(style);
}
