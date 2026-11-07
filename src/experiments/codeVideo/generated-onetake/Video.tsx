import { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, random, useCurrentFrame } from "remotion";
import { ensureFontsLoaded } from "../../../video/typography/fonts";
import type { FreeScene, FreeVideoProps } from "../FreeVideo";
import {
  C,
  DISPLAY,
  MONO,
  POP,
  buildTimeline,
  fmtTokens,
  life,
  lin,
  poseAt,
  ramp,
  sceneAt,
  type Timeline,
} from "./lib";
import {
  BurnView,
  ChatView,
  ClearView,
  CounterView,
  DiffView,
  EditorView,
  LoadedView,
  SessionView,
  TreeView,
} from "./views";

// Written by Claude Code (variant "onetake"): the whole video as one component.
// ONE card on screen the whole time. It is a terminal, shrinks into a dollar
// counter, collapses into a single chat bubble that grows a history behind it,
// turns back into the terminal, unfolds into a file tree, zooms into one file,
// squashes and reopens for every new session, becomes an editor, and ends as
// the same short terminal the video opened on – so it loops. Its footer is one
// meter that keeps changing meaning on the words.

const FOOTER_H = 108;
const LABELS = ["", "", "MISTAKE 01", "FIX 01", "MISTAKE 02", "FIX 02", "MISTAKE 03", "FIX 03", ""];

type Footer = { label: string; value: string; fill: number; hot: boolean };

function footerAt(f: number, T: Timeline): Footer {
  const s = sceneAt(T, f);
  const W = T.W;
  const budget = (b: number): Footer => ({
    label: "token budget",
    value: `${Math.round(b * 100)}%`,
    fill: b,
    hot: b < 0.35,
  });
  switch (s) {
    case 0: {
      const p = ramp(f, 4, T.E[0], 0, 1, lin);
      return budget(1 - 0.88 * Math.pow(p, 1.25));
    }
    case 1:
      return budget(ramp(f, W(1, 12) - 3, T.E[1], 0.12, 0.03, lin));
    case 2: {
      const attach = W(2, 6) - 3;
      const tok = f < attach ? 14 : ramp(f, attach, W(2, 10) + 6, 14, 48210, lin);
      return { label: "sent with this question", value: `${fmtTokens(tok)} tokens`, fill: tok / 52000, hot: f >= W(2, 15) - 3 };
    }
    case 3: {
      const tok = ramp(f, T.clearAt, T.clearAt + 14, 48210, 0, lin);
      return { label: "context", value: `${fmtTokens(tok)} tokens`, fill: tok / 52000, hot: f >= W(3, 10) - 3 };
    }
    case 4: {
      const tok = ramp(f, W(4, 10) - 2, W(4, 13) + 22, 0, 312000, lin);
      return { label: "read into context", value: `${fmtTokens(tok)} tokens`, fill: tok / 330000, hot: tok > 160000 };
    }
    case 5: {
      const pick = W(5, 14) - 2;
      const tok = f < pick ? ramp(f, T.B[5], T.B[5] + 14, 312000, 0, lin) : ramp(f, pick, pick + 10, 0, 2100, lin);
      return { label: "read into context", value: `${fmtTokens(tok)} tokens`, fill: tok / 330000, hot: false };
    }
    case 6: {
      let n = 0;
      for (let i = 0; i < T.restarts.length; i++) if (T.restarts[i] <= f) n = i;
      const next = T.restarts[n + 1] ?? T.E[6];
      const tok = n * 38000 + ramp(f, T.restarts[n] + 10, next - 4, 0, 38000, lin);
      return { label: "spent re-exploring", value: `${fmtTokens(tok)} tokens`, fill: tok / 160000, hot: n >= 1 };
    }
    case 7: {
      const lines = Math.round(ramp(f, T.B[7] + 2, W(7, 5), 0, 6, lin));
      return { label: "CLAUDE.md", value: `${lines} / 200 lines`, fill: lines / 200, hot: f >= W(7, 12) - 3 };
    }
    default:
      return budget(ramp(f, T.B[8] + 6, T.B[8] + 64, 0.03, 1));
  }
}

