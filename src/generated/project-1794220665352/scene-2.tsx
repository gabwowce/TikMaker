import type { ReactNode } from "react";
import { z } from "zod";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { RecordingSlot, SCENE_COLORS, asset, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Backdrop,
  BulbIcon,
  BurstIcon,
  Camera,
  CityIcon,
  Headline,
  MoonIcon,
  cardMotion,
  clampAll,
  glass,
  usePop,
} from "./shared";

export const description =
  "A glass Claude Code window holds the screen recording of the one sentence being typed and sent; under it four icons – bulb, burst, city, moon – light up as each is said";

export const schema = z.object({
  typing: field.recording(
    "Typing the sentence",
    "Claude Code in your terminal (dark theme, font big, window ~16:10): type the sentence “A glowing light bulb cracks open and a tiny 3D city builds itself out of it, block by block, then day turns to night”, press Enter, stop once Claude starts answering. ~6 s, speed it up if longer",
  ),
  headline: field.text("Headline", "*ONE* sentence"),
  bulbOn: field.word("Bulb lights on", "bulb"),
  burstOn: field.word("Burst lights on", "cracks"),
  cityOn: field.word("City lights on", "city"),
  nightOn: field.word("Moon lights on", "night"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.purple;

function Tile({ at, active, children }: { at: number; active: boolean; children: (color: string) => ReactNode }) {
  const frame = useCurrentFrame();
  const pop = usePop(at);
  const lit = frame >= at;
  const color = lit ? "#ffffff" : "rgba(255,255,255,0.35)";
  return (
    <div
      style={{
        width: 96,
        height: 96,
        ...glass(96),
        borderRadius: 26,
        background: lit ? `${COLOR}55` : "rgba(255,255,255,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: active
          ? `0 0 0 3px ${COLOR}, 0 0 40px ${COLOR}cc`
          : "0 8px 16px rgba(0,0,0,0.25)",
        transform: `scale(${lit ? pop.scale : 0.92})`,
      }}
    >
      {children(color)}
    </div>
  );
}

export default function Scene2({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const one = wordFrame(words, "one", 14);
  const sentence = wordFrame(words, "sentence", 20);
  const heads = params.headline.split(" ").map((t, i) => ({ text: t, at: i === 0 ? one : sentence }));

  const ats = [
    wordFrame(words, params.bulbOn, 57),
    wordFrame(words, params.burstOn, 65),
    wordFrame(words, params.cityOn, 119),
    wordFrame(words, params.nightOn, 190),
  ];
  const active = ats.reduce((acc, at, i) => (frame >= at ? i : acc), -1);
  const icons = [BulbIcon, BurstIcon, CityIcon, MoonIcon];
  const glowOn = interpolate(frame, [sentence, sentence + 10], [0, 1], clampAll);

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={680} fromY={900} />
      <Camera duration={durationInFrames} punchAt={[sentence]}>
        <Headline lines={[heads]} top={265} size={96} color={COLOR} />
        <div
          style={{
            position: "absolute",
            left: 130,
            top: 410,
            width: 770,
            height: 520,
            ...glass(770),
            borderRadius: 40,
            overflow: "hidden",
            ...cardMotion(frame, -16),
            boxShadow: `0 8px 16px rgba(0,0,0,0.25), 0 32px 80px rgba(0,0,0,0.5), 0 0 ${80 * glowOn}px ${COLOR}66`,
          }}
        >
          <div style={{ height: 70, display: "flex", alignItems: "center", gap: 12, padding: "0 26px" }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((d) => (
              <div key={d} style={{ width: 18, height: 18, borderRadius: 9, background: d }} />
            ))}
            <div
              style={{
                marginLeft: 18,
                height: 42,
                borderRadius: 21,
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0 18px",
              }}
            >
              <Img src={asset("/assets/agent/project-1794220665352/claude.svg")} style={{ width: 26, height: 26 }} />
              <span style={{ fontFamily: c.fontUi, fontWeight: 700, fontSize: 24, color: "rgba(255,255,255,0.85)" }}>
                Claude Code
              </span>
            </div>
          </div>
          <div style={{ padding: "0 14px 14px" }}>
            <RecordingSlot
              src={params.typing}
              record="Claude Code: type the one sentence, press Enter"
              width={742}
              height={436}
              style={{ borderRadius: 26 }}
            />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            left: 130,
            width: 770,
            top: 975,
            display: "flex",
            justifyContent: "center",
            gap: 40,
          }}
        >
          {icons.map((Icon, i) => (
            <Tile key={i} at={ats[i]} active={active === i}>
              {(color) => <Icon size={56} color={color} />}
            </Tile>
          ))}
        </div>
      </Camera>
    </AbsoluteFill>
  );
}
