import type { ReactNode } from "react";
import { z } from "zod";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { SCENE_COLORS, asset, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Backdrop,
  CLIP_SRC,
  Camera,
  CheckIcon,
  Clip,
  CubeIcon,
  Headline,
  OUT,
  cardMotion,
  clampAll,
  glass,
  usePop,
} from "./shared";

export const description =
  "Over the blurred night city, a glass checklist ticks off three steps as they are said: install Claude Code, one sentence → 3D, use it in a video, a game or a website";

export const schema = z.object({
  clip: field.recording(
    "3D clip (background, ~11 s)",
    "Your finished 12-s bulb→city clip (9:16 MP4). Used blurred and dimmed behind the checklist: seconds 11–11.9, the city at night",
  ),
  headline: field.text("Headline", "Your *turn*"),
  step1: field.text("Step 1", "Install Claude Code"),
  step2: field.text("Step 2", "One sentence → 3D"),
  step3: field.text("Step 3", "Video, game, website"),
  done1: field.word("Step 1 ticks on", "Code"),
  done2: field.word("Step 2 ticks on", "sentence"),
  done3: field.word("Step 3 ticks on", "website"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.teal;

function Row({ start, done, icon, text }: { start: number; done: number; icon: ReactNode; text: string }) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const on = interpolate(frame, [start - 4, start + 6], [0, 1], { ...clampAll, easing: OUT });
  const check = interpolate(frame, [done - 2, done + 8], [0, 1], { ...clampAll, easing: OUT });
  const pop = usePop(done - 2);
  const isActive = frame >= start - 4 && frame < done + 14;
  return (
    <div
      style={{
        height: 168,
        borderRadius: 34,
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "0 26px",
        background: isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0)",
        boxShadow: isActive ? `inset 0 0 0 2px ${COLOR}88` : "none",
        opacity: 0.35 + on * 0.65,
        transform: `translateX(${(1 - on) * 18}px)`,
      }}
    >
      <div
        style={{
          width: 92,
          height: 92,
          flexShrink: 0,
          borderRadius: 26,
          background: "rgba(255,255,255,0.1)",
          border: "1.5px solid rgba(255,255,255,0.16)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <span
        style={{
          flex: 1,
          fontFamily: c.fontUi,
          fontWeight: 800,
          minWidth: 0,
          fontSize: 44,
          color: "#fff",
          whiteSpace: "nowrap",
          letterSpacing: -0.5,
        }}
      >
        {text}
      </span>
      <div
        style={{
          width: 76,
          height: 76,
          flexShrink: 0,
          borderRadius: 38,
          border: `4px solid ${check > 0 ? COLOR : "rgba(255,255,255,0.3)"}`,
          background: check > 0 ? COLOR : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${check > 0 ? pop.scale : 1})`,
          boxShadow: check > 0 ? `0 0 30px ${COLOR}aa` : "none",
          boxSizing: "border-box",
        }}
      >
        <CheckIcon size={52} color="#fff" progress={check} />
      </div>
    </div>
  );
}

export default function Scene7({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const heads = params.headline.split(" ").map((t, i) => ({ text: t, at: i === 0 ? 2 : wordFrame(words, "turn", 7) }));
  const s1 = wordFrame(words, "install", 24);
  const d1 = wordFrame(words, params.done1, 42);
  const s2 = wordFrame(words, "describe", 59);
  const d2 = wordFrame(words, params.done2, 137);
  const s3 = wordFrame(words, "use", 134);
  const d3 = wordFrame(words, params.done3, 184);

  return (
    <AbsoluteFill style={{ background: "#070a12" }}>
      <AbsoluteFill style={{ filter: "blur(16px) brightness(0.42) saturate(1.2)", transform: "scale(1.12)" }}>
        <Clip src={params.clip || CLIP_SRC} from={11} rate={0.12} record="Your 3D clip at ~11 s (night city), blurred behind" />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: 0.7 }}>
        <Backdrop color={COLOR} y={720} fromY={1000} />
      </AbsoluteFill>
      <Camera duration={durationInFrames} punchAt={[d3]}>
        <Headline lines={[heads]} top={265} size={96} color={COLOR} />
        <div
          style={{
            position: "absolute",
            left: 130,
            top: 430,
            width: 770,
            padding: 26,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            ...glass(770),
            borderRadius: 48,
            ...cardMotion(frame, -16),
          }}
        >
          <Row
            start={s1}
            done={d1}
            text={params.step1}
            icon={<Img src={asset("/assets/agent/project-1794220665352/claude.svg")} style={{ width: 58, height: 58 }} />}
          />
          <Row
            start={s2}
            done={d2}
            text={params.step2}
            icon={
              <Img
                src={asset("/assets/agent/project-1794220665352/threejs.svg")}
                style={{ width: 54, height: 54, filter: "invert(1)" }}
              />
            }
          />
          <Row start={s3} done={d3} text={params.step3} icon={<CubeIcon size={56} color="#fff" />} />
        </div>
      </Camera>
    </AbsoluteFill>
  );
}