function FooterMeter({ f, T, vis }: { f: number; T: Timeline; vis: number }) {
  const ft = footerAt(f, T);
  let d = 99;
  for (const b of T.B.slice(1)) d = Math.min(d, Math.abs(f - b));
  const swap = 0.15 + 0.85 * ramp(d, 0, 7, 0, 1, lin);
  const col = ft.hot ? C.accent : C.text;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: FOOTER_H,
        opacity: vis,
        borderTop: `1px solid ${C.border}`,
        padding: "16px 36px 0",
        background: "rgba(0,0,0,0.18)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", opacity: swap }}>
        <span style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: C.dim }}>{ft.label}</span>
        <span style={{ fontFamily: DISPLAY, fontSize: 40, color: col, fontVariantNumeric: "tabular-nums" }}>{ft.value}</span>
      </div>
      <div style={{ marginTop: 10, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(1, ft.fill)) * 100}%`,
            height: "100%",
            borderRadius: 5,
            background: col,
            boxShadow: ft.hot ? `0 0 18px ${C.accent}` : "none",
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- captions

type Chunk = { words: { text: string; frame: number }[]; start: number; end: number };

function buildChunks(scenes: FreeScene[], end: number): Chunk[] {
  const raw: { words: { text: string; frame: number }[]; lastEnd: number }[] = [];
  for (const sc of scenes) {
    let cur: { text: string; frame: number }[] = [];
    let chars = 0;
    let lastEnd = 0;
    const flush = () => {
      if (cur.length) raw.push({ words: cur, lastEnd });
      cur = [];
      chars = 0;
    };
    for (const w of sc.words) {
      cur.push({ text: w.text, frame: w.frame });
      chars += w.text.length + 1;
      lastEnd = w.endFrame;
      if (cur.length >= 3 || chars > 15 || /[.,:!?]['"]?$/.test(w.text)) flush();
    }
    flush();
  }
  return raw.map((c, i) => {
    const start = c.words[0].frame - 3;
    const next = raw[i + 1] ? raw[i + 1].words[0].frame - 3 : end - 3;
    return { words: c.words, start, end: Math.min(next, c.lastEnd + 16) };
  });
}

function Captions({ f, chunks }: { f: number; chunks: Chunk[] }) {
  const c = chunks.find((k) => f >= k.start && f < k.end);
  if (!c) return null;
  const a = ramp(f, c.start, c.start + 9, 0, 1, POP);
  const out = 1 - ramp(f, c.end - 4, c.end);
  let current = -1;
  c.words.forEach((w, i) => {
    if (f >= w.frame - 1) current = i;
  });
  return (
    <div
      style={{
        position: "absolute",
        left: 90,
        right: 90,
        top: 1290,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: 22,
        opacity: Math.min(ramp(f, c.start, c.start + 5), out),
        transform: `translateY(${(1 - a) * 26}px) scale(${0.9 + 0.1 * a})`,
        fontFamily: DISPLAY,
        fontSize: 86,
        lineHeight: "100px",
      }}
    >
      {c.words.map((w, i) => {
        const on = i <= current;
        const isCur = i === current;
        const k = isCur ? ramp(f, w.frame - 1, w.frame + 6, 1.14, 1, POP) : 1;
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              color: isCur ? C.accent : C.text,
              opacity: on ? 1 : 0.28,
              transform: `scale(${k})`,
              textShadow: "0 6px 30px rgba(0,0,0,0.6)",
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- scene 2's leak

function Leak({ f, T, bottom }: { f: number; T: Timeline; bottom: number }) {
  const at = T.W(1, 12) - 3;
  if (f < at - 2 || f > T.E[1] + 4) return null;
  const crack = ramp(f, at - 2, at + 4);
  const gone = 1 - ramp(f, T.E[1] - 8, T.E[1]);
  const drops = [];
  for (let k = 0; k < 9; k++) {
    const t = f - (at + 2 + k * 3);
    if (t < 0) continue;
    const x = 540 + (random(`drop-x-${k}`) - 0.5) * 120;
    const y = bottom + 6 + 0.55 * t * t;
    const sz = 14 + random(`drop-s-${k}`) * 10;
    const o = Math.max(0, 1 - (y - bottom) / 260);
    drops.push(
      <div
        key={k}
        style={{
          position: "absolute",
          left: x - sz / 2,
          top: y,
          width: sz,
          height: sz * 1.35,
          borderRadius: `${sz / 2}px ${sz / 2}px ${sz / 2}px ${sz / 2}px / ${sz * 0.8}px ${sz * 0.8}px ${sz / 2}px ${sz / 2}px`,
          background: C.accent,
          opacity: o * gone,
          boxShadow: `0 0 16px ${C.accent}`,
        }}
      />,
    );
  }
  return (
    <>
      <svg style={{ position: "absolute", left: 440, top: bottom - 30, opacity: crack * gone }} width={200} height={40}>
        <polyline
          points="20,30 60,22 80,34 100,10 120,32 140,20 180,30"
          fill="none"
          stroke={C.accent}
          strokeWidth={4}
          strokeLinejoin="round"
          strokeDasharray={260}
          strokeDashoffset={260 * (1 - crack)}
        />
      </svg>
      {drops}
    </>
  );
}

// ---------------------------------------------------------------- the shot

export function OnetakeVideo({ scenes, durationInFrames }: FreeVideoProps) {
  const f = useCurrentFrame();
  const [handle] = useState(() => delayRender("onetake fonts"));
  useEffect(() => {
    ensureFontsLoaded();
    const done = () => continueRender(handle);
    if (typeof document === "undefined" || !document.fonts) return done();
    document.fonts.load(`600 86px "ClashDisplay-Semibold"`).then(done, done);
  }, [handle]);

  const T = useMemo(() => buildTimeline(scenes, durationInFrames), [scenes, durationInFrames]);
  const chunks = useMemo(() => buildChunks(scenes, durationInFrames), [scenes, durationInFrames]);
  if (scenes.length < 9) return <AbsoluteFill style={{ background: C.bg }} />;

  const { B } = T;
  const s = sceneAt(T, f);
  const p = poseAt(T.keys, f);
  const top = p.cy - p.h / 2;
  const footVis = Math.max(0, Math.min(1, (p.h - 440) / 160));
  const hot = footerAt(f, T).hot ? 1 : 0;

  // camera: slow push-in per idea, a pull-out on every change, a zoom-through
  // into auth.ts, organic drift; the last second eases back to frame 0's framing
  const prog = ramp(f, B[s], T.E[s], 0, 1, lin);
  let scale = 1 + 0.03 * prog * (s === 8 ? 1 - ramp(f, T.end - 34, T.end - 1) : 1);
  for (const b of B.slice(1)) scale -= 0.035 * Math.sin(Math.PI * ramp(f, b - 8, b + 14, 0, 1, lin));
  scale += 0.12 * Math.sin(Math.PI * ramp(f, T.diffAt - 8, T.diffAt + 12, 0, 1, lin));
  const settle = 1 - ramp(f, T.end - 30, T.end - 1);
  const dx = (Math.sin(f / 41) * 1.6 + Math.sin(f / 17) * 0.5) * settle;
  const dy = Math.cos(f / 53) * 1.6 * settle;
  const rot = Math.sin(f / 90) * 0.12 * settle;

  const v = { f, T };
  const tall = ramp(f, T.W(2, 6) - 3, T.W(2, 6) + 20);
  const label = LABELS[s];

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 820px 1100px at 50% 36%, rgba(255,122,69,${0.05 + 0.05 * hot}), transparent 72%)`,
        }}
      />
      <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${scale})` }}>
        {label ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: top - 66,
              textAlign: "center",
              fontFamily: MONO,
              fontSize: 28,
              letterSpacing: 8,
              color: C.dim,
              opacity: life(f, B[s], T.E[s], 10, 6),
            }}
          >
            {label.split(" ")[0]} <span style={{ color: C.accent }}>{label.split(" ")[1]}</span>
          </div>
        ) : null}

        <div
          style={{
            position: "absolute",
            left: p.cx - p.w / 2,
            top,
            width: p.w,
            height: p.h,
            borderRadius: p.r,
            overflow: "hidden",
            background: `linear-gradient(180deg, ${C.cardTop}, ${C.card})`,
            border: `1.5px solid ${C.border}`,
            boxShadow: `0 50px 140px rgba(0,0,0,0.6), 0 0 ${90 * hot}px rgba(255,122,69,${0.12 * hot})`,
          }}
        >
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: FOOTER_H * footVis }}>
            {f < B[1] ? <BurnView f={f} t={f} o={1 - ramp(f, B[1] - 6, B[1])} /> : null}
            {f >= B[1] - 4 && f < B[2] ? <CounterView {...v} o={life(f, B[1] + 2, B[2], 10, 5)} /> : null}
            {f >= B[2] - 4 && f < B[3] ? <ChatView {...v} o={life(f, B[2] + 2, B[3], 8, 5)} tall={tall} /> : null}
            {f >= B[3] && f < B[4] ? <ClearView {...v} o={life(f, B[3] + 4, B[4], 10, 5)} /> : null}
            {f >= B[4] && f < T.diffAt + 4 ? <TreeView {...v} o={life(f, B[4] + 4, T.diffAt + 3, 10, 6)} /> : null}
            {f >= T.diffAt && f < B[6] ? <DiffView {...v} o={life(f, T.diffAt + 3, B[6], 9, 5)} /> : null}
            {f >= B[6] && f < B[7] ? <SessionView {...v} o={1 - ramp(f, B[7] - 5, B[7])} /> : null}
            {f >= B[7] && f < T.loadAt + 2 ? <EditorView {...v} o={life(f, B[7] + 4, T.loadAt + 2, 10, 5)} /> : null}
            {f >= T.loadAt + 4 && f < B[8] ? <LoadedView {...v} o={life(f, T.loadAt + 9, B[8], 8, 5)} /> : null}
            {f >= B[8] ? <BurnView f={f} t={0} o={ramp(f, B[8] + 4, B[8] + 14)} /> : null}
          </div>
          <FooterMeter f={f} T={T} vis={footVis} />
          {p.h < 200 && f > B[5] ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 32,
                color: C.text,
                whiteSpace: "nowrap",
                opacity: Math.max(0, Math.min(1, (200 - p.h) / 60)),
              }}
            >
              <span style={{ color: C.accent, marginRight: 14 }}>+</span>new session
            </div>
          ) : null}
        </div>

        <Leak f={f} T={T} bottom={p.cy + p.h / 2} />
        <Captions f={f} chunks={chunks} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
