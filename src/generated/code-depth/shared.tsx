import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MONO, useBrand } from "../../video/brand/kit";

// Shared pieces of "3 Claude Code commands" in the depth style: the per-scene
// background orb, the camera, glass cards, the dock with the three command
// slots (same place in scenes 2–6), the word-pop headline and the file rows.

export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Scene colours (background orb + the active dock slot). Same darkness family.
export const HUE = {
  orange: "#FF7024",
  blue: "#2F6BFF",
  teal: "#14C8A8",
  magenta: "#E8336D",
  violet: "#8B5CF6",
};
// Status colours: broken / clean.
export const BAD = "#FF4D6A";
export const GOOD = "#22D3A6";

// 0 → 1 over `len` frames from `at`.
export function ramp(frame: number, at: number, len = 12, easing = EASE) {
  return interpolate(frame, [at, at + len], [0, 1], { ...CL, easing });
}

// A springy pop 0 → (overshoot) → 1 from `at`.
export function usePop() {
  const { fps } = useVideoConfig();
  return (frame: number, at: number) =>
    frame < at ? 0 : spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 180 } });
}

// Idle float for settled cards.
export function float(frame: number, phase = 0) {
  return {
    y: Math.sin((frame + phase) / 14) * 8,
    r: Math.sin((frame + phase) / 45) * 0.8,
  };
}

