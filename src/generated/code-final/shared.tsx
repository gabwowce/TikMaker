import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { Logo, MONO, useBrand } from "../../video/brand/kit";

// Shared pieces of "3 Claude Code commands": the headline block, the terminal
// card, the three command slots (they move between a big list, a compact row
// and a side column), the file rows that break and come back clean, stickers.

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// The demo terminal of the item scenes – the same place in scenes 3–5.
export const CARD = { x: 90, y: 505, w: 900, h: 560 };
// The editor card of the hook (scene 1) – scene 2 starts from it.
export const EDITOR = { x: 90, y: 405, w: 900, h: 655 };

// 0 → 1 over `len` frames from `at`.
export function prog(frame: number, at: number, len = 12, easing = EASE_OUT) {
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing });
}

// A card entrance with a 1.02 overshoot.
export function popScale(frame: number, at: number, from = 0.94) {
  return interpolate(frame, [at, at + 9, at + 14], [from, 1.02, 1], {
    ...clamp,
    easing: EASE_OUT,
  });
}

// Text with *key* words drawn in the accent colour.
export function Marked({ text }: { text: string }) {
  const c = useBrand();
  const parts = text.split("*");
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} style={{ color: c.accent }}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

// The pill ("COMMAND 01") and the headline at the top of the zone.
export function Headline({ pill, text, at = 0 }: { pill?: string; text: string; at?: number }) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const p1 = prog(frame, at, 10);
  const p2 = prog(frame, at + 3, 12);
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top: pill ? 205 : 240,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
      {pill ? (
        <div
          style={{
            fontFamily: c.fontStrong,
            fontSize: 34,
            letterSpacing: 4,
            color: c.bg,
            background: c.accent,
            padding: "8px 22px 6px",
            borderRadius: 999,
            opacity: p1,
            translate: `0px ${(1 - p1) * 16}px`,
          }}
        >
          {pill}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: c.fontStrong,
          // shrink long headlines so they stay inside the 900 px zone
          fontSize: Math.min(100, 900 / (text.replace(/\*/g, "").length * 0.6)) * c.widthFactor,
          lineHeight: 1.02,
          color: c.text,
          textAlign: "center",
          opacity: p2,
          translate: `0px ${(1 - p2) * 24}px`,
          whiteSpace: "nowrap",
        }}
      >
        <Marked text={text} />
      </div>
    </div>
  );
}

export const cardStyle = (w: number): CSSProperties => ({
  borderRadius: w * 0.038,
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
  overflow: "hidden",
});

// A window: title bar with dots (+ Claude logo) and a right-side slot, then the body.
export function Terminal({
  title = "claude  ~/my-app",
  right,
  children,
  rect = CARD,
  logo = true,
  style,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  rect?: { x: number; y: number; w: number; h: number };
  logo?: boolean;
  style?: CSSProperties;
}) {
  const c = useBrand();
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        background: "#121217",
        display: "flex",
        flexDirection: "column",
        ...cardStyle(rect.w),
        ...style,
      }}
    >
      <div
        style={{
          height: 64,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 26px",
          gap: 12,
          background: "rgba(255,255,255,0.04)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {[0.28, 0.2, 0.14].map((o, i) => (
          <div
            key={i}
            style={{ width: 16, height: 16, borderRadius: 8, background: `rgba(255,255,255,${o})` }}
          />
        ))}
        {logo ? (
          <div style={{ marginLeft: 14, display: "flex" }}>
            <Logo id="claude" size={30} />
          </div>
        ) : null}
        <div
          style={{
            marginLeft: logo ? 4 : 14,
            fontFamily: MONO,
            fontSize: 24,
            color: c.textSoft,
            flex: 1,
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>
        {right}
      </div>
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

// The prompt line: "> typed text▌".
export function Prompt({
  text,
  typedFrom,
  cps = 1.4,
  cursor = true,
  size = 34,
  style,
}: {
  text: string;
  typedFrom: number;
  cps?: number;
  cursor?: boolean;
  size?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - typedFrom) * cps)));
  const blink = Math.floor(frame / 15) % 2 === 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: MONO,
        fontSize: size,
        color: c.text,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <span style={{ color: c.accent, fontWeight: 700 }}>{">"}</span>
      <span>
        {text.slice(0, n)}
        {cursor && (
          <span
            style={{
              display: "inline-block",
              width: size * 0.55,
              height: size * 1.05,
              marginLeft: 2,
              verticalAlign: "middle",
              background: c.text,
              opacity: blink ? 0.85 : 0,
            }}
          />
        )}
      </span>
    </div>
  );
}

