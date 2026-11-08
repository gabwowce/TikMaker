import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame } from "remotion";
import { asset, MONO, useBrand } from "../../video/brand/kit";

// Shared look of the "3 Claude Code commands" video (style: depth).

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);
export const FPS = 30;

export const CLAUDE_LOGO = asset("/assets/agent/code-depth/claude.svg");
export const SHOT = {
  checkpointing: asset("/assets/agent/code-depth/docs-checkpointing.png"),
  commands: asset("/assets/agent/code-depth/docs-commands.png"),
  workflows: asset("/assets/agent/code-depth/docs-workflows.png"),
  skills: asset("/assets/agent/code-depth/docs-slash.png"),
};

// Scene colours (glows): one per scene.
export const COL = {
  red: "#ff4d5e",
  orange: "#FF7024",
  purple: "#8b5cf6",
  teal: "#14b8a6",
  blue: "#3b82f6",
  amber: "#f5a524",
  green: "#22c55e",
};

export const LIGHT_TEXT = "#1b1d22";
export const LIGHT_SOFT = "#6b7280";

/** 0→1 over `len` frames from `start`, eased. */
export const prog = (frame: number, start: number, len = 14, ease = EASE) =>
  interpolate(frame, [start, start + len], [0, 1], { ...clamp, easing: ease });

/** A springy pop: 0 before `start`, overshoots to ~1.08, settles at 1. */
export const pop = (frame: number, start: number, damping = 12, stiffness = 180) =>
  spring({ frame: frame - start, fps: FPS, config: { damping, stiffness } });

/** Text typed from `start`, `fpc` frames per character. */
export const typed = (text: string, frame: number, start: number, fpc = 1.6) =>
  text.slice(0, Math.max(0, Math.min(text.length, Math.floor((frame - start) / fpc))));

// ───────────────────────── background ─────────────────────────

