import type { CSSProperties, ReactNode } from "react";
import { Easing, interpolate, random, useCurrentFrame } from "remotion";
import { MONO, useBrand } from "../../video/brand/kit";

// Shared pieces of the "3 Claude Code mistakes" video: the headline block, the
// terminal card all three scenes are built on, stickers and burning bills.

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// The terminal card's place – the same in every scene so one flows into the next.
export const CARD = { x: 90, y: 410, w: 900, h: 560 };

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

// The pill ("MISTAKE 01") and the headline at the top of the zone.
export function Headline({ pill, text, at = 0 }: { pill: string; text: string; at?: number }) {
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
        top: 205,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 18,
      }}
    >
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
      <div
        style={{
          fontFamily: c.fontStrong,
          // shrink long headlines so they stay inside the 900 px zone
          fontSize: Math.min(92, 900 / (text.replace(/\*/g, "").length * 0.54)) * c.widthFactor,
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

// The terminal window: title bar with dots + a right-side slot, then the body.
export function Terminal({
  title = "claude  ~/my-app",
  right,
  children,
  style,
}: {
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
        left: CARD.x,
        top: CARD.y,
        width: CARD.w,
        height: CARD.h,
        background: "#121217",
        display: "flex",
        flexDirection: "column",
        ...cardStyle(CARD.w),
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
        <div
          style={{
            marginLeft: 14,
            fontFamily: MONO,
            fontSize: 24,
            color: c.textSoft,
            flex: 1,
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

// The context meter in the title bar: "ctx 148k" with a thin bar.
export function CtxMeter({ tokens, max }: { tokens: number; max: number }) {
  const c = useBrand();
  const f = Math.min(1, tokens / max);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          width: 150,
          height: 12,
          borderRadius: 6,
          background: "rgba(255,255,255,0.1)",
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${f * 100}%`, height: "100%", background: c.accent }} />
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 26,
          fontWeight: 700,
          color: f > 0.6 ? c.accent : c.text,
          minWidth: 120,
          textAlign: "right",
        }}
      >
        {formatK(tokens)}
      </div>
    </div>
  );
}

export function formatK(n: number) {
  if (n < 1000) return `${Math.round(n)}`;
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k`;
}

// The day's chat history (one long session).
export const HISTORY: { kind: "you" | "tool" | "ai"; text: string }[] = [
  { kind: "you", text: "fix the login redirect bug" },
  { kind: "tool", text: "Read(src/auth/session.ts)" },
  { kind: "ai", text: "Found it – the cookie expires early." },
  { kind: "you", text: "now add tests for it" },
  { kind: "tool", text: "Write(tests/auth.test.ts)" },
  { kind: "you", text: "make the navbar sticky" },
  { kind: "tool", text: "Edit(src/ui/Navbar.tsx)" },
  { kind: "ai", text: "Done. Navbar now sticks on scroll." },
  { kind: "you", text: "why is the build slow?" },
  { kind: "tool", text: "Bash(npm run build --profile)" },
  { kind: "ai", text: "Webpack is re-bundling all icons." },
  { kind: "you", text: "write the changelog" },
  { kind: "tool", text: "Read(CHANGELOG.md)" },
  { kind: "you", text: "refactor the pricing page" },
  { kind: "tool", text: "Edit(src/pages/pricing.tsx)" },
  { kind: "ai", text: "Split it into 3 components." },
  { kind: "you", text: "add dark mode to settings" },
  { kind: "tool", text: "Edit(src/ui/Settings.tsx)" },
  { kind: "ai", text: "Added a theme toggle." },
  { kind: "you", text: "update the README" },
];

export const LINE_H = 46;

export function HistoryLine({ kind, text }: { kind: "you" | "tool" | "ai"; text: string }) {
  const c = useBrand();
  const color = kind === "you" ? c.text : kind === "tool" ? c.textSoft : "rgba(255,255,255,0.55)";
  const mark = kind === "you" ? ">" : kind === "tool" ? "●" : " ";
  return (
    <div
      style={{
        height: LINE_H,
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontFamily: MONO,
        fontSize: 27,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 22, color: kind === "you" ? c.accent : color }}>{mark}</span>
      <span>{text}</span>
    </div>
  );
}

// The prompt line at the bottom: "> typed text▌".
export function Prompt({
  text,
  typedFrom,
  cps = 1.4,
  cursor = true,
  style,
}: {
  text: string;
  typedFrom: number;
  cps?: number;
  cursor?: boolean;
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
        fontSize: 32,
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
              width: 18,
              height: 34,
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

// One banknote burning from the bottom up: `burn` 0 → 1.
export function BurningBill({ burn, seed, width = 200 }: { burn: number; seed: number; width?: number }) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const h = width * 0.46;
  const left = 1 - burn; // part of the bill still there
  const flames = Array.from({ length: 6 }, (_, i) => i);
  return (
    <div style={{ position: "relative", width, height: h + 70 }}>
      {/* the bill, cut from the bottom */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 70,
          width,
          height: h,
          clipPath: `inset(0 0 ${burn * 100}% 0)`,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 10,
            background: "linear-gradient(135deg, #E9E9EC, #BDBDC4)",
            border: "4px solid rgba(255,255,255,0.9)",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 20px rgba(0,0,0,0.45)",
          }}
        >
          <div
            style={{
              width: h * 0.62,
              height: h * 0.62,
              borderRadius: "50%",
              border: "3px solid rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: c.fontStrong,
              fontSize: h * 0.46,
              color: "#2A2A30",
            }}
          >
            $
          </div>
        </div>
        {/* charred edge */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: `${burn * 100}%`,
            height: 16,
            background: "linear-gradient(to top, rgba(10,10,10,0.95), rgba(40,30,20,0))",
          }}
        />
      </div>
      {/* flames on the burning edge */}
      {burn < 0.98 &&
        flames.map((i) => {
          const r = random(`${seed}-${i}`);
          const fw = width * (0.2 + r * 0.1);
          const fh =
            (48 + r * 30) * (0.65 + 0.35 * Math.abs(Math.sin(frame / (2.5 + r * 2) + i * 1.7)));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: (i / (flames.length - 1)) * (width - fw) + Math.sin(frame / 5 + i) * 3,
                top: 70 + h * left - fh + 8,
                width: fw,
                height: fh,
                borderRadius: "50% 50% 40% 40% / 80% 80% 20% 20%",
                background: `linear-gradient(to top, #FFF3D6 0%, ${c.accent} 40%, rgba(255,112,36,0) 100%)`,
                filter: "blur(1px)",
                opacity: burn > 0 ? 0.95 : 0,
              }}
            />
          );
        })}
      {/* glow */}
      {burn > 0 && burn < 0.98 && (
        <div
          style={{
            position: "absolute",
            left: -20,
            right: -20,
            top: 70 + h * left - 40,
            height: 80,
            borderRadius: "50%",
            background: `radial-gradient(${c.accent}66, rgba(0,0,0,0) 70%)`,
          }}
        />
      )}
    </div>
  );
}
