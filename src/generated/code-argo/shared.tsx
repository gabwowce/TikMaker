import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Freeze,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  useCurrentFrame,
} from "remotion";
import {
  asset,
  DARK_BG,
  LIGHT_BG,
  LIGHT_TEXT,
  LIGHT_TEXT_SOFT,
  RecordingSlot,
  SCENE_COLORS,
  useBrand,
} from "../../video/brand/kit";

// Shared look of "one sentence → a whole video" (style: depth).

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const FPS = 30;
export const COL = SCENE_COLORS;
export const GREEN = "#22c55e";

// Real TikMaker recordings (1600x1000) and a real screenshot (2000x1250 in
// display units), fetched with scripts/asset.ts from the running editor.
export const REC = {
  form: asset("/assets/agent/code-argo/form.webm"), // empty project: the idea typed in
  hooks: asset("/assets/agent/code-argo/hooks.webm"), // on Angle: template + three hooks
  approve: asset("/assets/agent/code-argo/approve.webm"), // on Script: scenes + Approve
  agent: asset("/assets/agent/code-argo/agent.webm"), // a finished run: build + self-review
  built: asset("/assets/agent/code-argo/built.webm"), // a built project, then Storyboard
};
export const EDITOR_PNG = asset("/assets/agent/code-argo/editor.png");

/** 0→1 over `len` frames from `start`, eased. */
export const prog = (frame: number, start: number, len = 14, ease = EASE) =>
  interpolate(frame, [start, start + len], [0, 1], { ...clamp, easing: ease });

/** A springy pop: 0 before `start`, overshoots a little, settles at 1. */
export const pop = (frame: number, start: number, damping = 12, stiffness = 180) =>
  frame < start ? 0 : spring({ frame: frame - start, fps: FPS, config: { damping, stiffness } });

// ───────────────────────── background ─────────────────────────

