import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Bar,
  clamp,
  EASE_BOUNCE,
  FileCard,
  Key,
  lerpRect,
  popScale,
  prog,
  rowRects,
  Slots,
  Terminal,
  type Rect,
} from "./shared";

export const description =
  "Slot 3 fills with Plan mode; the Shift and Tab keys press down, then a numbered plan unfolds in the terminal while the files beside it get orange padlocks";

export const schema = z.object({
  label: field.text("Slot label", "Plan mode"),
  key1: field.text("First key", "Shift"),
  key2: field.text("Second key", "Tab"),
  labelOn: field.word("Slot fills on", "mode"),
  key1On: field.word("First key presses on", "Shift"),
  key2On: field.word("Second key presses on", "Tab"),
  showsOn: field.word("Terminal comes in on", "shows"),
  planOn: field.word("Plan unfolds on", "plan"),
  lockOn: field.word("Padlocks on", "Not"),
});
type Params = z.infer<typeof schema>;

const PREV: Rect = { x: 140, y: 570, w: 800, h: 340 };
const PLAN: Rect = { x: 90, y: 430, w: 590, h: 585 };
const FILES: Rect[] = [0, 1, 2].map((i) => ({ x: 730, y: 430 + i * 205, w: 240, h: 175 }));
const ROWS = [0.8, 0.62, 0.72];

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const labelAt = wordFrame(words, params.labelOn, 19) - 3;
  const k1 = wordFrame(words, params.key1On, 38) - 2;
  const k2 = wordFrame(words, params.key2On, 47, 5) - 2;
  const showsAt = wordFrame(words, params.showsOn, 75) - 4;
  const planAt = wordFrame(words, params.planOn, 103, 10) - 3;
  const lockAt = wordFrame(words, params.lockOn, 122) - 3;

  const move = prog(frame, 0, 18);
  const from = rowRects(1);
  const to = rowRects(2);
  const label = prog(frame, labelAt, 10);
  const slotHot = frame >= labelAt && frame < k1 ? 1 : 0;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const drift = Math.sin(frame / 24) * 5;

  const looks = from.map((r, i) => ({
    rect: lerpRect(r, to[i], move),
    label: i === 2 && label > 0 ? params.label : undefined,
    labelFont: "strong" as const,
    hot: i === 2 ? slotHot : 0,
    filled: i < 2 ? 1 : label,
    dim: i === 2 ? 1 : 0.5,
  }));

  // the previous scene's window leaves
  const prevOut = interpolate(frame, [0, 8], [1, 0], clamp);

  // keys
  const keysIn = prog(frame, Math.min(k1 - 10, 24), 12);
  const keysOut = interpolate(frame, [showsAt, showsAt + 7], [1, 0], clamp);
  const press = (at: number) => interpolate(frame, [at, at + 4], [0, 1], clamp);
  const hotKey = frame >= k2 ? 2 : frame >= k1 ? 1 : 0;

  // terminal with the plan, files
  const termIn = prog(frame, showsAt + 2, 12);
  const lock = (i: number) => prog(frame, lockAt + i * 4, 10, EASE_BOUNCE);
  const locked = frame >= lockAt;
  const planDim = locked ? interpolate(frame, [lockAt, lockAt + 8], [1, 0.5], clamp) : 1;

  return (
    <AbsoluteFill style={{ scale: `${push}` }}>
      <Slots looks={looks} />

      {prevOut > 0 ? (
        <Terminal rect={PREV} style={{ opacity: prevOut * 0.6, translate: `0px ${(1 - prevOut) * 50}px` }} />
      ) : null}

      {keysOut > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 90,
            right: 90,
            top: 560,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: 36,
            opacity: keysIn * keysOut,
            scale: `${interpolate(keysIn, [0, 1], [0.9, 1]) * interpolate(keysOut, [0, 1], [0.9, 1])}`,
            translate: `0px ${drift}px`,
          }}
        >
          <Key label={params.key1} w={400} h={190} press={press(k1)} hot={hotKey === 1 ? 1 : 0} />
          <div style={{ fontFamily: c.fontStrong, fontSize: 80, color: c.textSoft, paddingBottom: 60 }}>+</div>
          <Key label={params.key2} w={280} h={190} press={press(k2)} hot={hotKey === 2 ? 1 : 0} />
        </div>
      ) : null}

      {termIn > 0 ? (
        <>
          <Terminal
            rect={{ ...PLAN, y: PLAN.y + drift }}
            style={{ opacity: termIn * planDim, scale: `${popScale(frame, showsAt + 2)}` }}
          >
            <div style={{ position: "absolute", left: 50, right: 50, top: 66, display: "flex", flexDirection: "column", gap: 70 }}>
              {ROWS.map((f, i) => {
                const at = planAt + i * 7;
                const p = prog(frame, at, 10);
                const hot = frame >= at && !locked;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 28, opacity: p, translate: `0px ${(1 - p) * 24}px` }}>
                    <div
                      style={{
                        width: 84,
                        height: 84,
                        borderRadius: 42,
                        flexShrink: 0,
                        background: hot ? c.accent : "#e6e6e8",
                        color: c.bg,
                        fontFamily: c.fontStrong,
                        fontSize: 46,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingTop: 4,
                        boxSizing: "border-box",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                      <Bar w={`${f * 100}%`} h={24} color="#4a4d55" />
                      <Bar w={`${f * 60}%`} h={24} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Terminal>
          {FILES.map((r, i) => (
            <FileCard
              key={i}
              rect={{ ...r, y: r.y + Math.sin((frame + i * 20) / 22) * 5 }}
              clean={1}
              locked={lock(i)}
              lockHot={locked ? 1 : 0}
              style={{ opacity: prog(frame, showsAt + 5 + i * 3, 10) * (locked ? 1 : 0.5) }}
            />
          ))}
        </>
      ) : null}
    </AbsoluteFill>
  );
}
