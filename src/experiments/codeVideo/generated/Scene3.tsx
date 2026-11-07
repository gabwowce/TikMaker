import { interpolate, useCurrentFrame } from "remotion";
import { usePack } from "../../../video/stage/pack";
import type { SceneProps } from "../types";
import { Abs, CLAMP, Corners, EASE, Eyebrow, MONO, Stage, enter, fmt, leave, pop, ramp, wordAt } from "./kit";

// Mistake 1: "one endless session" – then the whole chat history piles up
// message by message, a one-line question lands under it, and a bounding box
// bills the entire pile.
const ROWS = 10;

export function Scene3({ words, durationInFrames }: SceneProps) {
  const f = useCurrentFrame();
  const c = usePack();
  const one = wordAt(words, 1, 20);
  const endless = wordAt(words, 2, 28);
  const session = wordAt(words, 3, 37);
  const every = wordAt(words, 4, 55);
  const resends = wordAt(words, 6, 74);
  const history = wordAt(words, 9, 95);
  const oneLine = wordAt(words, 12, 124);
  const pays = wordAt(words, 14, 148);

  const headOut = every - 6;
  const rowAt = (i: number) => interpolate(i, [0, ROWS - 1], [resends - 6, history + 8]);
  const top = 380;
  const rowH = 46;
  const gap = 10;
  const stackH = ROWS * (rowH + gap) - gap;
  const qTop = top + stackH + 40;
  const box = ramp(f, pays - 4, 12);
  const billed = interpolate(f, [pays - 2, pays + 22], [0, 84_210], { ...CLAMP, easing: EASE });

  return (
    <Stage duration={durationInFrames}>
      <Eyebrow tag="Mistake" index="01 / 03" />
      {/* phase A: the headline, word by word */}
      {f < headOut + 8 ? (
        <Abs style={{ left: 90, right: 90, top: 470, textAlign: "center", ...(f >= headOut ? leave(f, headOut) : {}) }}>
          <div style={{ fontFamily: c.fontStrong, fontSize: 112, lineHeight: 1.05, color: c.text }}>
            <span style={{ display: "inline-block", marginRight: 30, ...enter(f, one - 3) }}>One</span>
            <span style={{ display: "inline-block", color: c.accent, ...enter(f, endless - 3) }}>endless</span>
            <br />
            <span style={{ display: "inline-block", ...enter(f, session - 3) }}>session</span>
          </div>
          {/* a session line that keeps growing */}
          <div style={{ margin: "50px auto 0", width: 700, height: 6, background: "rgba(255,255,255,0.08)", overflow: "hidden", opacity: ramp(f, endless - 3, 8) }}>
            <div style={{ width: 2000, height: 6, transform: `translateX(${-f * 9}px)`, backgroundImage: `repeating-linear-gradient(90deg, ${c.accent} 0 40px, transparent 40px 64px)` }} />
          </div>
        </Abs>
      ) : null}
      {/* phase B: the history pile */}
      {Array.from({ length: ROWS }).map((_, i) => {
        const user = i % 2 === 0;
        const w = user ? 380 + ((i * 37) % 120) : 560 + ((i * 53) % 140);
        return (
          <Abs
            key={i}
            style={{
              top: top + i * (rowH + gap),
              left: user ? 900 - w : 180,
              width: w,
              height: rowH,
              borderRadius: user ? 26 : 12,
              background: user ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.14)",
              border: user ? "1px solid rgba(255,255,255,0.22)" : "none",
              ...enter(f, rowAt(i), { dur: 9, y: 16 }),
            }}
          />
        );
      })}
      {/* the one-line question – tiny next to the pile */}
      <Abs style={{ top: qTop, right: 180, display: "flex", alignItems: "center", gap: 20, ...enter(f, oneLine - 3, { overshoot: true }) }}>
        <div style={{ fontFamily: MONO, fontSize: 40, color: c.textSoft, opacity: 0.7 }}>1 line →</div>
        <div style={{ fontFamily: c.fontUi, fontWeight: 600, fontSize: 42, color: c.bg, background: c.text, borderRadius: 40, padding: "14px 34px" }}>
          fix this typo?
        </div>
      </Abs>
      {/* billed: bounding box around everything */}
      <Abs style={{ left: 150, top: top - 30, width: 780, height: qTop + 110 - (top - 30), opacity: box }}>
        <div style={{ position: "absolute", inset: 0, border: `2px solid ${c.accent}`, borderRadius: 18, opacity: 0.55, transform: `scale(${1.04 - 0.04 * box})` }} />
        <Corners w={780} h={qTop + 110 - (top - 30)} color={c.accent} p={box} />
      </Abs>
      <Abs style={{ right: 120, top: top - 58, transform: `scale(${pop(f, pays - 2)})`, transformOrigin: "right center" }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 44, color: c.bg, background: c.accent, borderRadius: 10, padding: "8px 22px" }}>
          {fmt(billed)} tok
        </div>
      </Abs>
    </Stage>
  );
}