export function Background({
  color,
  light = false,
  x = 540,
  y = 640,
  size = 1400,
  children,
}: {
  color: string;
  light?: boolean;
  x?: number;
  y?: number;
  size?: number;
  children?: ReactNode;
}) {
  const frame = useCurrentFrame();
  const breathe = 0.45 + Math.sin(frame / 22) * 0.1;
  const arrive = prog(frame, 0, 14);
  const gx = interpolate(arrive, [0, 1], [540, x]) + Math.sin(frame / 38) * 60;
  const gy = interpolate(arrive, [0, 1], [640, y]) + Math.cos(frame / 50) * 36;
  return (
    <AbsoluteFill style={{ background: light ? LIGHT_BG : DARK_BG, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: gx - size / 2,
          top: gy - size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, ${color}00 64%)`,
          opacity: light ? breathe * 0.7 : breathe,
          filter: "blur(30px)",
        }}
      />
      {children}
      <AbsoluteFill
        style={{
          background: light
            ? "radial-gradient(ellipse at 50% 40%, transparent 55%, rgba(20,30,60,0.08) 100%)"
            : "radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </AbsoluteFill>
  );
}

/** A giant faint word or number behind everything – never readable. */
export function Motif({
  children,
  light,
  x = 540,
  y = 660,
  size = 520,
  rotate = -8,
}: {
  children: ReactNode;
  light?: boolean;
  x?: number;
  y?: number;
  size?: number;
  rotate?: number;
}) {
  const frame = useCurrentFrame();
  const c = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        translate: "-50% -50%",
        rotate: `${rotate + Math.sin(frame / 60) * 1.2}deg`,
        fontFamily: c.fontUi,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.04em",
        whiteSpace: "nowrap",
        color: light ? LIGHT_TEXT : "#ffffff",
        opacity: light ? 0.05 : 0.06,
        filter: "blur(10px)",
      }}
    >
      {children}
    </div>
  );
}

// ───────────────────────── camera ─────────────────────────

/** Slow push-in over the scene and a +3 % punch on `punchAt`. */
export function Camera({
  duration,
  punchAt = -100,
  children,
}: {
  duration: number;
  punchAt?: number;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [0, duration], [1, 1.04], clamp);
  const punch = interpolate(frame, [punchAt, punchAt + 2, punchAt + 10], [0, 0.03, 0], clamp);
  return (
    <AbsoluteFill style={{ scale: `${push + punch}`, transformOrigin: "50% 36%" }}>
      {children}
    </AbsoluteFill>
  );
}

// ───────────────────────── headline ─────────────────────────

/**
 * One or two lines at the top of the zone; `*word*` marks the key word, drawn
 * in `color`. Line 1 pops in from `start`, line 2 from `start2`.
 */
export function Headline({
  line1,
  line2,
  color,
  light,
  start = 0,
  start2,
  top = 214,
  size = 88,
}: {
  line1: string;
  line2?: string;
  color: string;
  light?: boolean;
  start?: number;
  start2?: number;
  top?: number;
  size?: number;
}) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const main = light ? LIGHT_TEXT : "#ffffff";
  const soft = light ? LIGHT_TEXT_SOFT : "rgba(255,255,255,0.55)";
  const line = (text: string, second: boolean, from: number) => {
    let inKey = false;
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: `0 ${size * 0.24}px`,
          fontSize: second ? size * 0.72 : size,
          lineHeight: 1.12,
        }}
      >
        {text.split(" ").map((raw, i) => {
          if (raw.startsWith("*")) inKey = true;
          const key = inKey;
          if (raw.endsWith("*")) inKey = false;
          const word = raw.replace(/\*/g, "");
          const at = from + i * 3;
          const p = prog(frame, at, 10);
          const punch = key ? interpolate(frame, [at + 8, at + 11, at + 18], [1, 1.04, 1], clamp) : 1;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                fontFamily: c.fontUi,
                fontWeight: second ? 700 : 800,
                letterSpacing: "-0.02em",
                color: key ? color : second ? soft : main,
                opacity: p,
                translate: `0px ${(1 - p) * 22}px`,
                scale: `${interpolate(p, [0, 1], [0.9, 1]) * punch}`,
                filter: `blur(${(1 - p) * 6}px)`,
              }}
            >
              {word}
            </span>
          );
        })}
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top, textAlign: "center" }}>
      {line(line1, false, start)}
      {line2 ? <div style={{ marginTop: 8 }}>{line(line2, true, start2 ?? start + 10)}</div> : null}
    </div>
  );
}

// ───────────────────────── glass ─────────────────────────

export const glass = (light: boolean | undefined, radius = 48): CSSProperties =>
  light
    ? {
        background: "rgba(255,255,255,0.94)",
        border: "1.5px solid rgba(255,255,255,1)",
        borderRadius: radius,
        boxShadow: "0 6px 14px rgba(20,30,60,0.06), 0 20px 50px rgba(20,30,60,0.14)",
      }
    : {
        background: "linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.05))",
        border: "1.5px solid rgba(255,255,255,0.14)",
        borderTopColor: "rgba(255,255,255,0.28)",
        borderRadius: radius,
        backdropFilter: "blur(18px)",
        boxShadow: "0 8px 16px rgba(0,0,0,0.25), 0 32px 80px rgba(0,0,0,0.5)",
      };

/**
 * A card entering from below with its tilt revealing, then floating. Use
 * `start` < 0 for the scene's first card, so frame 0 is already composed.
 */
export function cardMove(frame: number, start: number, tiltY = -10, seed = 0) {
  const p = prog(frame, start, 16);
  const s = interpolate(p, [0, 0.7, 1], [0.8, 1.03, 1]);
  const settle = 1 - p;
  const float = Math.sin((frame + seed * 20) / 14) * 7;
  return {
    opacity: Math.min(1, p * 2.5),
    transform: `perspective(1200px) translateY(${settle * 280 + float}px) rotateX(${settle * 8 + 1.2}deg) rotateY(${settle * tiltY + Math.sin((frame + seed * 13) / 34) * 1.5}deg) rotateZ(${Math.sin((frame + seed * 9) / 40) * 0.6}deg) scale(${s})`,
  };
}

/** A glass window: three dots and a pill naming the screen, then the body. */
export function WindowCard({
  width = 860,
  bodyHeight,
  label,
  light,
  children,
  style,
}: {
  width?: number;
  bodyHeight: number;
  label: string;
  light?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const c = useBrand();
  return (
    <div style={{ position: "absolute", width, height: bodyHeight + 70, overflow: "hidden", ...glass(light, 44), ...style }}>
      <div style={{ height: 70, display: "flex", alignItems: "center", gap: 12, padding: "0 28px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{ width: 15, height: 15, borderRadius: 8, background: light ? "rgba(20,30,60,0.16)" : "rgba(255,255,255,0.22)" }}
          />
        ))}
        <div
          style={{
            marginLeft: 18,
            flex: 1,
            height: 42,
            borderRadius: 21,
            background: light ? "rgba(20,30,60,0.06)" : "rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontFamily: c.fontUi,
            fontWeight: 600,
            fontSize: 25,
            color: light ? LIGHT_TEXT_SOFT : "rgba(255,255,255,0.75)",
          }}
        >
          <span style={{ color: c.accent }}>✦</span>
          {label}
        </div>
      </div>
      <div style={{ position: "relative", height: bodyHeight, margin: "0 10px 10px", borderRadius: 34, overflow: "hidden", background: "#111" }}>
        {children}
      </div>
    </div>
  );
}

/**
 * A window onto a real recording (1600x1000): the source rectangle starting
 * at (x, y), `w` source px wide, shown `scale` times larger. `at` – the
 * second of the recording at the scene's start; `freeze` holds that frame.
 */
export function Shot({
  src,
  at,
  rate = 1,
  freeze = false,
  x,
  y,
  scale,
  width,
  height,
}: {
  src: string;
  at: number;
  rate?: number;
  freeze?: boolean;
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
}) {
  const video = (
    <OffthreadVideo
      src={src}
      muted
      startFrom={Math.round(at * FPS)}
      playbackRate={rate}
      style={{ position: "absolute", left: -x * scale, top: -y * scale, width: 1600 * scale, height: 1000 * scale, maxWidth: "none" }}
    />
  );
  return (
    <div style={{ position: "relative", width, height, overflow: "hidden" }}>
      {freeze ? <Freeze frame={0}>{video}</Freeze> : video}
    </div>
  );
}

/** The same window onto the editor screenshot (2000x1250 display units). */
export function EditorShot({ x, y, scale, width, height }: { x: number; y: number; scale: number; width: number; height: number }) {
  return (
    <div style={{ position: "relative", width, height, overflow: "hidden" }}>
      <Img src={EDITOR_PNG} style={{ position: "absolute", left: -x * scale, top: -y * scale, width: 2000 * scale, height: 1250 * scale, maxWidth: "none" }} />
    </div>
  );
}

/** The creator's own recording if there is one, otherwise our real crop. */
export function OwnOr({ src, record, width, height, children }: { src: string; record: string; width: number; height: number; children: ReactNode }) {
  if (src) return <RecordingSlot src={src} record={record} width={width} height={height} style={{ borderRadius: 0 }} />;
  return <>{children}</>;
}

// ───────────────────────── cursor ─────────────────────────

/** An arrow cursor gliding from `from` to `to`, clicking at `clickAt`. */
export function Cursor({
  from,
  to,
  moveAt,
  clickAt,
  color,
}: {
  from: [number, number];
  to: [number, number];
  moveAt: number;
  clickAt: number;
  color: string;
}) {
  const frame = useCurrentFrame();
  const show = prog(frame, moveAt - 4, 6);
  const m = prog(frame, moveAt, Math.max(4, clickAt - moveAt - 2));
  const x = interpolate(m, [0, 1], [from[0], to[0]]);
  const y = interpolate(m, [0, 1], [from[1], to[1]]);
  const press = interpolate(frame, [clickAt - 2, clickAt, clickAt + 4], [1, 0.82, 1], clamp);
  const ring = prog(frame, clickAt, 16, Easing.out(Easing.quad));
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: show, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: -70,
          top: -70,
          width: 140,
          height: 140,
          borderRadius: 70,
          border: `4px solid ${color}`,
          scale: `${interpolate(ring, [0, 1], [0.3, 1.3])}`,
          opacity: frame >= clickAt ? 1 - ring : 0,
        }}
      />
      <svg width={64} height={64} viewBox="0 0 24 24" style={{ scale: `${press}`, transformOrigin: "0 0", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.5))" }}>
        <path d="M4 2.5 19.5 12 12.6 13.4 9.3 20z" fill="#fff" stroke="#111" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ───────────────────────── pill ─────────────────────────

export function Pill({ children, light, color, solid, size = 38, style }: { children: ReactNode; light?: boolean; color?: string; solid?: boolean; size?: number; style?: CSSProperties }) {
  const c = useBrand();
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: `${size * 0.36}px ${size * 0.8}px`,
        borderRadius: 999,
        fontFamily: c.fontUi,
        fontWeight: 700,
        fontSize: size,
        whiteSpace: "nowrap",
        color: solid ? "#fff" : light ? LIGHT_TEXT : "#fff",
        background: solid ? color : light ? "#fff" : "rgba(255,255,255,0.09)",
        border: solid ? "none" : light ? "1.5px solid rgba(20,30,60,0.06)" : "1.5px solid rgba(255,255,255,0.16)",
        backdropFilter: "blur(18px)",
        boxShadow: solid ? `0 0 40px ${color}88, 0 14px 30px rgba(0,0,0,0.3)` : light ? "0 12px 30px rgba(20,30,60,0.12)" : "0 14px 30px rgba(0,0,0,0.35)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ───────────────────────── the agent's road (dock) ─────────────────────────

function Icon({ kind, size, color }: { kind: number; size: number; color: string }) {
  const s = { stroke: color, strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {kind === 0 ? (
        <>
          <path d="M9 18h6M10 21h4" {...s} />
          <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" {...s} />
        </>
      ) : kind === 1 ? (
        <>
          <path d="M5 6h14M5 12h9M5 18h11" {...s} />
        </>
      ) : kind === 2 ? (
        <>
          <path d="M7 3h7l4 4v14H7z" {...s} />
          <path d="M10 12h5M10 16h5" {...s} />
        </>
      ) : kind === 3 ? (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" {...s} />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" {...s} />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" {...s} />
          <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" {...s} />
        </>
      ) : (
        <>
          <rect x="3" y="4" width="18" height="16" rx="3" {...s} />
          <path d="M10 9v6l5-3z" fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

export const STEPS = ["Idea", "Angle", "Script", "Building", "Result"];

/**
 * The agent's five steps as a dock – the same place in every scene. `done[i]`
 * 0..1: how far step i is ticked; `active`: the ringed one (or -1).
 */
export function Dock({ done, active, color, light, top = 984 }: { done: number[]; active: number; color: string; light?: boolean; top?: number }) {
  const frame = useCurrentFrame();
  const c = useBrand();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, display: "flex", justifyContent: "center", gap: 14 }}>
      {STEPS.map((label, i) => {
        const d = done[i] ?? 0;
        const on = i === active;
        const pulse = on ? 0.6 + Math.sin(frame / 7) * 0.3 : 0;
        const tick = d > 0.05;
        const ink = light ? LIGHT_TEXT : "#fff";
        return (
          <div
            key={label}
            style={{
              width: 156,
              height: 88,
              boxSizing: "border-box",
              borderRadius: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              ...glass(light, 26),
              ...(on ? { border: `3px solid ${color}`, boxShadow: `0 0 ${24 + pulse * 30}px ${color}aa, 0 16px 40px rgba(0,0,0,${light ? 0.12 : 0.4})` } : {}),
              opacity: tick || on ? 1 : 0.55,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: tick ? c.accent : "transparent",
                scale: `${tick ? interpolate(d, [0, 0.7, 1], [0.5, 1.15, 1]) : 1}`,
                color: "#fff",
                fontFamily: c.fontUi,
                fontWeight: 900,
                fontSize: 24,
              }}
            >
              {tick ? "✓" : <Icon kind={i} size={30} color={on ? color : light ? LIGHT_TEXT_SOFT : "rgba(255,255,255,0.7)"} />}
            </div>
            <div style={{ fontFamily: c.fontUi, fontWeight: 700, fontSize: label.length > 6 ? 22 : 25, color: ink }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}
