import { config } from "dotenv";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
config({ path: path.resolve(process.cwd(), ".env.local") });
const ROOT = process.cwd();
export const SOURCE_DIRS = {
  logos: process.env.TIKMAKER_AI_PATH ?? path.join(ROOT, "ai"),
  props: process.env.TIKMAKER_PROPS_PATH ?? path.join(ROOT, "props"),
  sfx: process.env.TIKMAKER_SFX_PATH ?? path.join(ROOT, "sfx"),
  fonts: process.env.TIKMAKER_FONTS_PATH ?? path.join(ROOT, "fonts"),
};
const PUBLIC = path.join(ROOT, "public");
const LOGOS_OUT = path.join(PUBLIC, "assets", "logos");
const PROPS_OUT = path.join(PUBLIC, "assets", "props");
const SFX_OUT = path.join(PUBLIC, "assets", "sfx");
const FONTS_OUT = path.join(PUBLIC, "fonts");
const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
const SFX_EXT = [".wav", ".mp3"];
const FONT_EXT = [".woff2", ".woff", ".otf", ".ttf"];
const MANIFEST_PATH = path.join(
  ROOT,
  "src",
  "registries",
  "assets.generated.ts",
);
function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}
function toId(filename: string): string {
  return path
    .basename(filename, path.extname(filename))
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/\.svg$/, "")
    .replace(/[^a-z0-9-]/g, "");
}
type ManifestEntry = {
  id: string;
  file: string;
  label: string;
};
function syncDir(
  srcDir: string,
  outDir: string,
  extensions: string[],
): ManifestEntry[] {
  if (!existsSync(srcDir)) {
    console.warn(`[assets:sync] source missing, skipping: ${srcDir}`);
    return [];
  }
  ensureDir(outDir);
  const entries: ManifestEntry[] = [];
  for (const filename of readdirSync(srcDir)) {
    const ext = path.extname(filename).toLowerCase();
    if (!extensions.includes(ext)) continue;
    copyFileSync(path.join(srcDir, filename), path.join(outDir, filename));
    const id = toId(filename);
    const label = path
      .basename(filename, path.extname(filename))
      .replace(/[_-]+/g, " ")
      .replace(/\.svg$/, "")
      .trim();
    entries.push({ id, file: filename, label });
  }
  return entries.sort((a, b) =>
    a.id < b.id
      ? -1
      : a.id > b.id
        ? 1
        : a.file < b.file
          ? -1
          : a.file > b.file
            ? 1
            : 0,
  );
}
function syncFonts() {
  if (!existsSync(SOURCE_DIRS.fonts)) {
    console.warn(
      `[assets:sync] fonts source missing, skipping: ${SOURCE_DIRS.fonts}`,
    );
    return;
  }
  ensureDir(FONTS_OUT);
  for (const filename of readdirSync(SOURCE_DIRS.fonts)) {
    const ext = path.extname(filename).toLowerCase();
    if (!FONT_EXT.includes(ext)) continue;
    copyFileSync(
      path.join(SOURCE_DIRS.fonts, filename),
      path.join(FONTS_OUT, filename),
    );
  }
}
export type SyncResult = {
  logos: number;
  props: number;
  sfx: number;
  changed: boolean;
};
export function syncAssets(): SyncResult {
  const logos = syncDir(SOURCE_DIRS.logos, LOGOS_OUT, IMAGE_EXT);
  const props = syncDir(SOURCE_DIRS.props, PROPS_OUT, IMAGE_EXT);
  const sfx = syncDir(SOURCE_DIRS.sfx, SFX_OUT, SFX_EXT);
  syncFonts();
  const manifestSource = `export type AssetManifestEntry = { id: string; file: string; label: string };

export const generatedLogos: AssetManifestEntry[] = ${JSON.stringify(logos, null, 2)};

export const generatedProps: AssetManifestEntry[] = ${JSON.stringify(props, null, 2)};

export const generatedSfx: AssetManifestEntry[] = ${JSON.stringify(sfx, null, 2)};
`;
  ensureDir(path.dirname(MANIFEST_PATH));
  const previous = existsSync(MANIFEST_PATH)
    ? readFileSync(MANIFEST_PATH, "utf-8")
    : "";
  const changed = previous !== manifestSource;
  if (changed) writeFileSync(MANIFEST_PATH, manifestSource, "utf-8");
  return { logos: logos.length, props: props.length, sfx: sfx.length, changed };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = syncAssets();
  console.log(
    `[assets:sync] synced ${result.logos} logos, ${result.props} props, ${result.sfx} sfx. Manifest ${result.changed ? "written" : "unchanged"}.`,
  );
}
