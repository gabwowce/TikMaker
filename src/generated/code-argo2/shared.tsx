import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate } from "remotion";
import { useBrand } from "../../video/brand/kit";

// Shared pieces of "One sentence → one video": the agent's five-step progress
// bar (scenes 3–6), the idea card, the drawn vertical video, the cursor.

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const GREY = "#3a3d44";
export const GREY_SOFT = "#2b2e34";
export const CARD_BG = "#1c1e23";
export const LIGHT = "#e6e6e8";

// Real stills recorded from TikMaker (scripts/asset.ts tikmaker).
export const STILL = {
  formEmpty: "/assets/agent/code-argo2/form-empty.png", // 670 x 1192
  formTyped: "/assets/agent/code-argo2/form-typed.png",
  hooks: "/assets/agent/code-argo2/hooks-card.png", // 670 x 753
};

export function prog(frame: number, at: number, len = 12, easing = EASE_OUT) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing });
}
export function popScale(frame: number, at: number, from = 0.94) {
  return interpolate(frame, [at, at + 9, at + 14], [from, 1.02, 1], { ...clamp, easing: EASE_OUT });
}
export function bounceIn(frame: number, at: number, len = 10) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing: EASE_BOUNCE });
}
export const pulse = (frame: number, period = 36) => (Math.sin((frame / period) * Math.PI * 2) + 1) / 2;
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const cardStyle = (w: number): CSSProperties => ({
  background: CARD_BG,
  borderRadius: w * 0.038,
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
  overflow: "hidden",
  boxSizing: "border-box",
});

export function Bar({ w, h = 22, color = GREY, style }: { w: number | string; h?: number; color?: string; style?: CSSProperties }) {
  return <div style={{ width: w, height: h, borderRadius: h / 2, background: color, flexShrink: 0, ...style }} />;
}

// The whole picture: a slow push-in and a gentle drift.
export function Stage({ frame, duration, children }: { frame: number; duration: number; children: ReactNode }) {
  const push = interpolate(frame, [0, duration], [1, 1.025], clamp);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        scale: `${push}`,
        transformOrigin: "515px 660px",
        translate: `0px ${Math.sin(frame / 40) * 5}px`,
      }}
    >
      {children}
    </div>
  );
}

