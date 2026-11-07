import {
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getLogo } from "../../registries/logoRegistry";
import { getProp } from "../../registries/propRegistry";
import { assetUrl } from "../../utils/assetUrl";
import { ScreenRecording } from "../visuals/media/ScreenRecording";
import { usePack } from "./pack";
import { BOLD_GLYPH_WIDTH, fitFontSize } from "./fitText";
import { pop, ramp, settle } from "./pop";
import { shadows, stage } from "./tokens";

// The rest of the top-zone blocks (docs/motion-planas.md, the blocks table).
// The first four are in StageVisuals.tsx (CoinChain, DeckCard + CodeBody,
// NumberBadge, BigList). Every block: ~85 % wide, colours and font from the
// style pack, `at` – the frame the block appears on (on a word).

const LEFT = (1080 - stage.contentWidth) / 2;

// Idle motion: slowly rises and sinks (±8 px over 2.8 s).
function floatY(frame: number, seed = 0) {
  return Math.sin((frame / 84) * Math.PI * 2 + seed) * 8;
}

// ── A library icon: a logo or a prop by id; if there is none – the name's
// letters (e.g. "Notion" → "N"), so a block is never empty.
export function LibraryIcon({ id, size }: { id: string; size: number }) {
  const c = usePack();
  const src = getLogo(id)?.src ?? getProp(id)?.src;
  if (src)
    return (
      <Img
        src={src}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  return (
    <div
      style={{
        fontFamily: c.fontStrong,
        fontSize: size * 0.6,
        color: c.text,
        lineHeight: 1,
      }}
    >
      {id.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ── A terminal in a card (inside DeckCard): the command types itself letter
// by letter, the output lines appear after it.
export function TerminalBody({ lines, at }: { lines: string[]; at: number }) {
  const c = usePack();
  const frame = useCurrentFrame();
  const [command, ...output] = lines;
  const typed = Math.floor(Math.max(0, frame - at - 6) * 1.6);
  const done = at + 6 + Math.ceil(command.length / 1.6);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          gap: 14,
          padding: "26px 34px",
          borderBottom: `2px solid ${c.border}`,
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((dot) => (
          <div
            key={dot}
            style={{ width: 20, height: 20, borderRadius: 10, background: dot }}
          />
        ))}
      </div>
      <div
        style={{
          padding: "34px 38px",
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: 42,
          lineHeight: 1.45,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ color: c.text, whiteSpace: "pre-wrap" }}>
          <span style={{ color: c.accent }}>❯ </span>
          {command.slice(0, typed)}
          {frame < done + 20 && Math.floor(frame / 8) % 2 === 0 ? (
            <span style={{ color: c.accent }}>▌</span>
          ) : null}
        </div>
        {output.map((line, i) => {
          const show = ramp(frame, done + 4 + i * 5, 5);
          return (
            <div
              key={i}
              style={{
                color: c.textSoft,
                opacity: show,
                whiteSpace: "pre-wrap",
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── A screen: the user's recording / screenshot (src) or, until there is one,
// a place for it saying what to record and about how long. In a card it is
// the card's body; on a "full" stage it fills the whole frame, darkened at the
// bottom so the spoken words stay readable over it. A recording plays from
// the frame the block appears on (`at`).
const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;

function ScreenMedia({ src, at }: { src: string; at: number }) {
  if (!VIDEO_EXT.test(src))
    return (
      <Img
        src={assetUrl(src)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  return (
    <Sequence from={Math.round(at)} layout="none">
      <ScreenRecording src={src} fit="cover" />
    </Sequence>
  );
}

function ScreenSlot({ label, seconds }: { label: string; seconds?: number }) {
  const c = usePack();
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        border: `4px dashed ${c.border}`,
        borderRadius: 26,
        margin: 18,
        boxSizing: "border-box",
      }}
    >
      <div style={{ fontFamily: c.fontStrong, fontSize: 56, color: c.accent }}>
        ● REC{seconds ? ` · ~${Math.round(seconds)} s` : ""}
      </div>
      <div
        style={{
          fontFamily: c.fontRegular,
          fontSize: 38,
          color: c.textSoft,
          textAlign: "center",
          padding: "0 60px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function ScreenBody({
  src,
  label,
  seconds,
  at = 0,
}: {
  src?: string;
  label: string;
  seconds?: number;
  at?: number;
}) {
  if (src) return <ScreenMedia src={src} at={at} />;
  return <ScreenSlot label={label} seconds={seconds} />;
}

export function FullScreen({
  src,
  label,
  seconds,
  at,
}: {
  src?: string;
  label: string;
  seconds?: number;
  at: number;
}) {
  const c = usePack();
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {src ? (
        <ScreenMedia src={src} at={at} />
      ) : (
        <div style={{ position: "absolute", inset: 40, bottom: 560 }}>
          <ScreenSlot label={label} seconds={seconds} />
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 720,
          background: `linear-gradient(to bottom, transparent, ${c.bg} 80%)`,
          opacity: src ? 0.9 : 0,
        }}
      />
    </div>
  );
}

// ── A big number that counts up (e.g. "$0.016", "214k", "90 %").
export function BigNumber({
  to,
  decimals = 0,
  prefix = "",
  suffix = "",
  label,
  at,
}: {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  at: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = pop(frame, at, fps);
  // Counts for 20 frames, slowing at the end; on arrival – a small "pop"
  const t = ramp(frame, at, 20);
  const value = to * (1 - Math.pow(1 - t, 3));
  const landed = pop(frame, at + 20, fps);
  const punch = 1 + 0.06 * Math.sin(Math.min(1, landed) * Math.PI);
  // Sized for the number it lands on – the widest it gets – so "$20/mo"
  // fits the frame as well as "5".
  const fontSize = fitFontSize(
    [`${prefix}${to.toFixed(decimals)}${suffix}`],
    300 * c.widthFactor,
    stage.contentWidth,
    BOLD_GLYPH_WIDTH,
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1080,
        top: stage.visualCenterY - 230 + floatY(frame),
        textAlign: "center",
        opacity: Math.min(1, appear * 2),
        transform: `scale(${interpolate(appear, [0, 1], [0.7, 1]) * punch})`,
      }}
    >
      <div
        style={{
          fontFamily: c.fontStrong,
          fontSize,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          color: c.text,
          fontVariantNumeric: "tabular-nums",
          textShadow: `0 20px 60px ${c.accent}55`,
        }}
      >
        {prefix}
        {value.toFixed(decimals)}
        <span style={{ color: c.accent }}>{suffix}</span>
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: c.fontSemi,
          fontSize: 64 * c.widthFactor,
          color: c.textSoft,
        }}
      >
        {label}
      </div>
    </div>
  );
}

// ── A comparison: "before" on top (dim, struck through), "after" below
// (accent colour), a "vs" coin between them (as in frame 04).
export function Compare({
  before,
  after,
  at,
}: {
  before: { label: string; value: string };
  after: { label: string; value: string };
  at: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = settle(frame, at, fps);
  const strike = ramp(frame, at + 10, 8);
  const vs = pop(frame, at + 14, fps);
  const b = settle(frame, at + 18, fps);
  const card = (
    side: { label: string; value: string },
    p: number,
    hot: boolean,
    top: number,
  ) => (
    <div
      style={{
        position: "absolute",
        left: LEFT,
        top: top + floatY(frame, hot ? 1 : 0),
        width: stage.contentWidth,
        height: 300,
        borderRadius: 34,
        background: hot ? c.accent : c.surface,
        border: `2px solid ${hot ? "transparent" : c.border}`,
        boxShadow: shadows.card,
        padding: "0 56px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        opacity: Math.min(1, p * 1.6),
        transform: `translateY(${interpolate(p, [0, 1], [140, 0])}px) scale(${interpolate(p, [0, 1], [0.92, 1])})`,
      }}
    >
      <div
        style={{
          fontFamily: c.fontSemi,
          fontSize: 44,
          color: hot ? c.bg : c.textSoft,
          opacity: 0.85,
        }}
      >
        {side.label}
      </div>
      <div
        style={{
          position: "relative",
          alignSelf: "flex-start",
          fontFamily: c.fontStrong,
          fontSize: 132 * c.widthFactor,
          letterSpacing: "-0.03em",
          color: hot ? c.bg : c.text,
        }}
      >
        {side.value}
        {!hot ? (
          <div
            style={{
              position: "absolute",
              left: -6,
              top: "52%",
              height: 10,
              width: `${strike * 104}%`,
              background: c.accent,
              borderRadius: 5,
            }}
          />
        ) : null}
      </div>
    </div>
  );
  return (
    <>
      {card(before, a, false, stage.visualTop + 40)}
      {card(after, b, true, stage.visualTop + 440)}
      <div
        style={{
          position: "absolute",
          left: 540 - 60,
          top: stage.visualTop + 340 + 40,
          width: 120,
          height: 120,
          borderRadius: 60,
          background: c.text,
          color: c.bg,
          fontFamily: c.fontStrong,
          fontSize: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: shadows.coin,
          transform: `scale(${vs})`,
          zIndex: 2,
        }}
      >
        vs
      </div>
    </>
  );
}

// ── One big object from the library (a padlock, a clock, a robot…): drops,
// "hits" (squashes and bounces), then floats; under it a shadow that shrinks
// as the object rises (like the mascot in frames 06–10).
export function HeroObject({
  id,
  at,
  size = 560,
}: {
  id: string;
  at: number;
  size?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fall = settle(frame, at, fps);
  const land = pop(frame, at + 9, fps);
  // Squash on landing: 0.86 → 1.08 → 1
  const squash = interpolate(land, [0, 0.5, 1], [0.86, 1.08, 1], {
    extrapolateRight: "clamp",
  });
  const y = interpolate(fall, [0, 1], [-700, 0]) + floatY(frame, 2);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: 1080,
        top: stage.visualCenterY - size / 2 - 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px) scale(${2 - squash}, ${squash})`,
          transformOrigin: "50% 100%",
          filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.55))",
        }}
      >
        <LibraryIcon id={id} size={size} />
      </div>
      <div
        style={{
          marginTop: 10,
          width: size * 0.6 * (1 - Math.max(0, -y) / 1400),
          height: 40,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          filter: "blur(14px)",
          opacity: fall,
        }}
      />
    </div>
  );
}

// ── A diagram: nodes from top to bottom with a dashed line drawing itself
// between them (as in frames 05 and 07). A node – a coin with an icon, or a label.
export function FlowSchema({
  nodes,
  ats,
}: {
  nodes: { icon?: string; label: string }[];
  ats: number[]; // kada atsiranda kiekvienas mazgas
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const step = 760 / Math.max(1, nodes.length - 1);
  const top = stage.visualTop - 20;
  return (
    <div
      style={{ position: "absolute", left: 0, top, width: 1080, height: 860 }}
    >
      {nodes.slice(1).map((_, i) => {
        // The line to node i+1 draws itself just before the node appears
        const draw = ramp(frame, ats[i + 1] - 8, 8);
        return (
          <div
            key={`l${i}`}
            style={{
              position: "absolute",
              left: 540 - 3,
              top: 50 + i * step + 60,
              width: 6,
              height: (step - 120) * draw,
              backgroundImage: `linear-gradient(${c.textSoft} 60%, transparent 60%)`,
              backgroundSize: "6px 26px",
              opacity: 0.6,
            }}
          />
        );
      })}
      {nodes.map((node, i) => {
        const p = pop(frame, ats[i], fps);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              width: 1080,
              top: i * step + floatY(frame, i),
              display: "flex",
              justifyContent: "center",
              opacity: Math.min(1, p * 2),
              transform: `scale(${interpolate(p, [0, 1], [0.5, 1])})`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                height: 120,
                padding: node.icon ? "0 44px 0 14px" : "0 48px",
                borderRadius: 60,
                background: `linear-gradient(180deg, ${c.surfaceHi}, ${c.surface})`,
                border: `2px solid ${c.border}`,
                boxShadow: shadows.coin,
              }}
            >
              {node.icon ? (
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 46,
                    background: c.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LibraryIcon id={node.icon} size={64} />
                </div>
              ) : null}
              <div
                style={{
                  fontFamily: c.fontSemi,
                  fontSize: 56 * c.widthFactor,
                  color: c.text,
                }}
              >
                {node.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── A picture the creator adds (docs/bd/kadrai/geri/picture-*): a metaphor,
// the real thing, the real person. Until there is one, a place for it saying
// what goes in – like the REC slot of a screen. "cutout": a picture without
// a background, big, with a soft shadow, gently floating; "card": a photo in
// a white-bordered card, tilted, with the deck's shadow. On a "full" stage it
// fills the frame, darkened at the bottom for the spoken words.
export function PictureBlock({
  src,
  label,
  look = "cutout",
  full,
  at,
}: {
  src?: string;
  label: string;
  look?: "cutout" | "card";
  full?: boolean;
  at: number;
}) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, at, fps);
  // Drawn in frame coordinates, inside the top zone like every block.
  const zoneHeight = stage.visualBottom - stage.visualTop;
  if (!src) {
    const slot = (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          border: `4px dashed ${c.border}`,
          borderRadius: 26,
          boxSizing: "border-box",
        }}
      >
        <div style={{ fontFamily: c.fontStrong, fontSize: 56, color: c.accent }}>
          ▣ PICTURE
        </div>
        <div
          style={{
            fontFamily: c.fontRegular,
            fontSize: 38,
            color: c.textSoft,
            textAlign: "center",
            padding: "0 60px",
          }}
        >
          {label}
        </div>
      </div>
    );
    return (
      <div
        style={
          full
            ? { position: "absolute", inset: 40, bottom: 560 }
            : {
                position: "absolute",
                left: LEFT,
                width: stage.contentWidth,
                top: stage.visualTop,
                height: zoneHeight,
              }
        }
      >
        {slot}
      </div>
    );
  }
  if (full)
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <Img
          src={assetUrl(src)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 720,
            background: `linear-gradient(to bottom, transparent, ${c.bg} 80%)`,
            opacity: 0.9,
          }}
        />
      </div>
    );
  const scale = interpolate(p, [0, 1], [0.85, 1]);
  if (look === "card") {
    const width = 620;
    const height = Math.min(zoneHeight - 60, 760);
    return (
      <div
        style={{
          position: "absolute",
          left: (1080 - width) / 2,
          top: stage.visualTop + (zoneHeight - height) / 2 + floatY(frame),
          width,
          height,
          padding: 16,
          boxSizing: "border-box",
          background: "#fff",
          borderRadius: 22,
          boxShadow: shadows.card,
          transform: `rotate(-3deg) scale(${scale})`,
          opacity: Math.min(1, p * 2),
        }}
      >
        <Img
          src={assetUrl(src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: 10,
          }}
        />
      </div>
    );
  }
  return (
    <Img
      src={assetUrl(src)}
      style={{
        position: "absolute",
        left: LEFT,
        top: stage.visualTop + floatY(frame),
        width: stage.contentWidth,
        height: zoneHeight,
        objectFit: "contain",
        filter: "drop-shadow(0 34px 40px rgba(0,0,0,0.55))",
        transform: `scale(${scale})`,
        opacity: Math.min(1, p * 2),
      }}
    />
  );
}