export function Background({
  color,
  light = false,
  x = 540,
  y = 640,
  size = 1300,
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
  const breathe = 0.42 + Math.sin(frame / 24) * 0.1;
  const dx = Math.sin(frame / 40) * 50;
  const dy = Math.cos(frame / 52) * 30;
  // Over the first frames the glow moves in from the centre of the last scene.
  const arrive = prog(frame, 0, 14);
  const gx = interpolate(arrive, [0, 1], [540, x]) + dx;
  const gy = interpolate(arrive, [0, 1], [640, y]) + dy;
  return (
    <AbsoluteFill style={{ background: light ? "#f1f3f6" : "#070a14", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: gx - size / 2,
          top: gy - size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, ${color}00 65%)`,
          opacity: light ? breathe * 0.75 : breathe,
          filter: "blur(30px)",
        }}
      />
      {children}
      {/* soft vignette */}
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

/** A giant faint motif (text or symbol) behind everything. */
export function Motif({
  children,
  light,
  x = 540,
  y = 640,
  size = 520,
  rotate = -8,
  opacity,
  font,
}: {
  children: ReactNode;
  light?: boolean;
  x?: number;
  y?: number;
  size?: number;
  rotate?: number;
  opacity?: number;
  font?: string;
}) {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        translate: `-50% -50%`,
        rotate: `${rotate + Math.sin(frame / 60) * 1.2}deg`,
        fontFamily: font ?? MONO,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: light ? "#1b1d22" : "#ffffff",
        opacity: opacity ?? (light ? 0.05 : 0.06),
        filter: "blur(6px)",
      }}
    >
      {children}
    </div>
  );
}

/** A real screenshot, blurred and tilted at the side, for depth. */
export function SideShot({
  src,
  side,
  y,
  light,
}: {
  src: string;
  side: "left" | "right";
  y: number;
  light?: boolean;
}) {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 30) * 10;
  return (
    <div
      style={{
        position: "absolute",
        top: y + drift,
        [side]: -260,
        width: 620,
        height: 390,
        borderRadius: 34,
        overflow: "hidden",
        transform: `perspective(1200px) rotateY(${side === "left" ? 28 : -28}deg) rotateZ(${side === "left" ? -4 : 4}deg)`,
        filter: "blur(9px)",
        opacity: light ? 0.35 : 0.5,
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
      }}
    >
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "30% 20%" }} />
    </div>
  );
}

// ───────────────────────── camera ─────────────────────────

/** Slow push-in over the scene, a +3 % punch on `punchAt`, and a float. */
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
  const punch =
    interpolate(frame, [punchAt, punchAt + 2, punchAt + 10], [0, 0.03, 0], clamp);
  return (
    <AbsoluteFill style={{ scale: `${push + punch}`, transformOrigin: "50% 36%" }}>
      {children}
    </AbsoluteFill>
  );
}

// ───────────────────────── headline ─────────────────────────

/**
 * One or two lines at the top of the zone; `*word*` marks the key word,
 * drawn in `color`. Words pop in one by one from `start`.
 */
export function Headline({
  line1,
  line2,
  color,
  light,
  start = 0,
  start2,
  top = 220,
  size = 86,
  mono = false,
}: {
  line1: string;
  line2?: string;
  color: string;
  light?: boolean;
  start?: number;
  start2?: number; // when line 2 starts (default: right after line 1)
  top?: number;
  size?: number;
  mono?: boolean;
}) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const main = light ? LIGHT_TEXT : "#ffffff";
  const soft = light ? LIGHT_SOFT : "rgba(255,255,255,0.55)";
  let n = 0;
  let inKey = false;
  const line =(text: string, second: boolean) => (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: `0 ${size * 0.26}px`,
        fontSize: second ? size * 0.7 : size,
        lineHeight: 1.12,
      }}
    >
      {text.split(" ").map((raw, i) => {
        // *key words* may span several words
        const opens = raw.startsWith("*");
        const closes = raw.endsWith("*") && raw.length > 1;
        if (opens) inKey = true;
        const key = inKey;
        if (closes) inKey = false;
        const word = raw.replace(/^\*/, "").replace(/\*$/, "");
        const at = second && start2 !== undefined ? start2 + i * 3 : start + n++ * 3;
        const p = prog(frame, at, 10);
        const punch = key ? interpolate(frame, [at + 8, at + 11, at + 18], [1, 1.04, 1], clamp) : 1;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              fontFamily: mono && key ? MONO : c.fontUi,
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
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top, textAlign: "center" }}>
      {line(line1, false)}
      {line2 ? <div style={{ marginTop: 10 }}>{line(line2, true)}</div> : null}
    </div>
  );
}

// ───────────────────────── glass ─────────────────────────

export const glass = (light: boolean | undefined, radius = 52): CSSProperties =>
  light
    ? {
        background: "rgba(255,255,255,0.92)",
        border: "1.5px solid rgba(255,255,255,1)",
        borderRadius: radius,
        boxShadow: "0 6px 14px rgba(20,30,60,0.06), 0 24px 60px rgba(20,30,60,0.14)",
      }
    : {
        background: "linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.05))",
        border: "1.5px solid rgba(255,255,255,0.14)",
        borderTopColor: "rgba(255,255,255,0.26)",
        borderRadius: radius,
        backdropFilter: "blur(18px)",
        boxShadow: "0 8px 16px rgba(0,0,0,0.25), 0 32px 80px rgba(0,0,0,0.5)",
      };

/** The Claude Code window: three dots, the real logo and a title pill. */
export function TerminalCard({
  width = 880,
  height,
  light,
  title = "Claude Code",
  right,
  children,
  style,
}: {
  width?: number;
  height: number;
  light?: boolean;
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const c = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        overflow: "hidden",
        ...glass(light),
        ...style,
      }}
    >
      <div
        style={{
          height: 92,
          display: "flex",
          alignItems: "center",
          padding: "0 36px",
          gap: 14,
          borderBottom: light ? "1.5px solid rgba(20,30,60,0.07)" : "1.5px solid rgba(255,255,255,0.08)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: light ? "rgba(20,30,60,0.14)" : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
        <div
          style={{
            marginLeft: 26,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: c.fontUi,
            fontWeight: 700,
            fontSize: 36,
            color: light ? LIGHT_TEXT : "#fff",
          }}
        >
          <Img src={CLAUDE_LOGO} style={{ width: 40, height: 40 }} />
          {title}
        </div>
        <div style={{ flex: 1 }} />
        {right}
      </div>
      <div style={{ position: "relative", height: height - 92 }}>{children}</div>
    </div>
  );
}

/** A prompt line: ❯ + typed text + a blinking caret. */
export function PromptLine({
  text,
  light,
  color,
  size = 46,
  caret = true,
}: {
  text: string;
  light?: boolean;
  color: string;
  size?: number;
  caret?: boolean;
}) {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: size,
        color: light ? LIGHT_TEXT : "#fff",
      }}
    >
      <span style={{ color }}>❯</span>
      <span>{text}</span>
      {caret ? (
        <span
          style={{
            width: 4,
            height: size * 1.05,
            marginLeft: -12,
            background: color,
            opacity: Math.floor(frame / 8) % 2 ? 0.2 : 1,
          }}
        />
      ) : null}
    </div>
  );
}

// ───────────────────────── file rows ─────────────────────────

/** A file: icon, name, diff bars; red when broken, green when fixed. */
export function FileRow({
  name,
  broken,
  fixed,
  light,
  width = 800,
}: {
  name: string;
  broken: number; // 0..1 how red
  fixed: number; // 0..1 how green
  light?: boolean;
  width?: number;
}) {
  const c = useBrand();
  const red = COL.red;
  const green = COL.green;
  const tone = fixed > 0.5 ? green : red;
  const amount = fixed > 0.5 ? fixed : broken;
  const badge = fixed > 0.5 ? fixed : broken;
  const base = light ? "rgba(20,30,60,0.05)" : "rgba(255,255,255,0.05)";
  return (
    <div
      style={{
        width,
        height: 116,
        borderRadius: 28,
        display: "flex",
        alignItems: "center",
        padding: "0 30px",
        gap: 24,
        boxSizing: "border-box",
        background: base,
        border: `2px solid ${light ? "rgba(20,30,60,0.06)" : "rgba(255,255,255,0.08)"}`,
        boxShadow: `inset 0 0 0 2px ${tone}${Math.round(amount * 200)
          .toString(16)
          .padStart(2, "0")}, 0 0 ${40 * amount}px ${tone}${Math.round(amount * 90)
          .toString(16)
          .padStart(2, "0")}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: tone,
          opacity: amount * (light ? 0.1 : 0.16),
        }}
      />
      <FileIcon size={58} color={amount > 0.2 ? tone : light ? "#9aa3b2" : "rgba(255,255,255,0.6)"} />
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 46,
          color: light ? LIGHT_TEXT : "#fff",
          width: 250,
          position: "relative",
        }}
      >
        {name}
      </div>
      <div style={{ flex: 1, display: "flex", gap: 12, position: "relative" }}>
        {[90, 56, 120].map((w, i) => (
          <div
            key={i}
            style={{
              width: w * (fixed > 0.5 ? 1 : 0.6 + broken * 0.4),
              height: 16,
              borderRadius: 8,
              background: amount > 0.2 ? tone : light ? "rgba(20,30,60,0.15)" : "rgba(255,255,255,0.18)",
              opacity: 0.85,
            }}
          />
        ))}
      </div>
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          background: tone,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontFamily: c.fontUi,
          fontWeight: 900,
          fontSize: 40,
          scale: `${badge}`,
          boxShadow: `0 0 30px ${tone}`,
          position: "relative",
        }}
      >
        {fixed > 0.5 ? "✓" : "✕"}
      </div>
    </div>
  );
}

