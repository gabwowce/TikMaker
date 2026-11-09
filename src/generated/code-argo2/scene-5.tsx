import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, cardStyle, clamp, Cursor, EASE_OUT, GREY, LIGHT, popScale, prog, Progress, Stage } from "./shared";

export const description =
  "Under the step bar a script card fills row by row – one numbered row per scene – then the cursor clicks the orange Approve button and step 3 ticks";

export const schema = z.object({
  button: field.text("The button", "Approve"),
  scenes: field.number("Scene rows", 5, { min: 3, max: 6 }),
  fillOn: field.word("Rows fill on", "scene"),
  approveOn: field.word("Approve clicked on", "approve"),
});
type Params = z.infer<typeof schema>;

const CARD = { left: 175, top: 410, w: 680 };

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const fillAt = wordFrame(words, params.fillOn, 44) - 18;
  const approveAt = wordFrame(words, params.approveOn, 84) - 2;
  const n = Math.round(params.scenes);
  const rowH = 64;
  const gap = n > 5 ? 10 : 16;
  const step = Math.max(3, Math.min(6, Math.floor(28 / n)));

  const approved = prog(frame, approveAt + 2, 10);
  const btnX = CARD.left + CARD.w / 2;
  const btnY = CARD.top + 36 + n * (rowH + gap) + 18 + 48;
  const cur = interpolate(frame, [approveAt - 16, approveAt - 1], [0, 1], { ...clamp, easing: EASE_OUT });
  const press = interpolate(frame, [approveAt - 1, approveAt + 2, approveAt + 7], [1, 0.95, 1], clamp);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <Progress done={[1, 1, approved, 0, 0]} active={approved > 0.5 ? 3 : 2} frame={frame} />
        <div style={{ ...cardStyle(CARD.w), position: "absolute", left: CARD.left, top: CARD.top, width: CARD.w, padding: "36px 36px 40px" }}>
          {Array.from({ length: n }).map((_, i) => {
            const at = fillAt + i * step;
            const p = prog(frame, at, 10);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  height: rowH,
                  marginBottom: gap,
                  opacity: p,
                  translate: `${(1 - p) * 30}px 0px`,
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: GREY,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: c.fontStrong,
                    fontSize: 30,
                    color: LIGHT,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Bar w={[420, 360, 450, 330, 400, 380][i % 6]} h={20} color="#5a5e66" />
                  <Bar w={[260, 300, 220, 280, 240, 310][i % 6]} h={16} />
                </div>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 18,
              height: 96,
              borderRadius: 22,
              background: c.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              fontFamily: c.fontStrong,
              fontSize: 52,
              color: "#fff",
              scale: `${press * (frame >= fillAt + n * step ? popScale(frame, fillAt + n * step) : 0.94)}`,
              opacity: prog(frame, fillAt + n * step, 8),
              boxShadow: `0 0 ${40 * approved}px ${c.accent}99`,
            }}
          >
            {approved > 0.5 ? "✓ " : ""}
            {params.button}
          </div>
        </div>
        <Cursor x={interpolate(cur, [0, 1], [btnX + 280, btnX + 90])} y={interpolate(cur, [0, 1], [btnY - 240, btnY])} frame={frame} clickAt={approveAt} opacity={cur} />
      </Stage>
    </AbsoluteFill>
  );
}
