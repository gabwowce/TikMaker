import type { ReactNode } from "react";
import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { LIGHT_TEXT, SCENE_COLORS, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  AngerIcon,
  AppIcon,
  Backdrop,
  Camera,
  Headline,
  OUT,
  PadIcon,
  TvIcon,
  clampAll,
  glass,
  usePop,
  words as w,
} from "./shared";

export const description =
  "Light scene: 'Your turn – what annoys you?' and a list fills in as each is named – an app, a device, a game – each card getting an orange 'annoyed' mark";

export const schema = z.object({
  title: field.text("Headline", "*Your* turn"),
  sub: field.text("Headline line 2", "what annoys you?"),
  item1: field.text("Item 1", "An app"),
  item2: field.text("Item 2", "A device"),
  item3: field.text("Item 3", "A game"),
  item1On: field.word("Item 1 on", "app"),
  item2On: field.word("Item 2 on", "device"),
  item3On: field.word("Item 3 on", "game"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.orange;

function Row({ at, top, label, icon, index }: { at: number; top: number; label: string; icon: ReactNode; index: number }) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const t = frame - (at - 4);
  const p = interpolate(t, [0, 14], [0, 1], { ...clampAll, easing: OUT });
  const mark = usePop(at + 7);
  const float = Math.sin((frame + index * 20) / 14) * 6 * p;
  const shake = interpolate(frame - (at + 7), [0, 3, 6, 9, 12], [0, 6, -5, 3, 0], clampAll);
  return (
    <div
      style={{
        position: "absolute",
        left: 130,
        top,
        width: 770,
        height: 150,
        ...glass(770, true),
        borderRadius: 40,
        display: "flex",
        alignItems: "center",
        gap: 34,
        padding: "0 40px 0 26px",
        boxSizing: "border-box",
        opacity: interpolate(t, [0, 4], [0, 1], clampAll),
        transform: `perspective(1200px) translateY(${(1 - p) * 160 + float}px) rotateX(${(1 - p) * 10}deg) scale(${0.85 + p * 0.15})`,
      }}
    >
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: 28,
          background: `${COLOR}1f`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 64, color: LIGHT_TEXT, flex: 1 }}>{label}</span>
      <div style={{ opacity: mark.opacity, transform: `scale(${mark.scale}) rotate(${shake}deg)` }}>
        <AngerIcon size={84} color={COLOR} />
      </div>
    </div>
  );
}

export default function Scene7({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const annoys = wordFrame(words, "annoys", 61);
  const ats = [
    wordFrame(words, params.item1On, 100),
    wordFrame(words, params.item2On, 118),
    wordFrame(words, params.item3On, 140),
  ];
  const labels = [params.item1, params.item2, params.item3];
  const icons = [AppIcon, TvIcon, PadIcon];

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} light y={700} fromY={600} />
      <Camera duration={durationInFrames} punchAt={ats}>
        <Headline lines={[w(params.title, 0, 6), w(params.sub, annoys - 6, 4)]} size={110} top={240} light color={COLOR} />
        {ats.map((_, i) => (
          <div
            key={`slot${i}`}
            style={{
              position: "absolute",
              left: 130,
              top: 490 + i * 180,
              width: 770,
              height: 150,
              borderRadius: 40,
              border: "3px dashed rgba(20,30,60,0.14)",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              paddingLeft: 26,
            }}
          >
            <div style={{ width: 104, height: 104, borderRadius: 28, background: "rgba(20,30,60,0.05)" }} />
          </div>
        ))}
        {ats.map((at, i) => {
          const Icon = icons[i];
          return (
            <Row key={i} index={i} at={at} top={490 + i * 180} label={labels[i]} icon={<Icon size={66} color={COLOR} />} />
          );
        })}
      </Camera>
    </AbsoluteFill>
  );
}