// ───────────────────────── icons ─────────────────────────

export function FileIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ position: "relative", flexShrink: 0 }}>
      <path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke={color} strokeWidth={1.8} />
      <path d="M14 2v5h5M8 13h8M8 17h6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

export function RewindIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 14 4 9l5-5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}

export function CompactIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2v7m0 0-3-3m3 3 3-3M12 22v-7m0 0-3 3m3-3 3 3M4 12h16" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlanIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 6h11M9 12h11M9 18h11" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx="4.5" cy="6" r="1.6" fill={color} />
      <circle cx="4.5" cy="12" r="1.6" fill={color} />
      <circle cx="4.5" cy="18" r="1.6" fill={color} />
    </svg>
  );
}

export function LockIcon({ size, color, open = 0 }: { size: number; color: string; open?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10.5" width="16" height="11" rx="2.5" fill={color} />
      <path
        d="M8 10.5V7a4 4 0 0 1 8 0v3.5"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        transform={`translate(0 ${-open * 3})`}
      />
    </svg>
  );
}

// ───────────────────────── the command dock ─────────────────────────

export const COMMANDS = [
  { label: "/rewind", color: COL.teal, Icon: RewindIcon },
  { label: "/compact", color: COL.blue, Icon: CompactIcon },
  { label: "Plan mode", color: COL.amber, Icon: PlanIcon },
] as const;