// A tilted sticker that slams in with an overshoot.
export function Sticker({
  text,
  at,
  rotate = -8,
  size = 64,
  style,
}: {
  text: string;
  at: number;
  rotate?: number;
  size?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const s = interpolate(frame, [at, at + 10], [2.2, 1], { ...clamp, easing: EASE_BOUNCE });
  const o = interpolate(frame, [at, at + 4], [0, 1], clamp);
  return (
    <div
      style={{
        position: "absolute",
        fontFamily: c.fontStrong,
        fontSize: size,
        color: c.bg,
        background: c.accent,
        padding: `${size * 0.16}px ${size * 0.4}px ${size * 0.1}px`,
        borderRadius: size * 0.22,
        border: "5px solid #fff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
        rotate: `${rotate + Math.sin(frame / 9) * 1.2}deg`,
        scale: `${s}`,
        opacity: o,
        ...style,
      }}
    >
      {text}
    </div>
  );
}

// ---------- the files that break and come back ----------

export const FILES: { name: string; good: string; bad: string }[] = [
  { name: "src/auth/session.ts", good: "return refresh(token);", bad: "return null; // TODO" },
  { name: "src/ui/Navbar.tsx", good: "<Nav sticky={true} />", bad: "<Nav sticky={undefind} />" },
  { name: "tests/auth.test.ts", good: "expect(user).toBeDefined();", bad: "// expect(user)…" },
];

// One file: its name and one code line. `broken` 0 → 1 tints it in the accent
// and shows the bad line; going back to 0 brings the good line back.
// `status` – what the badge on the right says.
export function FileRow({
  name,
  good,
  bad,
  broken,
  height = 118,
  width,
  badge = true,
}: {
  name: string;
  good: string;
  bad: string;
  broken: number;
  height?: number;
  width: number;
  badge?: boolean;
}) {
  const c = useBrand();
  const isBad = broken > 0.5;
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        boxSizing: "border-box",
        borderRadius: 18,
        padding: "14px 22px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 8,
        background: `rgba(255,112,36,${0.04 + broken * 0.14})`,
        border: `2px solid rgba(255,112,36,${broken * 0.9})`,
        outline: broken < 0.5 ? "1px solid rgba(255,255,255,0.08)" : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <FileIcon size={30} hot={broken} />
        <div style={{ fontFamily: MONO, fontSize: 28, color: c.text, flex: 1, whiteSpace: "nowrap" }}>
          {name}
        </div>
        {badge ? (
          <div
            style={{
              fontFamily: c.fontStrong,
              fontSize: 24,
              letterSpacing: 1,
              padding: "6px 14px 3px",
              borderRadius: 999,
              color: isBad ? c.bg : c.text,
              background: isBad ? c.accent : "rgba(255,255,255,0.12)",
              whiteSpace: "nowrap",
            }}
          >
            {isBad ? "✗ BROKEN" : "✓ CLEAN"}
          </div>
        ) : null}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 26,
          whiteSpace: "nowrap",
          color: isBad ? c.accent : c.textSoft,
          textDecoration: isBad ? "line-through" : "none",
          paddingLeft: 44,
        }}
      >
        <span style={{ opacity: 0.6, marginRight: 14 }}>{isBad ? "−" : " "}</span>
        {isBad ? bad : good}
      </div>
    </div>
  );
}

export function FileIcon({ size = 30, hot = 0 }: { size?: number; hot?: number }) {
  const c = useBrand();
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 24 30">
      <path
        d="M2 2 H16 L22 8 V28 H2 Z"
        fill={hot > 0.5 ? `${c.accent}33` : "rgba(255,255,255,0.08)"}
        stroke={hot > 0.5 ? c.accent : c.textSoft}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M16 2 V8 H22" fill="none" stroke={hot > 0.5 ? c.accent : c.textSoft} strokeWidth={2} />
    </svg>
  );
}

// ---------- the three command slots ----------

export const COMMANDS = [
  { name: "/rewind", sub: "undo the last changes" },
  { name: "/compact", sub: "shrink it, keep the thread" },
  { name: "Plan mode", sub: "Shift+Tab · plan before edits" },
];

type Rect = { x: number; y: number; w: number; h: number };
export type SlotMode = "big" | "compact" | "side";

export function slotRect(i: number, mode: SlotMode): Rect {
  if (mode === "big") return { x: 90, y: 425 + i * 204, w: 900, h: 180 };
  if (mode === "side") return { x: 90, y: 420 + i * 214, w: 420, h: 190 };
  return { x: 90 + i * 306, y: 395, w: 288, h: 86 };
}

const mix = (a: Rect, b: Rect, t: number): Rect => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
});

