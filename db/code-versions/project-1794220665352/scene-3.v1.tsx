import type { ReactNode } from "react";
import { z } from "zod";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import {
  LIGHT_TEXT,
  LIGHT_TEXT_SOFT,
  Logo,
  PhotoSlot,
  SCENE_COLORS,
  asset,
  field,
  useBrand,
  wordFrame,
} from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Backdrop,
  BulbIcon,
  BurstIcon,
  Camera,
  CityIcon,
  Headline,
  MoonIcon,
  OUT,
  REAL_CODE,
  cardMotion,
  clampAll,
  glass,
  usePop,
} from "./shared";

export const description =
  "On a light scene a storyboard sheet flips over into a white code card with the Remotion and three.js logos; then the Blender and After Effects tiles come forward and get struck through";

export const schema = z.object({
  storyboard: field.photo(
    "Reference storyboard",
    "Your reference storyboard image (the sheet you gave Claude Code), landscape or square",
  ),
  head1: field.text("Headline 1", "+ a *storyboard*"),
  head2: field.text("Headline 2", "Then all *code*"),
  flipOn: field.word("Sheet flips on", "Claude"),
  remotionOn: field.word("Remotion logo on", "Remotion"),
  threeOn: field.word("three.js logo on", "three.js"),
  blenderOn: field.word("Blender struck on", "Blender"),
  aeOn: field.word("After Effects struck on", "Effects"),
});
type Params = z.infer<typeof schema>;

const COLOR = SCENE_COLORS.blue;
const BAD = SCENE_COLORS.magenta;

function Panel({ n, children }: { n: number; children: ReactNode }) {
  const c = useBrand();
  return (
    <div
      style={{
        position: "relative",
        background: "#f6f7f9",
        border: "3px solid #d6dae1",
        borderRadius: 22,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 16,
          top: 10,
          fontFamily: c.fontUi,
          fontWeight: 800,
          fontSize: 28,
          color: LIGHT_TEXT_SOFT,
        }}
      >
        {n}
      </span>
      {children}
    </div>
  );
}

