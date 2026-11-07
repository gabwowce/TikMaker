import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  bounceIn,
  cardStyle,
  clamp,
  EASE_IN,
  FileCard,
  GREY,
  Key,
  lerpRect,
  popScale,
  prog,
  pulse,
  rectStyle,
  rowRects,
  Slot,
  Stage,
  Terminal,
  type Rect,
} from "./shared";

export const description =
  "Slot 3 fills with Plan mode; big Shift and Tab keys press down, a numbered plan unfolds in the terminal, and the three files beside it lock with orange padlocks";

export const schema = z.object({
  label: field.text("The slot's label", "Plan mode"),
  slotOn: field.word("Slot fills on", "mode"),
  shiftOn: field.word("Shift pressed on", "Shift"),
  tabOn: field.word("Tab pressed on", "Tab"),
  planOn: field.word("Plan unfolds on", "shows"),
  lockOn: field.word("Padlocks on", "Not"),
  touchedOn: field.word("Padlocks pulse on", "touched"),
});
type Params = z.infer<typeof schema>;

const PLAN: Rect = { x: 90, y: 400, w: 570, h: 650 };
const FILE_W = 250;
const FILE_H = 190;
const fileRect = (i: number): Rect => ({ x: 740, y: 410 + i * 225, w: FILE_W, h: FILE_H });

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const slotAt = wordFrame(words, params.slotOn, 19) - 3;
  const shiftAt = wordFrame(words, params.shiftOn, 38) - 2;
  const tabAt = wordFrame(words, params.tabOn, 47) - 2;
  const planAt = wordFrame(words, params.planOn, 75) - 4;
  const lockAt = wordFrame(words, params.lockOn, 122) - 3;
  const touchedAt = wordFrame(words, params.touchedOn, 169) - 3;

  // the row: slot 2 wide → slot 3 wide
  const swap = prog(frame, slotAt, 12);
  const from = rowRects(1);
  const to = rowRects(2);
  const slotHot = interpolate(frame, [slotAt, slotAt + 6, shiftAt - 4, shiftAt + 4], [0, 1, 1, 0], clamp);

  // the chat block of scene 4 leaves
  const out = prog(frame, 0, 9, EASE_IN);

  // the keys
  const keysIn = prog(frame, shiftAt - 12, 12);
  const keysOut = prog(frame, planAt - 6, 8, EASE_IN);
  const shift = prog(frame, shiftAt, 4);
  const tab = prog(frame, tabAt, 4);

  // the plan and the locked files
  const planIn = prog(frame, planAt, 12);
  const planDim = interpolate(frame, [lockAt, lockAt + 8], [1, 0.5], clamp);
  const lockPulse = 1 + 0.08 * prog(frame, touchedAt, 6) * pulse(frame - touchedAt, 20);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {from.map((r, i) => (
          <Slot
            key={i}
            n={i + 1}
            look={{
              rect: lerpRect(r, to[i], swap),
              label: i === 1 ? "/compact" : i === 2 ? params.label : undefined,
              labelFont: i === 2 ? "strong" : "mono",
              hot: i === 2 ? slotHot : 0,
              filled: i === 2 ? swap : 1,
              dim: i === 2 ? 1 : 0.5,
            }}
          />
        ))}

        {out < 1 ? (
          <div
            style={{
              ...rectStyle({ x: 140, y: 600, w: 800, h: 250 }),
              ...cardStyle(800),
              opacity: 1 - out,
              translate: `0px ${out * 60}px`,
            }}
          />
        ) : null}

        {/* Shift + Tab */}
        {keysOut < 1 ? (
          <div
            style={{
              position: "absolute",
              left: 90,
              width: 900,
              top: 560,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 40,
              opacity: keysIn * (1 - keysOut),
              translate: `0px ${(1 - keysIn) * 40 - keysOut * 60}px`,
              scale: `${1 - keysOut * 0.15}`,
            }}
          >
            <Key label="Shift" w={420} h={190} press={shift} hot={shift} />
            <div style={{ fontFamily: c.fontStrong, fontSize: 90, color: c.textSoft, paddingTop: 20 }}>+</div>
            <Key label="Tab" w={300} h={190} press={tab} hot={tab} />
          </div>
        ) : null}

        {/* the plan */}
        <Terminal
          rect={PLAN}
          style={{ opacity: planIn * planDim, scale: `${popScale(frame, planAt)}`, translate: `${(1 - planIn) * -40}px 0px` }}
        >
          <div style={{ position: "absolute", left: 50, right: 40, top: 60, display: "flex", flexDirection: "column", gap: 62 }}>
            {[0.85, 0.62, 0.74].map((f, i) => {
              const at = planAt + 10 + i * 10;
              const row = prog(frame, at, 10);
              const fresh = interpolate(frame, [at, at + 2, at + 14, at + 20], [0, 1, 1, 0], clamp);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 30, opacity: row, translate: `0px ${(1 - row) * 20}px` }}>
                  <div
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 46,
                      flexShrink: 0,
                      background: fresh > 0.5 ? c.accent : "rgba(255,255,255,0.85)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: c.fontStrong,
                      fontSize: 50,
                      color: c.bg,
                      paddingTop: 4,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Bar w={340 * f} h={26} color="#55585f" />
                    <Bar w={220 * f} h={22} color={GREY} />
                  </div>
                </div>
              );
            })}
          </div>
        </Terminal>

        {/* the files: untouched, locked */}
        {[0, 1, 2].map((i) => {
          const fin = prog(frame, planAt + 6 + i * 4, 10);
          const lock = bounceIn(frame, lockAt + i * 6, 10);
          return (
            <FileCard
              key={i}
              rect={fileRect(i)}
              clean={1}
              locked={Math.max(0.011, lock)}
              lockHot={lock > 0.5 ? 1 : 0}
              style={{
                opacity: fin * interpolate(lock, [0, 1], [0.55, 1]),
                translate: `${(1 - fin) * 40}px 0px`,
                scale: `${lock > 0.5 ? lockPulse : 1}`,
              }}
            />
          );
        })}
      </Stage>
    </AbsoluteFill>
  );
}
