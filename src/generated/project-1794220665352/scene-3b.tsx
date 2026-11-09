import { z } from "zod";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { SCENE_COLORS, asset, field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, Camera, CodeLines, Headline, OUT, REAL_CODE, cardMotion, clampAll, usePop } from "./shared";

export const description =
  "On a dark scene a VS Code editor window scrolls through the animation's real code in colour under 'All code'; on 'no Blender, no After Effects' two pills pop up and get struck through";

export const schema = z.object({
  headline: field.text("Headline", "All *code*"),
  pill1: field.text("First pill", "Blender"),
  pill2: field.text("Second pill", "After Effects"),
  pill1On: field.word("First pill struck on", "Blender"),
  pill2On: field.word("Second pill struck on", "Effects"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.blue;
const BAD = SCENE_COLORS.magenta;

function StruckPill({ at, struckAt, text, logo }: { at: number; struckAt: number; text: string; logo: string }) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const pop = usePop(at);
  const strike = interpolate(frame, [struckAt - 2, struckAt + 8], [0, 1], { ...clampAll, easing: OUT });
  return (
    <div
      style={{
        position: "relative",
        height: 96,
        padding: "0 34px 0 22px",
        gap: 16,
        borderRadius: 48,
        background: "rgba(255,255,255,0.08)",
        border: "1.5px solid rgba(255,255,255,0.16)",
        display: "flex",
        alignItems: "center",
        opacity: pop.opacity * (1 - strike * 0.35),
        transform: `scale(${pop.scale})`,
      }}
    >
      <Img src={asset(logo)} style={{ width: 58, height: 58, objectFit: "contain", borderRadius: 12 }} />
      <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 44, color: "#fff", whiteSpace: "nowrap" }}>
        {text}
      </span>
      <div
        style={{
          position: "absolute",
          left: 16,
          right: 22,
          top: 46,
          height: 7,
          borderRadius: 4,
          background: BAD,
          boxShadow: `0 0 18px ${BAD}`,
          transform: `scaleX(${strike})`,
          transformOrigin: "left center",
        }}
      />
    </div>
  );
}

export default function Scene3b({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const codeAt = wordFrame(words, "code", 30);
  const heads = params.headline.split(" ").map((t, i) => ({ text: t, at: i === 0 ? 2 : codeAt }));
  const noAt = wordFrame(words, "No", 50);
  const struck1 = wordFrame(words, params.pill1On, 62);
  const struck2 = wordFrame(words, params.pill2On, 92);
  // the code keeps scrolling the whole scene, like a file being read
  const scroll = frame * 2.4;

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} y={640} />
      <Camera duration={durationInFrames} punchAt={[codeAt]}>
        <Headline lines={[heads]} top={265} size={104} color={COLOR} />
        <div
          style={{
            position: "absolute",
            left: 130,
            top: 410,
            width: 770,
            height: 480,
            borderRadius: 36,
            overflow: "hidden",
            background: "#1e1e1e",
            border: "1.5px solid rgba(255,255,255,0.12)",
            boxShadow: `0 8px 16px rgba(0,0,0,0.3), 0 32px 80px rgba(0,0,0,0.55), 0 0 60px ${COLOR}33`,
            ...cardMotion(frame, -6),
          }}
        >
          {/* the editor's tab bar */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              height: 58,
              background: "#252526",
              display: "flex",
              alignItems: "center",
              gap: 12,
              paddingLeft: 22,
              zIndex: 1,
            }}
          >
            {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
              <div key={dot} style={{ width: 16, height: 16, borderRadius: 8, background: dot }} />
            ))}
            <div
              style={{
                marginLeft: 14,
                height: 40,
                padding: "0 18px",
                background: "#1e1e1e",
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "Inter, system-ui, sans-serif",
                fontWeight: 600,
                fontSize: 21,
                color: "#e7e7e7",
              }}
            >
              <span style={{ color: "#3178c6", fontWeight: 800 }}>TS</span>
              BulbCity.tsx
            </div>
          </div>
          <div style={{ position: "absolute", left: 4, right: 0, top: 58, bottom: 0, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 12 - (scroll % 900) }}>
              <CodeLines code={REAL_CODE + "\n\n" + REAL_CODE} fontSize={23} />
            </div>
          </div>
        </div>
        {frame >= noAt - 4 && (
          <div
            style={{
              position: "absolute",
              left: 130,
              width: 770,
              top: 940,
              display: "flex",
              justifyContent: "center",
              gap: 26,
            }}
          >
            <StruckPill at={noAt - 2} struckAt={struck1} text={params.pill1} logo="/assets/agent/project-1794220665352/blender.webp" />
            <StruckPill at={struck1 + 4} struckAt={struck2} text={params.pill2} logo="/assets/agent/project-1794220665352/after-effects.webp" />
          </div>
        )}
      </Camera>
    </AbsoluteFill>
  );
}
