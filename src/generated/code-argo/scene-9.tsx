import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Background, Camera, cardMove, COL, Cursor, Dock, glass, Headline, Motif, pop, prog, REC, Shot } from "./shared";

export const description =
  "A vertical phone card plays the real TikMaker agent log scrolling by, flanked by blurred real screens; an orange Follow button pops over it and is clicked";

export const schema = z.object({
  line1: field.text("Headline (*word* – key word)", "Building in *public*"),
  line2: field.text("Second line", "follow along"),
  button: field.text("Button", "Follow"),
  followOn: field.word("Follow button pops on", "Follow"),
});
type Params = z.infer<typeof schema>;

const PHONE = { w: 430, h: 556, left: (1080 - 430) / 2, top: 404 };
const SCALE = (PHONE.w - 24) / 364;

export default function Scene9({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const followAt = wordFrame(words, params.followOn, 47) - 2;
  const clickAt = followAt + 16;
  const phone = cardMove(frame, -10, -12, 9);
  const btnIn = Math.min(pop(frame, followAt), 1.1);
  const clicked = frame >= clickAt;
  const press = interpolate(frame, [clickAt - 2, clickAt, clickAt + 5], [1, 0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const side = (dir: number, seed: number) => ({
    transform: `perspective(1200px) rotateY(${dir * -26}deg) rotateZ(${dir * 3}deg) translateY(${Math.sin((frame + seed) / 26) * 10}px)`,
    filter: "blur(8px)",
    opacity: 0.5,
  });

  return (
    <AbsoluteFill>
      <Background color={COL.orange} y={680}>
        <Motif size={330} y={720} rotate={-10}>follow</Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={followAt}>
        <Headline line1={params.line1} line2={params.line2} color={COL.orange} start={-6} start2={followAt - 6} />

        {/* blurred real screens at the sides */}
        <div style={{ position: "absolute", left: -150, top: 470, width: 420, height: 300, borderRadius: 30, overflow: "hidden", ...side(-1, 0) }}>
          <Shot src={REC.hooks} at={8.5} freeze x={1240} y={600} scale={1.15} width={420} height={300} />
        </div>
        <div style={{ position: "absolute", right: -150, top: 520, width: 420, height: 300, borderRadius: 30, overflow: "hidden", ...side(1, 20) }}>
          <Shot src={REC.built} at={9} freeze x={0} y={600} scale={0.6} width={420} height={300} />
        </div>

        {/* the phone: the agent's log, building, scrolling by */}
        <div style={{ position: "absolute", left: PHONE.left, top: PHONE.top, width: PHONE.w, height: PHONE.h, padding: 12, boxSizing: "border-box", ...glass(false, 56), ...phone }}>
          <div style={{ borderRadius: 44, overflow: "hidden", height: PHONE.h - 24 }}>
            <Shot src={REC.agent} at={9.5} rate={2.4} x={1236} y={60} scale={SCALE} width={PHONE.w - 24} height={PHONE.h - 24} />
          </div>
        </div>

        {/* follow */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: PHONE.top + PHONE.h - 150,
            display: "flex",
            justifyContent: "center",
            opacity: Math.min(1, btnIn * 1.5),
            scale: `${interpolate(btnIn, [0, 1], [0.5, 1]) * press}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              padding: "26px 60px",
              borderRadius: 999,
              background: clicked ? "rgba(255,255,255,0.14)" : COL.orange,
              border: clicked ? "2px solid rgba(255,255,255,0.3)" : "2px solid transparent",
              backdropFilter: "blur(18px)",
              boxShadow: clicked ? "0 20px 50px rgba(0,0,0,0.5)" : `0 0 60px ${COL.orange}aa, 0 20px 50px rgba(0,0,0,0.5)`,
              fontFamily: c.fontUi,
              fontWeight: 800,
              fontSize: 58,
              color: "#fff",
            }}
          >
            <span style={{ fontSize: 62 }}>{clicked ? "✓" : "+"}</span>
            {clicked ? `${params.button}ing` : params.button}
          </div>
        </div>
        <Cursor from={[880, 1060]} to={[760, PHONE.top + PHONE.h - 80]} moveAt={clickAt - 12} clickAt={clickAt} color="#fff" />

        <Dock done={[1, 1, 1, 1, 1]} active={-1} color={COL.orange} top={990} />
      </Camera>
    </AbsoluteFill>
  );
}