function StrikeTile({ at, label, children }: { at: number; label: string; children: ReactNode }) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const pop = usePop(at - 8);
  const strike = interpolate(frame, [at + 2, at + 10], [0, 1], { ...clampAll, easing: OUT });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, opacity: pop.opacity, transform: `scale(${pop.scale})` }}>
      <div
        style={{
          position: "relative",
          width: 300,
          height: 300,
          ...glass(300, true),
          borderRadius: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ filter: `grayscale(${strike})`, opacity: 1 - strike * 0.45 }}>{children}</div>
        <svg width={300} height={300} style={{ position: "absolute", left: 0, top: 0 }}>
          <line
            x1={46}
            y1={254}
            x2={254}
            y2={46}
            stroke={BAD}
            strokeWidth={22}
            strokeLinecap="round"
            strokeDasharray={300}
            strokeDashoffset={300 * (1 - strike)}
          />
        </svg>
      </div>
      <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 44, color: LIGHT_TEXT, whiteSpace: "nowrap" }}>
        {label}
      </span>
    </div>
  );
}

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const flip = wordFrame(words, params.flipOn, 62);
  const remotionAt = wordFrame(words, params.remotionOn, 106);
  const threeAt = wordFrame(words, params.threeOn, 126);
  const blenderAt = wordFrame(words, params.blenderOn, 164);
  const aeAt = wordFrame(words, params.aeOn, 195);
  const noAt = blenderAt - 6;

  const h1 = params.head1.split(" ").map((t, i) => ({
    text: t,
    at: [wordFrame(words, "reference", 25), wordFrame(words, "reference", 25) + 4, wordFrame(words, "storyboard", 36)][i] ?? 36,
  }));
  const h2 = params.head2.split(" ").map((t, i) => ({ text: t, at: flip + 4 + i * 9 }));
  const headSwap = interpolate(frame, [flip - 4, flip + 2], [1, 0], clampAll);

  const rot = interpolate(frame, [flip, flip + 16], [0, 180], { ...clampAll, easing: OUT });
  const back = interpolate(frame, [noAt, noAt + 14], [0, 1], { ...clampAll, easing: OUT });
  const scroll = (frame - flip) * 2.2;
  const rem = usePop(remotionAt);
  const three = usePop(threeAt);

  const icons = [BulbIcon, BurstIcon, CityIcon, MoonIcon];

  return (
    <AbsoluteFill>
      <Backdrop color={COLOR} light y={700} fromY={600} />
      <Camera duration={durationInFrames} punchAt={[flip, blenderAt]}>
        <div style={{ opacity: headSwap }}>
          <Headline lines={[h1]} top={265} size={92} color={COLOR} light />
        </div>
        {frame >= flip - 3 && <Headline lines={[h2]} top={265} size={92} color={COLOR} light />}

        {/* The sheet / code card */}
        <div
          style={{
            position: "absolute",
            left: 130,
            top: 430,
            width: 770,
            height: 560,
            ...cardMotion(frame, -16),
            opacity: 1 - back * 0.75,
            filter: `blur(${back * 10}px)`,
            translate: `0px ${back * -40}px`,
            scale: `${1 - back * 0.14}`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
              transform: `perspective(1600px) rotateY(${rot}deg)`,
            }}
          >
            {/* front: the storyboard */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                ...glass(770, true),
                borderRadius: 44,
                backfaceVisibility: "hidden",
                padding: 30,
                boxSizing: "border-box",
              }}
            >
              {params.storyboard ? (
                <PhotoSlot src={params.storyboard} find="" look="card" width={710} height={500} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 24, height: "100%" }}>
                  {icons.map((Icon, i) => (
                    <Panel key={i} n={i + 1}>
                      <Icon size={130} color="#4b5563" stroke={2.4} />
                    </Panel>
                  ))}
                </div>
              )}
            </div>
            {/* back: the code with the two real logos */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                ...glass(770, true),
                borderRadius: 44,
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                overflow: "hidden",
              }}
            >
              <pre
                style={{
                  position: "absolute",
                  left: 34,
                  top: 20 - (scroll % 900),
                  margin: 0,
                  fontFamily: "monospace",
                  fontSize: 22,
                  lineHeight: 1.5,
                  color: "#1b1d22",
                  opacity: 0.16,
                  filter: "blur(2.5px)",
                  whiteSpace: "pre",
                }}
              >
                {REAL_CODE + "\n\n" + REAL_CODE}
              </pre>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 40,
                }}
              >
                <LogoTile pop={rem} label="Remotion">
                  <Logo id="remotion" size={230} />
                </LogoTile>
                <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 90, color: COLOR, opacity: three.opacity }}>+</span>
                <LogoTile pop={three} label="three.js">
                  <Img src={asset("/assets/agent/project-1794220665352/threejs.svg")} style={{ width: 140, height: 140 }} />
                </LogoTile>
              </div>
            </div>
          </div>
        </div>

        {/* No Blender, no After Effects */}
        {frame >= noAt && (
          <div
            style={{
              position: "absolute",
              left: 130,
              width: 770,
              top: 500,
              display: "flex",
              justifyContent: "center",
              gap: 70,
            }}
          >
            <StrikeTile at={blenderAt} label="Blender">
              <Img src={asset("/assets/agent/project-1794220665352/blender.svg")} style={{ width: 190, height: 190 }} />
            </StrikeTile>
            <StrikeTile at={aeAt} label="After Effects">
              <div
                style={{
                  width: 190,
                  height: 190,
                  borderRadius: 40,
                  background: "#00005b",
                  border: "6px solid #9999ff",
                  boxSizing: "border-box",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: c.fontUi,
                  fontWeight: 700,
                  fontSize: 96,
                  color: "#9999ff",
                }}
              >
                Ae
              </div>
            </StrikeTile>
          </div>
        )}
      </Camera>
    </AbsoluteFill>
  );
}

function LogoTile({ pop, label, children }: { pop: { scale: number; opacity: number }; label: string; children: ReactNode }) {
  const c = useBrand();
  return (
    <div
      style={{
        width: 290,
        height: 330,
        borderRadius: 48,
        background: "rgba(255,255,255,0.92)",
        boxShadow: "0 20px 50px rgba(20,30,60,0.16)",
        border: "1.5px solid rgba(20,30,60,0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        opacity: pop.opacity,
        transform: `scale(${pop.scale})`,
      }}
    >
      {children}
      <span style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 42, color: LIGHT_TEXT }}>{label}</span>
    </div>
  );
}
