import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { AgentPanel, Bar, Check, Cursor, EASE_OUT, GREY, GREY_LIGHT, LIGHT, PANEL, PANEL_HEAD, Ripple, Stage, StepPill, clamp, prog, pulse } from "./shared";

export const description =
  "The agent panel writes the script as rows, one scene after another, then the cursor clicks the orange Approve button and it turns into a check";

export const schema = z.object({
  step: field.number("Step number", 3, { min: 1, max: 9 }),
  button: field.text("Button", "Approve"),
  scenes: field.number("Script rows", 5, { min: 3, max: 6 }),
  rowsFrom: field.word("Rows start on", "script"),
  approveOn: field.word("Approve is clicked on", "approve"),
});
type Params = z.infer<typeof schema>;

const ROW_W = [0.82, 0.64, 0.74, 0.56, 0.7, 0.6];

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const rowsAt = wordFrame(words, params.rowsFrom, 35) - 3;
  const lastRowWord = wordFrame(words, "scene", 57, 7); // the second "scene"
  const clickAt = wordFrame(words, params.approveOn, 84) + 2;
  const n = params.scenes;
  const per = Math.max(4, (lastRowWord - rowsAt) / Math.max(1, n - 1));

  const btnIn = prog(frame, rowsAt + per * (n - 1) + 8, 12);
  const clicked = prog(frame, clickAt, 8);
  const done = 2 + prog(frame, clickAt + 2, 8); // Script ticks when approved

  // the button's place on the canvas (for the cursor)
  const bx = PANEL.x + PANEL.w / 2;
  const by = PANEL.y + PANEL_HEAD + 445 + 50;
  const move = interpolate(frame, [clickAt - 18, clickAt - 2], [0, 1], { ...clamp, easing: EASE_OUT });
  const cx = interpolate(move, [0, 1], [bx + 330, bx + 170]);
  const cy = interpolate(move, [0, 1], [by + 190, by + 15]);
  const press = interpolate(frame, [clickAt - 2, clickAt, clickAt + 4], [0, 1, 0], clamp);
  const hot = 0.8 + 0.2 * pulse(frame, 24);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <StepPill n={params.step} />
        <AgentPanel frame={frame} done={done} active={2}>
          {/* the script: one row per scene */}
          <div style={{ position: "absolute", left: 60, right: 60, top: 40, display: "flex", flexDirection: "column", gap: 16, opacity: 1 - clicked * 0.45 }}>
            {Array.from({ length: n }).map((_, i) => {
              const t = prog(frame, rowsAt + i * per, 10);
              return (
                <div
                  key={i}
                  style={{
                    height: 60,
                    borderRadius: 18,
                    background: "#24262c",
                    display: "flex",
                    alignItems: "center",
                    gap: 22,
                    padding: "0 22px",
                    opacity: t,
                    translate: `${(1 - t) * 40}px 0px`,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: GREY_LIGHT, flexShrink: 0 }} />
                  <Bar w={`${ROW_W[i % ROW_W.length] * 100 * t}%`} h={20} color={GREY} />
                </div>
              );
            })}
          </div>
          {/* Approve */}
          <div
            style={{
              position: "absolute",
              left: PANEL.w / 2 - 220,
              top: 445,
              width: 440,
              height: 100,
              borderRadius: 50,
              background: clicked > 0.5 ? LIGHT : c.accent,
              boxShadow: clicked > 0.5 ? "none" : `0 0 ${40 * hot}px rgba(255,112,36,0.55)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              opacity: btnIn,
              scale: `${interpolate(btnIn, [0, 0.7, 1], [0.85, 1.03, 1]) * (1 - press * 0.05)}`,
              fontFamily: c.fontStrong,
              fontSize: 60 * c.widthFactor,
              color: c.bg,
              paddingTop: clicked > 0.5 ? 0 : 6,
              boxSizing: "border-box",
            }}
          >
            {clicked > 0.5 ? <Check size={70} color={c.bg} t={prog(frame, clickAt + 4, 8)} /> : params.button}
          </div>
        </AgentPanel>
        <Ripple x={bx + 170} y={by + 15} frame={frame} at={clickAt} />
        <Cursor x={cx} y={cy} press={press} opacity={prog(frame, clickAt - 22, 6) * (1 - prog(frame, clickAt + 16, 8))} />
      </Stage>
    </AbsoluteFill>
  );
}
