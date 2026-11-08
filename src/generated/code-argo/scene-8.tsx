import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Background, Camera, cardMove, COL, Cursor, Dock, EditorShot, glass, GREEN, Headline, Motif, pop, prog, WindowCard } from "./shared";

export const description =
  "The real 'Render MP4' button of the TikMaker editor is clicked; a progress bar fills to 100 % and turns into a finished MP4 file with a download button";

export const schema = z.object({
  line1: field.text("Headline (*word* – key word)", "*Render* MP4"),
  file: field.text("File name", "video.mp4"),
  clickOn: field.word("Button is clicked on", "Render"),
  readyOn: field.word("File is ready on", "ready"),
});
type Params = z.infer<typeof schema>;

const X0 = 1560;
const SCALE = 840 / 440;
const BODY_H = 300;
const CARD = { left: 110, top: 392 };
// the Render MP4 button on the screenshot (display units)
const BTN = { x: 1912, y: 42 };

export default function Scene8({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const clickAt = wordFrame(words, params.clickOn, 28);
  const readyAt = wordFrame(words, params.readyOn, 66);
  const card = cardMove(frame, -10, 10, 8);
  const btn = { x: (BTN.x - X0) * SCALE, y: BTN.y * SCALE };
  const lit = prog(frame, clickAt, 8);

  const barIn = Math.min(pop(frame, clickAt + 3), 1.08);
  const p = interpolate(frame, [clickAt + 5, readyAt - 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 2.2) });
  const swap = prog(frame, readyAt - 2, 10);
  const fileIn = Math.min(pop(frame, readyAt - 2), 1.08);
  const dl = Math.min(pop(frame, readyAt + 6), 1.12);

  return (
    <AbsoluteFill>
      <Background color={COL.amber} y={640}>
        <Motif size={460} y={700} rotate={-10}>MP4</Motif>
      </Background>
      <Camera duration={durationInFrames} punchAt={readyAt}>
        <Headline line1={params.line1} color={COL.amber} start={-6} size={96} />

        <div style={{ position: "absolute", ...CARD, width: 860, height: BODY_H + 80, ...card }}>
          <WindowCard bodyHeight={BODY_H} label="TikMaker · editor">
            <EditorShot x={X0} y={0} scale={SCALE} width={840} height={BODY_H} />
            <div
              style={{
                position: "absolute",
                left: btn.x - 135,
                top: btn.y - 48,
                width: 270,
                height: 96,
                borderRadius: 16,
                border: "4px solid #fff",
                boxShadow: `0 0 40px ${COL.orange}, 0 0 90px ${COL.orange}`,
                opacity: lit * (1 - prog(frame, clickAt + 16, 10) * 0.6),
              }}
            />
          </WindowCard>
        </div>

        <Cursor from={[640, 980]} to={[CARD.left + 10 + btn.x - 20, CARD.top + 70 + btn.y + 6]} moveAt={clickAt - 14} clickAt={clickAt} color={COL.orange} />

        {/* the render: progress bar, then the file */}
        <div style={{ position: "absolute", left: 160, width: 760, top: 830, height: 116 }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              ...glass(false, 36),
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 14,
              padding: "0 34px",
              opacity: Math.min(1, barIn * 1.5) * (1 - swap),
              scale: `${interpolate(barIn, [0, 1], [0.6, 1]) * (1 - swap * 0.1)}`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: c.fontUi, fontWeight: 700, fontSize: 32, color: "#fff" }}>
              <span>Rendering MP4…</span>
              <span style={{ fontVariantNumeric: "tabular-nums", color: COL.amber }}>{Math.round(p * 100)}%</span>
            </div>
            <div style={{ height: 14, borderRadius: 7, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
              <div style={{ width: `${p * 100}%`, height: "100%", borderRadius: 7, background: `linear-gradient(90deg, ${COL.amber}, ${COL.orange})`, boxShadow: `0 0 20px ${COL.orange}` }} />
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              inset: 0,
              ...glass(false, 36),
              border: `3px solid ${GREEN}`,
              boxShadow: `0 0 40px ${GREEN}66, 0 32px 80px rgba(0,0,0,0.5)`,
              display: "flex",
              alignItems: "center",
              gap: 24,
              padding: "0 22px 0 26px",
              opacity: Math.min(1, fileIn * 1.5),
              scale: `${interpolate(fileIn, [0, 1], [0.6, 1])}`,
            }}
          >
            <div style={{ width: 70, height: 84, borderRadius: 14, background: COL.orange, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 12, boxSizing: "border-box", fontFamily: c.fontUi, fontWeight: 800, fontSize: 20, color: "#fff" }}>
              MP4
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontFamily: c.fontUi, fontWeight: 800, fontSize: 40, color: "#fff" }}>{params.file}</div>
              <div style={{ fontFamily: c.fontUi, fontWeight: 600, fontSize: 26, color: "rgba(255,255,255,0.6)" }}>1080 × 1920 · ready</div>
            </div>
            <div style={{ width: 76, height: 76, borderRadius: 38, background: GREEN, display: "flex", alignItems: "center", justifyContent: "center", scale: `${dl}`, boxShadow: `0 0 30px ${GREEN}` }}>
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none">
                <path d="M12 4v12m0 0-5-5m5 5 5-5M5 20h14" stroke="#fff" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>

        <Dock done={[1, 1, 1, 1, 1]} active={-1} color={COL.amber} top={990} />
      </Camera>
    </AbsoluteFill>
  );
}
