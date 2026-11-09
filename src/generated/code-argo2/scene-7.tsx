import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, RecordingSlot, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Bar, cardStyle, clamp, GREY, GREY_SOFT, PhoneVideo, popScale, prog, Stage } from "./shared";

export const description =
  "An editor window: the finished vertical video drops into the preview and plays, the scene strip fills thumb by thumb and the timeline lanes fill under an orange playhead";

export const schema = z.object({
  editor: field.recording(
    "The editor with the built video (optional)",
    "TikMaker editor right after the agent finishes: the scene strip fills, the timeline shows blocks, voice and captions, the preview plays – 4 s",
  ),
  scenes: field.number("Scenes in the strip", 8, { min: 4, max: 10 }),
  landsOn: field.word("Video lands on", "lands"),
  timelineOn: field.word("Timeline fills on", "timeline"),
});
type Params = z.infer<typeof schema>;

const WIN = { x: 140, y: 290, w: 750, h: 730 };

export default function Scene7({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const landsAt = wordFrame(words, params.landsOn, 31) - 3;
  const tlAt = wordFrame(words, params.timelineOn, 63) - 8;
  const n = Math.round(params.scenes);

  if (params.editor)
    return (
      <AbsoluteFill>
        <RecordingSlot src={params.editor} record="" width={WIN.w} height={WIN.h} style={{ position: "absolute", left: WIN.x, top: WIN.y }} />
      </AbsoluteFill>
    );

  const phoneW = 190;
  const phoneH = (phoneW * 16) / 9;
  const land = prog(frame, landsAt, 12);
  const stripTop = 76 + phoneH + 28;
  const tw = 62;
  const tgap = 12;
  const stripW = n * tw + (n - 1) * tgap;
  const laneX = 40;
  const laneW = WIN.w - 80;
  const fill = interpolate(frame, [tlAt, tlAt + 16], [0, 1], clamp);
  const play = interpolate(frame, [tlAt + 8, durationInFrames], [0.05, 0.45], clamp);
  const lanesTop = stripTop + 96 + 34;
  const lanesH = 130;

  const blockW = [0.16, 0.12, 0.14, 0.1, 0.13, 0.12, 0.11, 0.12];
  return (
    <AbsoluteFill>
      <Stage frame={frame} duration={durationInFrames}>
        <div style={{ ...cardStyle(WIN.w), position: "absolute", left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h }}>
          {/* title bar */}
          <div style={{ height: 52, borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 12, padding: "0 22px" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: GREY }} />
            ))}
            <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
              <Bar w={160} h={14} />
            </div>
          </div>
          {/* preview */}
          <div style={{ position: "absolute", left: WIN.w / 2 - phoneW / 2, top: 76 }}>
            <div style={{ position: "absolute", inset: 0, width: phoneW, height: phoneH, borderRadius: 22, border: `3px dashed ${GREY}`, boxSizing: "border-box", opacity: 1 - land }} />
            <div style={{ opacity: land, scale: `${frame >= landsAt ? popScale(frame, landsAt, 0.9) : 0.9}`, translate: `0px ${(1 - land) * -40}px` }}>
              <PhoneVideo w={phoneW} frame={Math.max(0, frame - landsAt)} playing={1} hot={1} />
            </div>
          </div>
          {/* the scene strip */}
          <div style={{ position: "absolute", left: WIN.w / 2 - stripW / 2, top: stripTop, display: "flex", gap: tgap }}>
            {Array.from({ length: n }).map((_, i) => {
              const p = prog(frame, landsAt + 4 + i * 3, 9);
              return (
                <div key={i} style={{ position: "relative", width: tw, height: 96 }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: 10, border: `2px dashed ${GREY_SOFT}` }} />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 10,
                      background: "#2a2d33",
                      border: "1px solid rgba(255,255,255,0.12)",
                      opacity: p,
                      scale: `${0.7 + 0.3 * p}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ width: 26, height: 22, borderRadius: 6, background: i === 0 ? c.accent : "#565a63" }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* the timeline lanes */}
          <div style={{ position: "absolute", left: laneX, top: lanesTop, width: laneW, height: lanesH }}>
            {/* scene blocks */}
            <div style={{ position: "absolute", top: 0, left: 0, width: laneW * fill, height: 34, overflow: "hidden", display: "flex", gap: 6 }}>
              {blockW.map((bw, i) => (
                <div key={i} style={{ flexShrink: 0, width: laneW * bw - 6, height: 34, borderRadius: 8, background: i % 2 ? "#4a4e57" : "#5a5e66" }} />
              ))}
            </div>
            {/* voice wave */}
            <div style={{ position: "absolute", top: 48, left: 0, width: laneW * fill, height: 34, overflow: "hidden", display: "flex", alignItems: "center", gap: 5 }}>
              {Array.from({ length: 80 }).map((_, i) => (
                <div key={i} style={{ flexShrink: 0, width: 3, height: 8 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 24, borderRadius: 2, background: "#6b7079" }} />
              ))}
            </div>
            {/* caption clips */}
            <div style={{ position: "absolute", top: 96, left: 0, width: laneW * fill, height: 20, overflow: "hidden", display: "flex", gap: 10 }}>
              {[60, 90, 50, 80, 70, 55, 95, 65, 75].map((w, i) => (
                <div key={i} style={{ flexShrink: 0, width: w, height: 20, borderRadius: 6, background: GREY }} />
              ))}
            </div>
            {/* playhead */}
            <div style={{ position: "absolute", left: laneW * play, top: -12, width: 4, height: lanesH + 4, background: c.accent, opacity: fill, borderRadius: 2 }}>
              <div style={{ position: "absolute", left: -8, top: -8, width: 20, height: 20, borderRadius: 6, background: c.accent }} />
            </div>
          </div>
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
