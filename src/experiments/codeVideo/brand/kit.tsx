import type { CSSProperties } from "react";
import { Img, Sequence } from "remotion";
import { assetUrl } from "../../../utils/assetUrl";
import { LibraryIcon } from "../../../video/stage/StageBlocks";
import { usePack } from "../../../video/stage/pack";
import { ScreenRecording } from "../../../video/visuals/media/ScreenRecording";
import { photos, recordings } from "./media";

// The channel's brand kit for generated videos (skill: brand-kit). The shell
// already draws the backdrop and the captions; the generated code takes its
// colours and its ONE font family from useBrand(), and uses these slots for
// what the creator supplies: a real photo, a real screen recording, a logo.

// The caption band the shell draws in – keep the picture above it.
export const CAPTION_TOP = 1130;
export const CAPTION_BOTTOM = 1340;

// Colours and fonts: bg, text, textSoft, accent (the only accent), border;
// fontStrong / fontSemi / fontRegular (one family), fontUi (app text), and
// MONO for code and terminals.
export function useBrand() {
  return usePack();
}
export const MONO = '"JetBrains Mono", "Cascadia Code", Consolas, monospace';

type Box = { width: number; height: number; style?: CSSProperties };

// A real picture the creator puts in (photos[id]): "cutout" – without a
// background, with a soft shadow; "card" – a photo in a white-bordered card.
// Until then: a dashed place saying what to find.
export function PhotoSlot({
  id,
  find,
  look = "cutout",
  width,
  height,
  style,
}: Box & { id: string; find: string; look?: "cutout" | "card" }) {
  const c = useBrand();
  const src = photos[id];
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

// A real screen recording the creator (or, later, the agent) puts in
// (recordings[id]); it plays from the frame `at`. Until then: a dashed place
// saying exactly what to record.
export function RecordingSlot({
  id,
  record,
  at = 0,
  width,
  height,
  style,
}: Box & { id: string; record: string; at?: number }) {
  const src = recordings[id];
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

// A tool's logo from the library (ids in src/registries/assets.generated.ts).
export function Logo({ id, size }: { id: string; size: number }) {
  return <LibraryIcon id={id} size={size} />;
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