/**
 * The video's dock: three numbered slots for the three commands, the same
 * place in every scene. `fill[i]` 0..1 – how far slot i is filled;
 * `active` – the ringed one; `show[i]` – the slot's entrance (0..1).
 */
export function Dock({
  fill,
  active = -1,
  show = [1, 1, 1],
  light,
  top = 972,
  scale = 1,
  x = 0,
}: {
  fill: number[];
  active?: number;
  show?: number[];
  light?: boolean;
  top?: number;
  scale?: number;
  x?: number;
}) {
  const frame = useCurrentFrame();
  const c = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top,
        display: "flex",
        justifyContent: "center",
        gap: 22,
        scale: `${scale}`,
        translate: `${x}px 0px`,
      }}
    >
      {COMMANDS.map((cmd, i) => {
        const f = fill[i] ?? 0;
        const s = show[i] ?? 1;
        const on = i === active;
        const pulse = on ? 0.6 + Math.sin(frame / 8) * 0.25 : 0;
        const textCol = light ? LIGHT_TEXT : "#fff";
        return (
          <div
            key={i}
            style={{
              width: 270,
              height: 104,
              borderRadius: 30,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "0 22px",
              position: "relative",
              opacity: Math.min(1, s * 1.5),
              scale: `${interpolate(s, [0, 1], [0.5, 1])}`,
              translate: `0px ${(1 - s) * 60}px`,
              ...(f > 0.05
                ? glass(light, 30)
                : {
                    border: `3px dashed ${light ? "rgba(20,30,60,0.2)" : "rgba(255,255,255,0.22)"}`,
                    background: light ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.03)",
                  }),
              ...(on
                ? {
                    border: `3px solid ${cmd.color}`,
                    boxShadow: `0 0 ${30 + pulse * 30}px ${cmd.color}aa, 0 20px 50px rgba(0,0,0,${light ? 0.12 : 0.4})`,
                  }
                : {}),
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: 16,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: f > 0.05 ? cmd.color : "transparent",
                fontFamily: c.fontUi,
                fontWeight: 800,
                fontSize: 34,
                color: f > 0.05 ? "#fff" : light ? "rgba(20,30,60,0.35)" : "rgba(255,255,255,0.4)",
                scale: `${f > 0.05 ? interpolate(f, [0, 0.7, 1], [0.5, 1.12, 1]) : 1}`,
              }}
            >
              {f > 0.05 ? <cmd.Icon size={34} color="#fff" /> : i + 1}
            </div>
            {f > 0.05 ? (
            <div
              style={{
                fontFamily: MONO,
                fontWeight: 700,
                fontSize: cmd.label.length > 8 ? 30 : 34,
                whiteSpace: "nowrap",
                color: textCol,
                opacity: f,
                translate: `${(1 - f) * 16}px 0px`,
              }}
            >
              {cmd.label}
            </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  height: 14,
                  borderRadius: 7,
                  background: light ? "rgba(20,30,60,0.1)" : "rgba(255,255,255,0.1)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A browser card: dots + URL pill on top, a real screenshot cropped inside. */
export function BrowserCard({
  src,
  url,
  width,
  height,
  light,
  crop = { x: 0.27, y: 0.13, w: 0.45 },
  style,
}: {
  src: string;
  url: string;
  width: number;
  height: number;
  light?: boolean;
  crop?: { x: number; y: number; w: number }; // fractions of the 2560x1600 shot
  style?: CSSProperties;
}) {
  const c = useBrand();
  const imgW = width / crop.w;
  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden", ...glass(light, 44), ...style }}>
      <div style={{ height: 76, display: "flex", alignItems: "center", gap: 12, padding: "0 28px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 15, height: 15, borderRadius: 8, background: "rgba(255,255,255,0.22)" }} />
        ))}
        <div
          style={{
            marginLeft: 20,
            flex: 1,
            height: 46,
            borderRadius: 23,
            background: "rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            fontFamily: c.fontUi,
            fontWeight: 600,
            fontSize: 26,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          <Img src={CLAUDE_LOGO} style={{ width: 26, height: 26 }} />
          {url}
        </div>
      </div>
      <div style={{ position: "relative", height: height - 76, overflow: "hidden" }}>
        <Img
          src={src}
          style={{
            position: "absolute",
            width: imgW,
            left: -crop.x * imgW,
            top: -crop.y * imgW * (1600 / 2560),
          }}
        />
      </div>
    </div>
  );
}
