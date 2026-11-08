import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Background, Camera, cardMove, clamp, COL, Dock, GREEN, Headline, Motif, pop, prog, REC, Shot, WindowCard } from "./shared";

export const description =
  "Light scene: the real agent card, cropped to its big 'Template · picked by the AI – Problem then fix' header, steps forward between two dimmed templates that weren't chosen and gets a green check";

export const schema = z.object({
  line1: field.text("Headline (*word* – key word)", "Picks the *template*"),
  panOn: field.word("Picked card steps forward on", "template"),
  checkOn: field.word("Green check on", "fits"),
});
type Params = z.infer<typeof schema>;

// Crops of the real recording (hooks.webm at 8.5 s, source px).
const AT = 8.5;
const INNER = 820; // width of the crops inside the card
// 1) "✓ Template · picked by the AI" + "Problem then fix" – set big
const HEAD = { x: 1248, y: 326, w: 177, h: 50 };
const HEAD_S = INNER / HEAD.w;
// 2) the one-line description under it
const DESC = { x: 1250, y: 380, w: 326, h: 28 };
const DESC_S = INNER / DESC.w;
const BODY_H = Math.round(HEAD.h * HEAD_S + DESC.h * DESC_S + 34);
const CARD_W = 860;
const CARD_TOP = 470;

/** A template that wasn't chosen: a dimmed, blurred dark card behind. */
function Unpicked({ side, show, back }: { side: -1 | 1; show: number; back: number }) {
  const frame = useCurrentFrame();
  const bar = (w: number, h: number, o: number) => (
    <div style={{ width: w, height: h, borderRadius: h / 2, background: `rgba(255,255,255,${o})` }} />
  );
  return (
    <div
      style={{
        position: "absolute",
        left: 540 - 300 + side * interpolate(show, [0, 1], [30, 250]),
        top: CARD_TOP - interpolate(show, [0, 1], [0, 70]) + Math.sin((frame + side * 30) / 16) * 6,
        width: 600,
        height: 360,
        borderRadius: 40,
        background: "#23262d",
        border: "1.5px solid rgba(255,255,255,0.6)",
        boxShadow: "0 20px 50px rgba(20,30,60,0.14)",
        padding: "44px 44px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 22,
        opacity: Math.min(1, show * 2) * interpolate(back, [0, 1], [0.62, 0.42]),
        filter: `blur(${5 + back * 3}px)`,
        transform: `perspective(1200px) rotateY(${side * -16}deg) rotateZ(${side * show * 9}deg) scale(${interpolate(back, [0, 1], [0.86, 0.8])})`,
      }}
    >
      {bar(300, 22, 0.35)}
      {bar(380, 40, 0.75)}
      {bar(470, 20, 0.3)}
      {bar(420, 20, 0.3)}
    </div>
  );
}

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const fanAt = wordFrame(words, "picks", 19) - 4;
  const liftAt = wordFrame(words, params.panOn, 38) - 4;
  const checkAt = wordFrame(words, params.checkOn, 56) - 2;

  const card = cardMove(frame, -10, -10, 3);
  const fan = prog(frame, fanAt, 16);
  const lift = prog(frame, liftAt, 14);
  const ring = prog(frame, checkAt, 8);
  const badge = Math.min(pop(frame, checkAt), 1.1);
  const liftScale = interpolate(lift, [0, 1], [1, 1.05]) * interpolate(frame, [checkAt, checkAt + 3, checkAt + 12], [1, 1.03, 1], clamp);

  return (
    <AbsoluteFill>
      <Background color={COL.blue} light y={620}>
        <Motif light size={300} y={700} rotate={-12}>template</Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={checkAt}>
        <Headline line1={params.line1} color={COL.blue} light start={-6} />

        {/* the two templates that weren't chosen */}
        <Unpicked side={-1} show={fan} back={lift} />
        <Unpicked side={1} show={fan} back={lift} />

        {/* the picked one: the real agent card, cropped to its header */}
        <div style={{ position: "absolute", left: (1080 - CARD_W) / 2, top: CARD_TOP, width: CARD_W, height: BODY_H + 80, ...card }}>
          <div style={{ position: "absolute", inset: 0, scale: `${liftScale}` }}>
            <WindowCard light bodyHeight={BODY_H} label="AI agent · step 2: Angle">
              <div style={{ position: "absolute", inset: 0, background: "#1e1e1e" }} />
              <div style={{ position: "absolute", left: (CARD_W - 20 - INNER) / 2, top: 14 }}>
                <Shot src={REC.hooks} at={AT} freeze x={HEAD.x} y={HEAD.y} scale={HEAD_S} width={INNER} height={Math.round(HEAD.h * HEAD_S)} />
                <Shot src={REC.hooks} at={AT} freeze x={DESC.x} y={DESC.y} scale={DESC_S} width={INNER} height={Math.round(DESC.h * DESC_S)} />
              </div>
              {/* the picked card lights up */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 34,
                  border: `5px solid ${COL.blue}`,
                  boxShadow: `inset 0 0 40px ${COL.blue}88`,
                  opacity: ring * (0.75 + Math.sin(frame / 6) * 0.25),
                }}
              />
            </WindowCard>
            {/* green check badge on the picked card's corner */}
            <div
              style={{
                position: "absolute",
                right: -30,
                top: -36,
                width: 124,
                height: 124,
                borderRadius: 62,
                background: GREEN,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontFamily: c.fontUi,
                fontWeight: 900,
                fontSize: 70,
                scale: `${badge}`,
                boxShadow: `0 0 40px ${GREEN}aa, 0 14px 30px rgba(20,30,60,0.2)`,
              }}
            >
              ✓
            </div>
          </div>
        </div>

        <Dock light done={[1, 0, 0, 0, 0]} active={1} color={COL.blue} />
      </Camera>
    </AbsoluteFill>
  );
}
