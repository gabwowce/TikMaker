import { interpolate, useCurrentFrame } from "remotion";
import { usePack } from "../../../video/stage/pack";
import type { SceneProps } from "../types";
import { Abs, CLAMP, Eyebrow, MONO, Stage, Window, blink, enter, fmt, pop, typed, wordAt } from "./kit";

// Mistake 2: the vague prompt goes in and the whole repo tree lights up row
// after row while the token counter races.
const TREE: [number, string][] = [
  [0, "src/"],
  [1, "components/"],
  [1, "pages/"],
  [1, "api/"],
  [1, "utils/"],
  [0, "tests/"],
  [0, "docs/"],
  [0, "scripts/"],
];

export function Scene5({ words, durationInFrames }: SceneProps) {
  const f = useCurrentFrame();
  const c = usePack();
  const letting = wordAt(words, 1, 21);
  const improve = wordAt(words, 7, 76);
  const makes = wordAt(words, 10, 111);
  const everything = wordAt(words, 13, 133);

  const prompt = typed("improve this codebase", f, improve - 3, 1.3);
  const scanStart = makes;
  const scanEnd = everything + 18;
  const litAt = (i: number) => interpolate(i, [0, TREE.length - 1], [scanStart, scanEnd]);
  const scanY = interpolate(f, [scanStart, scanEnd], [0, TREE.length - 1], CLAMP);
  const scanning = f >= scanStart && f <= scanEnd + 6;
  const tokens = interpolate(f, [scanStart, scanEnd + 8], [0, 312_480], CLAMP);

  const rowH = 60;
  return (
    <Stage duration={durationInFrames}>
      <Eyebrow tag="Mistake" index="02 / 03" />
      {/* prompt input – a solid rounded pill */}
      <Abs
        style={{
          left: 119,
          width: 842,
          top: 326,
          height: 100,
          borderRadius: 50,
          background: c.surfaceHi,
          border: `2px solid ${prompt.length ? c.accent : "rgba(255,255,255,0.14)"}`,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          padding: "0 40px",
          fontFamily: MONO,
          fontSize: 40,
          color: c.text,
          ...enter(f, 0, { overshoot: true }),
        }}
      >
        <span style={{ color: c.accent, marginRight: 18 }}>&gt;</span>
        {prompt}
        <span style={{ width: 20, height: 46, background: c.text, marginLeft: 4, opacity: f > makes ? 0 : blink(f) }} />
      </Abs>
      {/* the repo */}
      <Abs style={{ left: 119, top: 470, ...enter(f, letting - 3, { overshoot: true }) }}>
        <Window
          width={842}
          height={600}
          title="my-app"
          right={
            <span style={{ fontFamily: MONO, fontSize: 34, color: tokens > 0 ? c.accent : c.textSoft, fontWeight: 700, whiteSpace: "nowrap" }}>
              {fmt(tokens)}
            </span>
          }
        >
          {scanning ? (
            <div style={{ position: "absolute", left: 0, right: 0, top: 22 + scanY * rowH, height: rowH, background: "rgba(255,112,36,0.12)", borderTop: `2px solid ${c.accent}` }} />
          ) : null}
          {TREE.map(([depth, name], i) => {
            const lit = pop(f, litAt(i), 8);
            const e = enter(f, letting + i * 2, { dur: 10, y: 12 });
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 40 + depth * 56,
                  right: 40,
                  top: 22 + i * rowH,
                  height: rowH,
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  fontFamily: MONO,
                  fontSize: 38,
                  color: lit > 0.5 ? c.text : c.textSoft,
                  transform: e.transform,
                  opacity: Number(e.opacity) * (0.45 + 0.55 * Math.min(1, lit)),
                }}
              >
                <div style={{ width: 34, height: 26, borderRadius: 5, background: lit > 0.5 ? c.accent : "rgba(255,255,255,0.25)" }} />
                <span style={{ flex: 1 }}>{name}</span>
                <span style={{ fontSize: 38, color: c.accent, opacity: Math.min(1, lit), transform: `scale(${lit})` }}>READ</span>
              </div>
            );
          })}
        </Window>
      </Abs>
    </Stage>
  );
}