// Plane 1: near-black base, one breathing orb in the scene's colour that
// cross-fades from the previous scene's colour, micro-particles drifting up.
export function Backdrop({ hue, from }: { hue: string; from?: string }) {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 48) * 80;
  const breathe = 0.45 + Math.sin(frame / 22) * 0.1;
  const mix = from ? ramp(frame, 0, 12, Easing.inOut(Easing.quad)) : 1;
  const orb = (color: string, o: number) => (
    <AbsoluteFill
      style={{
        opacity: o * breathe,
        background: `radial-gradient(circle 900px at ${540 + drift}px 720px, ${color} 0%, ${color}aa 22%, ${color}44 50%, transparent 78%)`,
      }}
    />
  );
  return (
    <AbsoluteFill style={{ background: "#07070C" }}>
      {from ? orb(from, 1 - mix) : null}
      {orb(hue, mix)}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 900px 700px at 540px 1500px, rgba(0,0,0,0.7), transparent 70%)",
        }}
      />
      {new Array(22).fill(0).map((_, i) => {
        const x = random(`px${i}`) * 1080;
        const y0 = random(`py${i}`) * 1920;
        const y = (((y0 - frame * 0.4) % 1920) + 1920) % 1920;
        const s = 2 + random(`ps${i}`) * 3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: s,
              height: s,
              borderRadius: s,
              background: "#fff",
              opacity: 0.1 + random(`po${i}`) * 0.15,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

// The camera: a slow push-in over the scene, a +3 % punch on key frames, and
// the hand-over from the previous scene ("push" from the right, "zoom" through).
export function Camera({
  children,
  punches = [],
  enter = "none",
}: {
  children: ReactNode;
  punches?: number[];
  enter?: "push" | "zoom" | "none";
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  let s = interpolate(frame, [0, durationInFrames], [1, 1.04], CL);
  for (const p of punches)
    s += interpolate(frame, [p, p + 2, p + 10], [0, 0.03, 0], CL);
  const e = ramp(frame, 0, 12);
  const x = enter === "push" ? (1 - e) * 260 : 0;
  const zs = enter === "zoom" ? 1.4 - 0.4 * e : 1;
  const blur = enter === "zoom" ? (1 - e) * 8 : 0;
  const op = enter === "none" ? 1 : interpolate(frame, [0, 7], [0, 1], CL);
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${x}px) scale(${s * zs})`,
        transformOrigin: "540px 640px",
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        opacity: op,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}

// Glass surface.
export function glass(width: number, extra: CSSProperties = {}): CSSProperties {
  return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.06))",
    backdropFilter: "blur(18px)",
    border: "1.5px solid rgba(255,255,255,0.15)",
    borderTop: "1.5px solid rgba(255,255,255,0.32)",
    borderRadius: Math.round(width * 0.07),
    boxShadow: "0 8px 16px rgba(0,0,0,0.2), 0 32px 80px rgba(0,0,0,0.5)",
    boxSizing: "border-box",
    ...extra,
  };
}

// A card that enters from below with the tilt revealing, floats, and
// flattens toward 0° by `flat` (0..1).
export function TiltCard({
  at,
  left,
  top,
  width,
  height,
  ry = -16,
  rx = 8,
  flat = 0,
  phase = 0,
  style,
  children,
}: {
  at: number;
  left: number;
  top: number;
  width: number;
  height: number;
  ry?: number;
  rx?: number;
  flat?: number;
  phase?: number;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const frame = useCurrentFrame();
  const sc = interpolate(frame, [at, at + 10, at + 16], [0.78, 1.03, 1], { ...CL, easing: EASE });
  const ty = interpolate(frame, [at, at + 16], [420, 0], { ...CL, easing: EASE });
  const op = interpolate(frame, [at, at + 6], [0, 1], CL);
  const reveal = 1 - ramp(frame, at, 16);
  const f = float(frame, phase);
  const k = 1 - flat;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        perspective: 1200,
        opacity: op,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `translateY(${ty + f.y}px) scale(${sc}) rotateY(${ry * k + reveal * 10}deg) rotateX(${rx * k + reveal * 14}deg) rotateZ(${f.r}deg) translateZ(${80 * k}px)`,
          ...glass(width, { overflow: "hidden" }),
          ...style,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Text with *key* words: one word per span, popping word by word.
type Line = { text: string; at: number };

// The headline at the top of the zone. `lines` swap one after another: each
// pops word by word landing on its `at`, the previous slides up and fades.
export function Headline({ lines, top = 340, size = 88 }: { lines: Line[]; top?: number; size?: number }) {
  const frame = useCurrentFrame();
  const c = useBrand();
  return (
    <>
      {lines.map((l, li) => {
        // the old line leaves over 7 frames, then the new one starts popping
        const start = l.at - 6;
        const next = lines[li + 1];
        const end = next ? next.at - 13 : Infinity;
        if (frame < start || frame > end + 7) return null;
        const out = frame > end ? ramp(frame, end, 7, Easing.in(Easing.quad)) : 0;
        const words = l.text.split(" ");
        return (
          <div
            key={li}
            style={{
              position: "absolute",
              left: 90,
              right: 90,
              top,
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: `0 ${size * 0.26}px`,
              fontFamily: c.fontStrong,
              fontSize: size,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              color: c.text,
              transform: `translateY(${-18 * out}px)`,
              opacity: 1 - out,
              textShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
          >
            {words.map((w, wi) => {
              const key = w.startsWith("*");
              const word = w.replace(/\*/g, "");
              const a = start + wi * 3;
              const sc = interpolate(frame, [a, a + 8, a + 12], [0.9, 1.04, 1], CL);
              const punch = key ? interpolate(frame, [a + 10, a + 13, a + 20], [0, 0.04, 0], CL) : 0;
              return (
                <span
                  key={wi}
                  style={{
                    display: "inline-block",
                    color: key ? c.accent : c.text,
                    transform: `translateY(${interpolate(frame, [a, a + 9], [22, 0], { ...CL, easing: EASE })}px) scale(${sc + punch})`,
                    opacity: interpolate(frame, [a, a + 6], [0, 1], CL),
                    fontFamily: word.startsWith("/") ? MONO : c.fontStrong,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// ---------- The dock: three command slots, same place in scenes 2–6 ----------

export const DOCK = { left: 90, top: 200, width: 900, height: 112 };
export const DOCK_LABELS = ["/rewind", "/compact", "Plan mode"];

export function Dock({
  hue,
  appearAt,
  filled,
  active = -1,
  fillAt = 0,
  moveFrom,
  labels = DOCK_LABELS,
  scale = 1,
  dy = 0,
  allDone = false,
}: {
  hue: string;
  appearAt?: number; // drops in from above (scene 2); omitted = already there
  filled: number; // slots filled before this scene
  active?: number; // the slot of this scene
  fillAt?: number; // the frame the active slot fills
  moveFrom?: number; // the slot the highlight springs from
  labels?: string[];
  scale?: number;
  dy?: number;
  allDone?: boolean;
}) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const pop = usePop();
  const { fps } = useVideoConfig();
  const drop = appearAt === undefined ? 1 : spring({ frame: frame - appearAt, fps, config: { damping: 13, stiffness: 140 } });
  const slotW = DOCK.width / 3;
  const hl = active >= 0 ? pop(frame, fillAt - 4) : 0;
  const from = moveFrom ?? active;
  const hlX = (from + (active - from) * Math.min(1.1, hl)) * slotW;
  const f = Math.sin(frame / 16) * 3;
  return (
    <div
      style={{
        position: "absolute",
        left: DOCK.left,
        top: DOCK.top + dy + f,
        width: DOCK.width,
        height: DOCK.height,
        transform: `translateY(${(1 - drop) * -260}px) scale(${scale})`,
        transformOrigin: "50% 0%",
        opacity: Math.min(1, drop * 1.5),
        ...glass(DOCK.width, { borderRadius: DOCK.height / 2 }),
      }}
    >
      {active >= 0 ? (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8 + hlX,
            width: slotW - 16,
            height: DOCK.height - 19,
            borderRadius: 50,
            background: `${hue}55`,
            border: `1.5px solid ${hue}`,
            boxShadow: `0 0 40px ${hue}88, inset 0 1px 0 rgba(255,255,255,0.3)`,
            opacity: moveFrom !== undefined && moveFrom !== active ? 1 : Math.min(1, hl * 1.4),
          }}
        />
      ) : null}
      {[0, 1, 2].map((i) => {
        const isFilled = i < filled || (i === active && frame >= fillAt - 2) || allDone;
        const lp = i === active ? pop(frame, fillAt - 2) : 1;
        const lit = i === active;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: i * slotW,
              top: 0,
              width: slotW,
              height: DOCK.height,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: c.fontStrong,
                fontSize: 30,
                color: lit ? "#fff" : isFilled ? "#0B0B10" : "rgba(255,255,255,0.55)",
                background: lit ? hue : isFilled ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.08)",
                border: isFilled || lit ? "none" : "2px dashed rgba(255,255,255,0.3)",
              }}
            >
              {i + 1}
            </div>
            {isFilled ? (
              <div
                style={{
                  fontFamily: labels[i].startsWith("/") ? MONO : c.fontSemi,
                  fontWeight: 700,
                  fontSize: labels[i].startsWith("/") ? 32 : 34,
                  color: lit ? "#fff" : "rgba(255,255,255,0.75)",
                  whiteSpace: "nowrap",
                  transform: `scale(${0.5 + 0.5 * lp})`,
                  opacity: Math.min(1, lp * 1.6),
                }}
              >
                {labels[i]}
              </div>
            ) : (
              <div
                style={{
                  width: 150,
                  height: 18,
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.12)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Pieces of the code cards ----------

export function WindowBar({ title, width }: { title?: string; width: number }) {
  return (
    <div
      style={{
        height: 76,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 34px",
        borderBottom: "1.5px solid rgba(255,255,255,0.1)",
        width,
        boxSizing: "border-box",
      }}
    >
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 18, height: 18, borderRadius: 9, background: "rgba(255,255,255,0.28)" }} />
      ))}
      {title ? (
        <div style={{ marginLeft: 18, fontFamily: MONO, fontSize: 30, color: "rgba(255,255,255,0.6)" }}>{title}</div>
      ) : (
        <div style={{ marginLeft: 18, width: 220, height: 14, borderRadius: 7, background: "rgba(255,255,255,0.18)" }} />
      )}
    </div>
  );
}

export function FileIcon({ size = 64, color = "rgba(255,255,255,0.8)" }: { size?: number; color?: string }) {
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 40 50">
      <path d="M4 2 H27 L38 13 V48 H4 Z" fill="rgba(255,255,255,0.1)" stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <path d="M27 2 V13 H38" fill="none" stroke={color} strokeWidth={3} strokeLinejoin="round" />
      <path d="M11 24 H31 M11 31 H27 M11 38 H30" stroke={color} strokeWidth={2.6} strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}

export function Cross({ size, color = "#fff" }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <path d="M5 5 L15 15 M15 5 L5 15" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
    </svg>
  );
}
export function Check({ size, color = "#fff", draw = 1 }: { size: number; color?: string; draw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20">
      <path
        d="M4 10.5 L8.5 15 L16 6"
        fill="none"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={24}
        strokeDashoffset={24 * (1 - draw)}
      />
    </svg>
  );
}

// One file row: red when broken (`bad`), a diff bar of the edit (`diff`),
// green with a check once clean (`good`); `spin` turns a rewind icon.
export function FileRow({
  name,
  bad,
  good,
  diff,
  shake = 0,
  spin,
  height = 108,
}: {
  name: string;
  bad: number;
  good: number;
  diff: number;
  shake?: number;
  spin?: number;
  height?: number;
}) {
  const frame = useCurrentFrame();
  const b = bad * (1 - good);
  const sx = shake * Math.sin(frame * 2.3) * 8;
  const iconColor = good > 0.5 ? GOOD : b > 0.5 ? BAD : "rgba(255,255,255,0.8)";
  const gp = Math.min(1, good * 1.3);
  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "0 30px",
        borderRadius: 26,
        transform: `translateX(${sx}px)`,
        background: `rgba(${b > 0 ? "255,77,106" : "34,211,166"},${0.16 * Math.max(b, good)})`,
        border: `2px solid rgba(${good > 0.5 ? "34,211,166" : "255,77,106"},${0.7 * Math.max(b, good)})`,
        boxSizing: "border-box",
      }}
    >
      <FileIcon size={64} color={iconColor} />
      <div style={{ fontFamily: MONO, fontSize: 46, fontWeight: 700, color: "#fff", width: 230 }}>{name}</div>
      <div style={{ flex: 1, display: "flex", gap: 8, alignItems: "center" }}>
        {[0.9, 0.55, 0.75].map((w, i) => (
          <div
            key={i}
            style={{
              height: 16,
              width: 70 * w * diff,
              borderRadius: 8,
              background: BAD,
              opacity: 0.85 * diff,
            }}
          />
        ))}
      </div>
      {spin !== undefined ? (
        <div style={{ transform: `rotate(${-spin}deg)`, opacity: Math.min(1, spin / 40) * (1 - good) }}>
          <RewindIcon size={54} color="#fff" />
        </div>
      ) : null}
      <div
        style={{
          width: 70,
          height: 70,
          borderRadius: 35,
          flexShrink: 0,
          position: "relative",
          background: good > 0.5 ? GOOD : b > 0.02 ? BAD : "rgba(255,255,255,0.1)",
          transform: `scale(${good > 0 ? interpolate(gp, [0, 0.7, 1], [0.6, 1.25, 1]) : 0.6 + 0.4 * Math.min(1, b * 1.2)})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: good > 0.5 ? `0 0 30px ${GOOD}88` : b > 0.5 ? `0 0 30px ${BAD}66` : "none",
        }}
      >
        {good > 0.5 ? <Check size={44} draw={gp} /> : b > 0.02 ? <Cross size={40} /> : null}
      </div>
    </div>
  );
}

export function RewindIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M4 12 A8 8 0 1 0 7 5.8" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <path d="M3 3.5 L7.4 6 L4.6 10" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LockIcon({ size, color = "#fff" }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M7 11 V8 A5 5 0 0 1 17 8 V11" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <rect x={4.5} y={11} width={15} height={11} rx={2.5} fill={color} />
    </svg>
  );
}

// A typed terminal line: "❯ " + `text` typed from `at` over `len` frames.
export function Prompt({ text, at, len = 12, size = 54 }: { text: string; at: number; len?: number; size?: number }) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const n = Math.round(interpolate(frame, [at, at + len], [0, text.length], CL));
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <div style={{ fontFamily: MONO, fontSize: size, fontWeight: 700, color: "#fff", whiteSpace: "pre" }}>
      <span style={{ color: c.accent }}>❯ </span>
      {text.slice(0, n)}
      <span style={{ color: c.accent, opacity: blink ? 1 : 0 }}>▌</span>
    </div>
  );
}
