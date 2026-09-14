import { staticFile } from "remotion";
export function assetUrl(src: string): string {
  if (!src) return src;
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  return staticFile(src.startsWith("/") ? src.slice(1) : src);
}
