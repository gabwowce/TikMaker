import type { CSSProperties } from "react";
import { Img, Sequence } from "remotion";
import { getLogo } from "../../registries/logoRegistry";
import { getProp } from "../../registries/propRegistry";
import { assetUrl } from "../../utils/assetUrl";
import { spokenWords } from "../../utils/voWords";
import type { SceneWord } from "../code/types";
import { usePack } from "../stage/pack";
import { ScreenRecording } from "../visuals/media/ScreenRecording";

export { field } from "./fields";

// The channel's brand kit for code scenes (skill: tikmaker-explainer). The
// video already draws the backdrop and the captions; the scene's code takes
// its colours and its ONE font family from useBrand(), and uses these slots
// for what the creator supplies: a real photo, a real screen recording, a
// logo. The file of a photo or a recording comes from the scene's fields
// (field.photo / field.recording) – the creator picks it in the Inspector.

// The caption band the shell draws in – keep the picture above it.
export const CAPTION_TOP = 1130;
export const CAPTION_BOTTOM = 1340;

// Colours and fonts: bg, text, textSoft, accent (the only accent), border;
// fontStrong / fontSemi / fontRegular (one family), fontUi (app text), and
// MONO for code and terminals.
export function useBrand() {
  return usePack();
}
// Scene colours for styles that light each scene in its own colour (depth):
// a glow on a dark scene, or the tint of a light one. One family, so a video
// stays one video.
export const SCENE_COLORS = {
  blue: "#3b82f6", // a tool, a system
  teal: "#14b8a6", // it works, saved, growth
  purple: "#8b5cf6", // ideas, commands, AI
  amber: "#f59e0b", // warmth, creative, colour
  orange: "#ff7024", // the brand: the hook, the payoff
  magenta: "#e11d74", // a problem, a cost
} as const;
export const DARK_BG = "#070a12";
export const LIGHT_BG = "#f1f3f6";
export const LIGHT_TEXT = "#1b1d22";
export const LIGHT_TEXT_SOFT = "#6b7280";

export const MONO = '"JetBrains Mono", "Cascadia Code", Consolas, monospace';

type Box = { width: number; height: number; style?: CSSProperties };

// A real picture the creator puts in (`src`, from a field.photo): "cutout" –
// without a background, with a soft shadow; "card" – a photo in a
// white-bordered card. Until then: a dashed place saying what to find.
// Give it room (at least ~500 px wide) and never put it over another element.
export function PhotoSlot({
  src,
  find,
  look = "cutout",
  width,
  height,
  style,
}: Box & { src?: string; find: string; look?: "cutout" | "card" }) {
  const c = useBrand();
  if (!src)
    return (
      <Placeholder
        label="▣ PHOTO"
        text={find}
        width={width}
        height={height}
        style={style}
      />
    );
  if (look === "card")
    return (
      <div
        style={{
          width,
          height,
          padding: 14,
          boxSizing: "border-box",
          background: "#fff",
          borderRadius: 20,
          boxShadow:
            "0 6px 16px rgba(0,0,0,0.45), 0 40px 80px rgba(0,0,0,0.6)",
          ...style,
        }}
      >
        <Img
          src={assetUrl(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 8,
          }}
        />
      </div>
    );
  return (
    <Img
      src={assetUrl(src)}
      style={{
        width,
        height,
        objectFit: "contain",
        filter: `drop-shadow(0 34px 40px rgba(0,0,0,0.55)) drop-shadow(0 0 60px ${c.accent}22)`,
        ...style,
      }}
    />
  );
}

// A real screen recording the creator (or, later, the agent) puts in (`src`,
// from a field.recording); it plays from the frame `at`. Until then: a dashed
// place saying exactly what to record.
export function RecordingSlot({
  src,
  record,
  at = 0,
  width,
  height,
  style,
}: Box & { src?: string; record: string; at?: number }) {
  if (!src)
    return (
      <Placeholder
        label="● REC"
        text={record}
        width={width}
        height={height}
        style={style}
      />
    );
  return (
    <div
      style={{ width, height, overflow: "hidden", borderRadius: 24, ...style }}
    >
      <Sequence from={Math.round(at)} layout="none">
        <ScreenRecording src={src} fit="cover" />
      </Sequence>
    </div>
  );
}

// A file the agent fetched (scripts/asset.ts prints "/assets/agent/…") or
// any file under public/, as a URL for <Img> / <OffthreadVideo>.
export const asset = (publicPath: string) => assetUrl(publicPath);

// A tool's logo from the library (ids in src/registries/assets.generated.ts).
// An id with no picture shows its first two letters.
export function Logo({ id, size }: { id: string; size: number }) {
  const c = useBrand();
  const src = getLogo(id)?.src ?? getProp(id)?.src;
  if (src)
    return (
      <Img src={src} style={{ width: size, height: size, objectFit: "contain" }} />
    );
  return (
    <div style={{ fontFamily: c.fontStrong, fontSize: size * 0.6, color: c.text, lineHeight: 1 }}>
      {id.slice(0, 2).toUpperCase()}
    </div>
  );
}

function Placeholder({
  label,
  text,
  width,
  height,
  style,
}: Box & { label: string; text: string }) {
  const c = useBrand();
  return (
    <div
      style={{
        width,
        height,
        boxSizing: "border-box",
        border: `4px dashed ${c.border}`,
        borderRadius: 26,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 40,
        textAlign: "center",
        ...style,
      }}
    >
      <div style={{ fontFamily: c.fontStrong, fontSize: 48, color: c.accent }}>
        {label}
      </div>
      <div style={{ fontFamily: c.fontRegular, fontSize: 32, color: c.textSoft }}>
        {text}
      </div>
    </div>
  );
}

// The frame (from the scene's start) the voice says `word` on – the first
// time at or after word number `from`; `fallback` when it is not said.
export function wordFrame(
  words: SceneWord[],
  word: string,
  fallback = 0,
  from = 0,
): number {
  const target = spokenWords(word)[0];
  if (!target) return fallback;
  for (let i = from; i < words.length; i++)
    if (spokenWords(words[i].text).includes(target)) return words[i].frame;
  return fallback;
}
