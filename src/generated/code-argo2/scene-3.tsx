import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useBrand, field, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { bounceIn, Bar, cardStyle, CheckIcon, clamp, EASE_OUT, GREY, prog, Progress, Stage } from "./shared";

export const description =
  "The agent's five-step bar ticks Idea and Angle; below, three template cards – a light scans them and the middle one turns orange, grows and gets a check";

export const schema = z.object({
  picksOn: field.word("Scan starts on", "picks"),
  chosenOn: field.word("Template chosen on", "template"),
  fitsOn: field.word("Template wins on", "fits"),
});
type Params = z.infer<typeof schema>;

const W = 210;
const H = 340;
const XS = [150, 410, 670];
const TOP = 540;

function Thumb({ kind, hot }: { kind: number; hot: number }) {
  const c = useBrand();
  const a = hot > 0.5 ? c.accent : "#565a63";
  return (
    <div style={{ position: "absolute", inset: 0, padding: 26, display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
      {kind === 0 && (
        <>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: a, marginTop: 30 }} />
          <Bar w={130} h={18} />
          <Bar w={90} h={18} />
        </>
      )}
      {kind === 1 &&
        [0, 1, 2].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", marginTop: i === 0 ? 20 : 8 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: i === 0 ? a : GREY }} />
            <Bar w={92} h={18} />
          </div>
        ))}
      {kind === 2 && (
        <>
          <div style={{ display: "flex", gap: 22, marginTop: 40 }}>
            <div style={{ width: 62, height: 62, borderRadius: "50%", background: a }} />
            <div style={{ width: 62, height: 62, borderRadius: "50%", background: GREY }} />
          </div>
          <Bar w={140} h={18} style={{ marginTop: 20 }} />
          <Bar w={100} h={18} />
        </>
      )}
    </div>
  );
}

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const picksAt = wordFrame(words, params.picksOn, 28) - 4;
  const chosenAt = Math.max(wordFrame(words, params.chosenOn, 36) - 2, picksAt + 18);
  const fitsAt = wordFrame(words, params.fitsOn, 53) - 3;
  const agentAt = wordFrame(words, "agent", 18) - 3;

  const done = [prog(frame, 2, 10), prog(frame, agentAt, 10), 0, 0, 0];

  // the scanning light: left → right → middle
  const scan = interpolate(frame, [picksAt, picksAt + 6, picksAt + 12, chosenAt], [0, 0, 2, 1], { ...clamp, easing: EASE_OUT });
  const scanOn = interpolate(frame, [picksAt - 2, picksAt + 2, chosenAt, chosenAt + 4], [0, 1, 1, 0], clamp);
  const chosen = prog(frame, chosenAt, 8);
  const win = prog(frame, fitsAt, 12);
  const badge = bounceIn(frame, fitsAt + 4);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Progress done={done} active={2} frame={frame} />
        {/* the scan light behind the cards */}
        <div
          style={{
            position: "absolute",
            left: XS[0] + scan * 260 + W / 2 - 200,
            top: TOP + H / 2 - 260,
            width: 400,
            height: 520,
            background: `radial-gradient(closest-side, ${c.accent}55, transparent)`,
            opacity: scanOn,
          }}
        />
        {XS.map((x, i) => {
          const isChosen = i === 1;
          const hot = isChosen ? chosen : 0;
          const op = isChosen ? 1 : interpolate(chosen, [0, 1], [1, 0.4]) * (1 - win);
          const shift = isChosen ? 0 : (i === 0 ? -1 : 1) * win * 60;
          const s = isChosen ? 1 + 0.22 * win + 0.04 * chosen : 1;
          return (
            <div
              key={i}
              style={{
                ...cardStyle(W),
                position: "absolute",
                left: x + shift,
                top: TOP,
                width: W,
                height: H,
                opacity: op,
                scale: `${s}`,
                border: `${hot > 0.5 ? 4 : 1}px solid ${hot > 0.5 ? c.accent : "rgba(255,255,255,0.12)"}`,
                boxShadow: `0 4px 12px rgba(0,0,0,0.3), 0 24px 64px rgba(0,0,0,0.5)${hot > 0.5 ? `, 0 0 50px ${c.accent}55` : ""}`,
                overflow: "visible",
              }}
            >
              <Thumb kind={i} hot={hot} />
              {isChosen && badge > 0 && (
                <div
                  style={{
                    position: "absolute",
                    right: -26,
                    top: -26,
                    width: 68,
                    height: 68,
                    borderRadius: "50%",
                    background: c.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    scale: `${badge}`,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
                  }}
                >
                  <CheckIcon size={42} />
                </div>
              )}
            </div>
          );
        })}
      </Stage>
    </AbsoluteFill>
  );
}