// ── Icons (flat, stroke) ──────────────────────────────────────────────
export function CheckIcon({ size, color = "#fff", stroke = 4 }: { size: number; color?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Icon({ kind, size, color }: { kind: "image" | "motion" | "mic" | "template" | "download" | "film"; size: number; color: string }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {kind === "image" && (
        <>
          <rect x="3" y="4" width="18" height="16" rx="3" {...p} />
          <circle cx="9" cy="9.5" r="2" {...p} />
          <path d="M4 18l5-5 4 4 3-3 4 4" {...p} />
        </>
      )}
      {kind === "motion" && (
        <>
          <circle cx="15" cy="12" r="5" {...p} />
          <path d="M3 8h5M2 12h6M3 16h5" {...p} />
        </>
      )}
      {kind === "mic" && (
        <>
          <rect x="9" y="3" width="6" height="11" rx="3" {...p} />
          <path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" {...p} />
        </>
      )}
      {kind === "template" && (
        <>
          <rect x="4" y="3" width="16" height="18" rx="3" {...p} />
          <path d="M8 8h8M8 12h8M8 16h5" {...p} />
        </>
      )}
      {kind === "download" && <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" {...p} />}
      {kind === "film" && (
        <>
          <rect x="3" y="5" width="18" height="14" rx="3" {...p} />
          <path d="M10 9.5v5l4.5-2.5z" {...p} fill={color} />
        </>
      )}
    </svg>
  );
}

// ── The mouse cursor, with a click ripple at `clickAt` ───────────────────
export function Cursor({ x, y, frame, clickAt, opacity = 1 }: { x: number; y: number; frame: number; clickAt: number; opacity?: number }) {
  const c = useBrand();
  const press = interpolate(frame, [clickAt - 2, clickAt, clickAt + 4], [1, 0.85, 1], clamp);
  const ring = prog(frame, clickAt, 14);
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none" }}>
      {frame >= clickAt && ring < 1 && (
        <div
          style={{
            position: "absolute",
            left: -50 * (0.3 + ring),
            top: -50 * (0.3 + ring),
            width: 100 * (0.3 + ring),
            height: 100 * (0.3 + ring),
            borderRadius: "50%",
            border: `5px solid ${c.accent}`,
            opacity: 1 - ring,
          }}
        />
      )}
      <svg width={64} height={64} viewBox="0 0 24 24" style={{ scale: `${press}`, transformOrigin: "0 0", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.6))" }}>
        <path d="M2 1.5l16.5 10-7.2 1.5 4.2 8-3.2 1.6-4.2-8-5.6 4.8z" fill="#fff" stroke="#111" strokeWidth={1.2} strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── The agent's five-step progress bar ─────────────────────────────────
// done[i]: 0..1 how far step i is ticked; active: the step that is lit now.
export const PROGRESS_Y = 330;
export function Progress({ done, active, frame }: { done: number[]; active: number; frame: number }) {
  const c = useBrand();
  const xs = [0, 1, 2, 3, 4].map((i) => 200 + i * 157.5);
  const D = 84;
  return (
    <div style={{ position: "absolute", left: 0, top: PROGRESS_Y - D / 2, width: 1080, height: D }}>
      {xs.slice(0, 4).map((x, i) => (
        <div key={`l${i}`} style={{ position: "absolute", left: x + D / 2, top: D / 2 - 3, width: 157.5 - D, height: 6, borderRadius: 3, background: GREY_SOFT, overflow: "hidden" }}>
          <div style={{ width: `${(done[i] ?? 0) * 100}%`, height: "100%", background: c.accent }} />
        </div>
      ))}
      {xs.map((x, i) => {
        const d = done[i] ?? 0;
        const lit = i === active ? 0.55 + 0.45 * pulse(frame, 30) : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - D / 2,
              top: 0,
              width: D,
              height: D,
              borderRadius: "50%",
              boxSizing: "border-box",
              background: d > 0.5 ? c.accent : "#202227",
              border: `5px solid ${d > 0.5 || i === active ? c.accent : GREY}`,
              boxShadow: lit ? `0 0 ${30 * lit}px ${c.accent}88` : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scale: `${1 + 0.18 * Math.sin(Math.PI * Math.min(1, d))}`,
            }}
          >
            {d > 0.5 ? (
              <CheckIcon size={46} />
            ) : (
              <div style={{ fontFamily: c.fontStrong, fontSize: 36, color: i === active ? c.accent : c.textSoft }}>{i + 1}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── The idea card: one text box, one line typed (as bars) ────────────────
export function IdeaCard({ w, typed, frame, hot = 1 }: { w: number; typed: number; frame: number; hot?: number }) {
  const c = useBrand();
  const inner = w - 64;
  const l1 = Math.min(1, typed * 1.6);
  const l2 = Math.max(0, typed * 1.6 - 1) / 0.6;
  const caretOn = Math.floor(frame / 8) % 2 === 0;
  return (
    <div style={{ ...cardStyle(w), width: w, padding: 32 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 28 }}>✦</div>
        <Bar w={inner * 0.45} h={18} />
      </div>
      <div style={{ borderRadius: 18, border: `3px solid ${hot > 0.5 ? c.accent : GREY}`, background: "#16181c", padding: "26px 22px", display: "flex", flexDirection: "column", gap: 18, minHeight: 74 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Bar w={(inner - 44) * 0.92 * l1} h={24} color={LIGHT} />
          {l2 <= 0 && caretOn && <div style={{ width: 4, height: 34, background: c.accent }} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, height: 34 }}>
          <Bar w={(inner - 44) * 0.55 * Math.min(1, l2)} h={24} color={LIGHT} />
          {l2 > 0 && caretOn && <div style={{ width: 4, height: 34, background: c.accent }} />}
        </div>
      </div>
    </div>
  );
}

// ── The finished vertical video, drawn flat (it plays) ──────────────────
export function PhoneVideo({ w, frame, playing = 1, hot = 1 }: { w: number; frame: number; playing?: number; hot?: number }) {
  const c = useBrand();
  const h = (w * 16) / 9;
  const t = frame * playing;
  const bob = Math.sin(t / 7) * w * 0.025;
  const beat = Math.floor(t / 18) % 3;
  const capPop = interpolate(t % 18, [0, 5], [0.8, 1], { ...clamp, easing: EASE_BOUNCE });
  const s = w / 360;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 34 * s,
        background: "#0e0f12",
        border: `${4 * s}px solid ${hot > 0.5 ? c.accent : GREY}`,
        boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)${hot > 0.5 ? `, 0 0 ${60 * s}px ${c.accent}44` : ""}`,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* the character of the video */}
      <div style={{ position: "absolute", left: w / 2 - 70 * s, top: 150 * s + bob, width: 140 * s, height: 120 * s, borderRadius: 26 * s, background: c.accent }}>
        <div style={{ position: "absolute", left: 34 * s, top: 38 * s, width: 18 * s, height: 22 * s, borderRadius: 4 * s, background: "#111" }} />
        <div style={{ position: "absolute", right: 34 * s, top: 38 * s, width: 18 * s, height: 22 * s, borderRadius: 4 * s, background: "#111" }} />
      </div>
      <div style={{ position: "absolute", left: w / 2 - 90 * s, top: 300 * s, width: 180 * s, height: 16 * s, borderRadius: 8 * s, background: "rgba(0,0,0,0.5)", filter: `blur(${4 * s}px)` }} />
      {/* kinetic caption: three words, one lit */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 380 * s, display: "flex", justifyContent: "center", gap: 12 * s }}>
        {[70, 96, 60].map((bw, i) => (
          <div
            key={i}
            style={{
              width: bw * s,
              height: 30 * s,
              borderRadius: 10 * s,
              background: i === beat ? c.accent : LIGHT,
              scale: `${i === beat ? capPop * 1.12 : 1}`,
            }}
          />
        ))}
      </div>
      {/* progress line */}
      <div style={{ position: "absolute", left: 24 * s, right: 24 * s, bottom: 28 * s, height: 6 * s, borderRadius: 3 * s, background: GREY }}>
        <div style={{ width: `${((t % 240) / 240) * 100}%`, height: "100%", borderRadius: 3 * s, background: LIGHT }} />
      </div>
    </div>
  );
}

// A right-pointing arrow drawn in by `p`.
export function Arrow({ len, p, color, vertical = false }: { len: number; p: number; color: string; vertical?: boolean }) {
  const L = len * p;
  if (p < 0.05) return null;
  return (
    <svg width={vertical ? 40 : len} height={vertical ? len : 40} style={{ overflow: "visible" }}>
      {vertical ? (
        <>
          <line x1={20} y1={0} x2={20} y2={Math.max(0, L - 4)} stroke={color} strokeWidth={8} strokeLinecap="round" />
          {p > 0.6 && <path d={`M4 ${L - 18}L20 ${L}L36 ${L - 18}`} stroke={color} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </>
      ) : (
        <>
          <line x1={0} y1={20} x2={Math.max(0, L - 4)} y2={20} stroke={color} strokeWidth={8} strokeLinecap="round" />
          {p > 0.6 && <path d={`M${L - 18} 4L${L} 20L${L - 18} 36`} stroke={color} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        </>
      )}
    </svg>
  );
}
