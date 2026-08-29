import { staticFile } from "remotion";

/**
 * URL for a file living in `public/`.
 *
 * A bare "/assets/..." string works in the editor (Vite serves `public/` at the
 * web root) but NOT in a render: Remotion serves the bundle root, and the
 * public folder sits one level down inside it, so every hardcoded absolute path
 * 404s and the render dies on the first missing font or sound. `staticFile`
 * resolves correctly in both, so every reference to a public asset must go
 * through here.
 *
 * Remote URLs and inline data URIs are passed through untouched.
 */
export function assetUrl(src: string): string {
  if (!src) return src;
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  return staticFile(src.startsWith("/") ? src.slice(1) : src);
}
