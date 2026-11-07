import { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { FreeVideoProps } from "../../../experiments/codeVideo/FreeVideo";
import { EASE, headlineParts, makeTimeline, popScale, TimelineContext, useFields, useTimeline, type Timeline } from "./anim";
import { BOXES, STATES, type Box } from "./states";
import { CARD_BORDER, CARD_SHADOW, Headline, Pill, type Part } from "./ui";

// Written by Claude Code (test 4): the whole picture as one component.
//
// One main card lives through the whole video and morphs (position, size,
// corner radius, fill) from each scene's state into the next; only its
// content changes on the words. Headline + pattern label sit above it, the
// fuel gauge bookends the first and last scene.

const MORPH = 18;

type Copy = { pill?: string; solid?: boolean; lines: { parts: Part[]; until?: (t: Timeline) => number }[] };

const COPY: Copy[] = [
  { lines: [{ parts: [{ t: "Your tokens are" }, { t: "burning", key: true }] }] },
  // scenes 2 and 9 put the captions at the top (stage "bottom"), so the
  // spoken words are the headline there and the picture stays below them
  { lines: [] },
  { pill: "MISTAKE 01", lines: [{ parts: [{ t: "One" }, { t: "endless", key: true }, { t: "session" }] }] },
  { pill: "FIX 01", solid: true, lines: [{ parts: [{ t: "/clear", key: true }, { t: "between tasks" }] }] },
  { pill: "MISTAKE 02", lines: [{ parts: [{ t: "Reading the" }, { t: "whole repo", key: true }] }] },
  { pill: "FIX 02", solid: true, lines: [{ parts: [{ t: "Point at" }, { t: "the file", key: true }] }] },
  { pill: "MISTAKE 03", lines: [{ parts: [{ t: "No" }, { t: "CLAUDE.md", key: true }] }] },
  { pill: "FIX 03", solid: true, lines: [{ parts: [{ t: "CLAUDE.md", key: true }, { t: "once" }] }] },
  { lines: [] },
];

function stateAt(t: Timeline, f: number) {
  let s = 0;
  for (let i = 0; i < t.scenes.length; i++) if (f >= t.cut(i)) s = i;
  return s;
}

function boxAt(t: Timeline, f: number): Box {
  const s = stateAt(t, f);
  const to = BOXES[s];
  if (s === 0) return to;
  const from = BOXES[s - 1];
  const p = interpolate(f, [t.cut(s), t.cut(s) + MORPH], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return {
    x: from.x + (to.x - from.x) * p,
    y: from.y + (to.y - from.y) * p,
    w: from.w + (to.w - from.w) * p,
    h: from.h + (to.h - from.h) * p,
  };
}

function MainCard() {
  const f = useCurrentFrame();
  const t = useTimeline();
  const box = boxAt(t, f);
  const s = stateAt(t, f);
  const n = t.scenes.length;
  // squash on each morph so the move reads as one elastic element
  const sinceCut = f - t.cut(s);
  const squash = s > 0 && sinceCut < MORPH ? Math.sin((sinceCut / MORPH) * Math.PI) * 0.025 : 0;
  const float = Math.sin(f / 21) * 7;
  return (
    <div
      style={{
        position: "absolute",
        left: box.x,
        top: box.y + float,
        width: box.w,
        height: box.h,
        scale: `${popScale(f, 0, 13, 0.85) * (1 - squash)}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: box.w * 0.038,
          overflow: "hidden",
          background: STATES[s].bg,
          border: CARD_BORDER,
          boxShadow: CARD_SHADOW,
        }}
      >
        {STATES.map((st, i) => {
          if (i >= n) return null;
          const inAt = t.cut(i);
          const outAt = i + 1 < n ? t.cut(i + 1) : t.end(n - 1) + 30;
          if (f < inAt - 2 || f > outAt + 2) return null;
          return <StateLayer key={i} inAt={inAt} outAt={outAt} first={i === 0}><st.Inner s={i} inAt={inAt} outAt={outAt} w={box.w} h={box.h} /></StateLayer>;
        })}
      </div>
      {STATES.map((st, i) => {
        const Over = st.Over;
        if (i >= n || !Over) return null;
        const inAt = t.cut(i);
        const outAt = i + 1 < n ? t.cut(i + 1) : t.end(n - 1) + 30;
        if (f < inAt - 2 || f > outAt + 14) return null;
        return <div key={`o${i}`} style={{ position: "absolute", inset: 0 }}><Over s={i} inAt={inAt} outAt={outAt} w={box.w} h={box.h} /></div>;
      })}
    </div>
  );
}

function StateLayer({ inAt, outAt, first, children }: { inAt: number; outAt: number; first: boolean; children: React.ReactNode }) {
  const f = useCurrentFrame();
  const fadeIn = first ? 1 : interpolate(f, [inAt + 4, inAt + 13], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE });
  const fadeOut = interpolate(f, [outAt - 5, outAt], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", inset: 0, opacity: fadeIn * fadeOut, translate: `0px ${(1 - fadeIn) * 24}px` }}>{children}</div>;
}

// A scene's copy with the creator's fields (code scene params) put in.
function withFields(copy: Copy, fields: ReturnType<typeof useFields>): Copy {
  return {
    ...copy,
    ...(fields.pill !== undefined ? { pill: fields.pill || undefined } : {}),
    ...(fields.headline !== undefined
      ? { lines: fields.headline.trim() ? [{ parts: headlineParts(fields.headline) }] : [] }
      : {}),
  };
}

function Titles() {
  const t = useTimeline();
  const fields = useFields();
  const n = t.scenes.length;
  return (
    <>
      {COPY.slice(0, n).map((own, s) => {
        const copy = s === fields.s ? withFields(own, fields) : own;
        const inAt = s === 0 ? 2 : t.cut(s);
        const outAt = s + 1 < n ? t.cut(s + 1) - 6 : t.end(n - 1) + 30;
        return (
          <div key={s}>
            {copy.pill ? <Pill text={copy.pill} solid={copy.solid} inAt={inAt} outAt={outAt} /> : null}
            {copy.lines.map((line, k) => {
              const a = k === 0 ? inAt : (copy.lines[k - 1].until?.(t) ?? inAt) + 8;
              const b = line.until ? line.until(t) : outAt;
              return <Headline key={k} parts={line.parts} inAt={a} outAt={b} />;
            })}
          </div>
        );
      })}
    </>
  );
}

export function BrandVideoBody(props: FreeVideoProps) {
  const t = useMemo(() => makeTimeline(props.scenes), [props.scenes]);
  return (
    <TimelineContext.Provider value={t}>
      <Stage>
        <MainCard />
        <Titles />
      </Stage>
    </TimelineContext.Provider>
  );
}

// A slow breathing push-in on the whole picture – nothing is ever frozen.
function Stage({ children }: { children: React.ReactNode }) {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ scale: `${1.015 + Math.sin(f / 70) * 0.015}`, transformOrigin: "50% 40%" }}>
      {children}
    </AbsoluteFill>
  );
}
