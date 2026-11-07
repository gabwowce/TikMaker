import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, Logo, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  clamp,
  EASE_BOUNCE,
  EASE_OUT,
  FileCard,
  fileRects,
  HOOK_FILES_H,
  HOOK_FILES_Y,
  HOOK_TERM,
  lerpRect,
  prog,
  rowRects,
  S2_TERM,
  Slot,
  Stage,
  Terminal,
} from "./shared";

export const description =
  "The terminal grows into a big Claude Code window; three empty numbered slots drop in above it while a big orange counter clicks 1, 2, 3";

export const schema = z.object({
  count: field.number("Commands", 3, { min: 1, max: 3 }),
  dropOn: field.word("Slots drop on", "three"),
});
type Params = z.infer<typeof schema>;

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const dropAt = wordFrame(words, params.dropOn, 28) - 4;
  const step = 6;
  const n = Math.round(params.count);

  const grow = prog(frame, 4, 18);
  const term = lerpRect(HOOK_TERM, S2_TERM, grow);
  const filesOut = prog(frame, 0, 10);
  const slots = rowRects(-1);
  const shown = [0, 1, 2].filter((i) => i < n && frame >= dropAt + i * step).length;
  const lastTick = dropAt + (shown - 1) * step;
  const tickPop = shown > 0 ? interpolate(frame, [lastTick, lastTick + 8], [1.12, 1], { ...clamp, easing: EASE_OUT }) : 1;
  const logoIn = prog(frame, 12, 14);

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        {/* the hook's files leave upwards */}
        {fileRects(HOOK_FILES_Y, HOOK_FILES_H).map((r, i) =>
          filesOut < 1 ? (
            <FileCard
              key={i}
              rect={r}
              clean={1}
              style={{ opacity: 1 - filesOut, translate: `0px ${-filesOut * 80}px` }}
            />
          ) : null,
        )}

        <Terminal rect={term}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                opacity: logoIn * interpolate(shown, [0, 1], [1, 0.4], clamp),
                filter: shown > 0 ? "grayscale(1)" : undefined,
                scale: `${0.8 + logoIn * 0.2}`,
              }}
            >
              <Logo id="claude" size={190} />
            </div>
            <div
              style={{
                height: shown > 0 ? 300 : 0,
                fontFamily: c.fontStrong,
                fontSize: 300 * c.widthFactor,
                lineHeight: "300px",
                color: c.accent,
                scale: `${tickPop}`,
                opacity: shown > 0 ? 1 : 0,
                textShadow: `0 0 60px ${c.accent}55`,
              }}
            >
              {shown}
            </div>
          </div>
        </Terminal>

        {slots.map((r, i) => {
          if (i >= n) return null;
          const at = dropAt + i * step;
          const drop = interpolate(frame, [at, at + 11], [0, 1], { ...clamp, easing: EASE_BOUNCE });
          return (
            <Slot
              key={i}
              n={i + 1}
              look={{
                rect: { ...r, y: r.y - (1 - drop) * 140 },
                dim: prog(frame, at, 6),
              }}
            />
          );
        })}
      </Stage>
    </AbsoluteFill>
  );
}