// The list of three slots. `from` → `to` layout by `t`; `fill[i]` 0 → 1 –
// slot i gets its command; `active` – the slot of this scene (glows);
// `lit[i]` – the empty slot's number lights up (scene 2's counter).
export function SlotList({
  from,
  to,
  t,
  fill,
  names = COMMANDS.map((x) => x.name),
  active = -1,
  lit = [1, 1, 1],
  enter = [1, 1, 1],
  done = false,
}: {
  from: SlotMode;
  to: SlotMode;
  t: number;
  fill: number[];
  names?: string[];
  active?: number;
  lit?: number[];
  enter?: number[];
  done?: boolean;
}) {
  const frame = useCurrentFrame();
  const c = useBrand();
  return (
    <>
      {[0, 1, 2].map((i) => {
        const r = mix(slotRect(i, from), slotRect(i, to), t);
        const f = fill[i] ?? 0;
        const small = r.h < 120;
        const isActive = i === active;
        const e = enter[i] ?? 1;
        const glow = isActive ? 0.5 + 0.5 * Math.sin(frame / 8) : 0;
        const narrow = r.w < 600;
        const badge = small ? 50 : narrow ? 68 : 84;
        const nameSize = small ? 34 : narrow ? 44 : 64;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: r.x,
              top: r.y,
              width: r.w,
              height: r.h,
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              gap: small ? 14 : 28,
              padding: small ? "0 18px" : "0 34px",
              background: f > 0 ? `rgba(255,255,255,${0.05 + f * 0.03})` : "rgba(255,255,255,0.025)",
              borderRadius: Math.max(18, r.w * 0.038),
              border:
                f > 0.01
                  ? `2px solid ${isActive ? c.accent : "rgba(255,255,255,0.14)"}`
                  : "3px dashed rgba(255,255,255,0.16)",
              boxShadow: isActive
                ? `0 0 ${20 + glow * 24}px ${c.accent}55, 0 24px 64px rgba(0,0,0,0.5)`
                : f > 0
                  ? "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)"
                  : "none",
              opacity: e,
              translate: `0px ${(1 - e) * -60}px`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: badge,
                height: badge,
                flexShrink: 0,
                borderRadius: badge / 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: c.fontStrong,
                fontSize: badge * 0.52,
                paddingTop: badge * 0.06,
                boxSizing: "border-box",
                color: (lit[i] ?? 1) > 0.5 || f > 0 ? c.bg : c.textSoft,
                background:
                  (lit[i] ?? 1) > 0.5 || f > 0 ? c.accent : "rgba(255,255,255,0.08)",
                scale: `${1 + (lit[i] ?? 1) * 0 + (isActive ? glow * 0.04 : 0)}`,
              }}
            >
              {done && f > 0.5 ? "✓" : i + 1}
            </div>
            {f > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: names[i]?.startsWith("/") ? MONO : c.fontStrong,
                    fontWeight: 700,
                    fontSize: nameSize,
                    lineHeight: 1,
                    color: c.text,
                    whiteSpace: "nowrap",
                    opacity: f,
                    translate: `${(1 - f) * 30}px 0px`,
                  }}
                >
                  {names[i]}
                </div>
                {!small && !narrow ? (
                  <div
                    style={{
                      fontFamily: c.fontSemi,
                      fontSize: r.w < 600 ? 26 : 32,
                      color: c.textSoft,
                      whiteSpace: "nowrap",
                      opacity: f,
                    }}
                  >
                    {COMMANDS[i].sub}
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  height: small ? 16 : 26,
                  flex: 1,
                  maxWidth: small ? 150 : 420,
                  borderRadius: 13,
                  background: "rgba(255,255,255,0.07)",
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// A U-turn ("undo") arrow drawn by `p` 0 → 1.
export function UTurn({ p, size = 300, style }: { p: number; size?: number; style?: CSSProperties }) {
  const c = useBrand();
  const len = 520;
  return (
    <svg
      width={size}
      height={size * 0.8}
      viewBox="0 0 300 240"
      style={{ overflow: "visible", filter: `drop-shadow(0 10px 30px rgba(0,0,0,0.6))`, ...style }}
    >
      <path
        d="M250 210 V100 A80 80 0 0 0 90 100 V170"
        fill="none"
        stroke={c.accent}
        strokeWidth={30}
        strokeLinecap="round"
        strokeDasharray={len}
        strokeDashoffset={len * (1 - p)}
      />
      <path
        d="M40 150 L90 215 L140 150"
        fill="none"
        stroke={c.accent}
        strokeWidth={30}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={p > 0.92 ? 1 : 0}
      />
    </svg>
  );
}
