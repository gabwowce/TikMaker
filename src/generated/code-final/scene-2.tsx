import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { clamp, EASE_BOUNCE, EDITOR, Headline, prog, slotRect, SlotList, Terminal } from "./shared";

export const description =
  "The editor folds away and three empty numbered slots drop in under a headline whose counter clicks up to 3; on 'never' each slot is tagged '0 uses'";

export const schema = z.object({
  pill: field.text("Strip", "CLAUDE CODE"),
  headline: field.text("Headline ({n} – the counter, *word* – key word)", "*{n}* unused commands"),
  oneOn: field.word("Counter at 1 on", "one"),
  threeOn: field.word("Counter at 3 on", "three"),
  neverOn: field.word("'0 uses' tags on", "never"),
});
type Params = z.infer<typeof schema>;

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const oneAt = wordFrame(words, params.oneOn, 9) - 2;
  const threeAt = wordFrame(words, params.threeOn, 28) - 2;
  const neverAt = wordFrame(words, params.neverOn, 84) - 3;
  const clicks = [oneAt, Math.round((oneAt + threeAt) / 2), threeAt];
  const n = Math.max(1, clicks.filter((f) => frame >= f).length);
  const lastClick = [...clicks].reverse().find((f) => frame >= f) ?? 0;
  const pop = interpolate(frame, [lastClick, lastClick + 4, lastClick + 10], [1, 1.08, 1], {
    ...clamp,
    easing: EASE_BOUNCE,
  });

  // the editor of scene 1 folds away while the slots drop in
  const fold = prog(frame, 0, 10);
  const float = Math.sin(frame / 22) * 6;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const tags = prog(frame, neverAt, 8);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, scale: `${pop}`, transformOrigin: "540px 320px" }}>
        <Headline pill={params.pill} text={params.headline.replace("{n}", String(n))} />
      </div>

      {fold < 1 ? (
        <Terminal
          rect={EDITOR}
          style={{ opacity: 1 - fold, scale: `${1 - fold * 0.12}` }}
        >
          <div />
        </Terminal>
      ) : null}

      <div style={{ position: "absolute", inset: 0, translate: `0px ${float}px`, scale: `${push}` }}>
        <SlotList
          from="big"
          to="big"
          t={0}
          fill={[0, 0, 0]}
          lit={clicks.map((f) => (frame >= f ? 1 : 0))}
          enter={[0, 1, 2].map((i) => prog(frame, 3 + i * 4, 12))}
        />
        {/* "0 uses" tags on the empty slots */}
        {[0, 1, 2].map((i) => {
          const r = slotRect(i, "big");
          const t = prog(frame, neverAt + i * 4, 8);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: r.x + r.w - 230,
                top: r.y + r.h / 2 - 30,
                height: 60,
                width: 196,
                borderRadius: 999,
                border: `2px solid ${c.accent}`,
                color: c.accent,
                fontFamily: c.fontStrong,
                fontSize: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 4,
                boxSizing: "border-box",
                opacity: t * tags,
                scale: `${interpolate(t, [0, 1], [1.6, 1])}`,
                rotate: "-4deg",
              }}
            >
              0 uses
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
