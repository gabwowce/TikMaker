import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { clamp, Clip, CLIP_CX, CLIP_CY, EASE_OUT, prog, Stage, StylePill } from "./shared";

export const description =
  "Style pill '01 Kinetic Type'; the clip dims and three huge bold words slam onto it one by one, the last in orange";

export const schema = z.object({
  number: field.text("Number", "01"),
  name: field.text("Style name", "Kinetic Type"),
  slam: field.text("Words that slam in (separated by |)", "SHIP|IT|FASTER"),
  nameOn: field.word("Name appears on", "kinetic"),
  firstOn: field.word("First word slams on", "every"),
  secondOn: field.word("Second word slams on", "word"),
  thirdOn: field.word("Third word slams on", "slams"),
  punchOn: field.word("All words punch on", "big"),
});
type Params = z.infer<typeof schema>;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const numAt = wordFrame(words, params.number, 27) - 3;
  const nameAt = wordFrame(words, params.nameOn, 49) - 3;
  const slams = params.slam.split("|").map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const ats = [
    wordFrame(words, params.firstOn, 74),
    wordFrame(words, params.secondOn, 88),
    wordFrame(words, params.thirdOn, 108),
  ].map((f) => f - 2);
  const punchAt = wordFrame(words, params.punchOn, 149) - 2;

  const dim = prog(frame, ats[0] - 10, 10);
  const punch = interpolate(frame, [punchAt, punchAt + 5, punchAt + 14], [1, 1.1, 1.04], { ...clamp, easing: EASE_OUT });
  const lineH = 160;

  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <StylePill
          n={params.number}
          label={params.name}
          labelIn={prog(frame, nameAt, 12)}
          numIn={interpolate(frame, [numAt, numAt + 5, numAt + 12], [1, 1.25, 1], clamp)}
        />
        <Clip
          frame={frame}
          look={{ hot: 0, btnHot: 1 }}
          style={{ opacity: 1 - dim * 0.65, filter: `blur(${dim * 6}px)` }}
        />
        <div
          style={{
            position: "absolute",
            left: 130,
            width: 770,
            top: CLIP_CY - (slams.length * lineH) / 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            scale: `${punch}`,
            transformOrigin: `${CLIP_CX - 130}px ${(slams.length * lineH) / 2}px`,
          }}
        >
          {slams.map((w, i) => {
            const at = ats[i];
            const s = interpolate(frame, [at, at + 6], [2.3, 1], { ...clamp, easing: EASE_OUT });
            const last = i === slams.length - 1;
            return (
              <div
                key={i}
                style={{
                  height: lineH,
                  lineHeight: `${lineH}px`,
                  fontFamily: c.fontStrong,
                  fontSize: 170 * c.widthFactor,
                  color: last ? c.accent : c.text,
                  whiteSpace: "nowrap",
                  opacity: interpolate(frame, [at, at + 2], [0, 1], clamp),
                  scale: `${s}`,
                  textShadow: last ? `0 0 60px ${c.accent}66` : "0 8px 30px rgba(0,0,0,0.6)",
                }}
              >
                {w}
              </div>
            );
          })}
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
