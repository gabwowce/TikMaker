import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  Background,
  Camera,
  clamp,
  COL,
  Dock,
  EASE,
  FileIcon,
  glass,
  Headline,
  LockIcon,
  pop,
  prog,
  SHOT,
  SideShot,
  TerminalCard,
} from "./shared";

export const description =
  "Plan mode fills slot 3; big Shift and Tab keys press down, then a Claude Code window unfolds a numbered plan while the files below stay padlocked";

export const schema = z.object({
  headline: field.text("Headline (*word* – key word)", "*Plan* mode"),
  step1: field.text("Plan step 1", "Read auth.ts"),
  step2: field.text("Plan step 2", "Add a token check"),
  step3: field.text("Plan step 3", "Update the tests"),
  step4: field.text("Plan step 4", "Run the build"),
  file1: field.text("File 1", "auth.ts"),
  file2: field.text("File 2", "api.ts"),
  file3: field.text("File 3", "tests.ts"),
  slotOn: field.word("Slot 3 fills on", "plan"),
  shiftOn: field.word("Shift pressed on", "Shift"),
  tabOn: field.word("Tab pressed on", "Tab"),
  planOn: field.word("Plan appears on", "shows"),
  lockOn: field.word("Locks snap on", "touched"),
  happyOn: field.word("Approve lights up on", "happy"),
});
type Params = z.infer<typeof schema>;

const CARD_W = 880;
const CARD_TOP = 372;
const CARD_H = 578;
const AMBER_TEXT = "#ffc35c";

function Pause({ size, color }: { size: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: size * 0.2, height: size * 0.8 }}>
      <div style={{ width: size * 0.22, height: "100%", borderRadius: 3, background: color }} />
      <div style={{ width: size * 0.22, height: "100%", borderRadius: 3, background: color }} />
    </div>
  );
}

function Key({ label, width, down, glow }: { label: string; width: number; down: number; glow: number }) {
  const c = useBrand();
  return (
    <div style={{ position: "relative", width, height: 190 }}>
      {/* the key's side */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 22, bottom: 0, borderRadius: 40, background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.1)" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: down * 18,
          height: 168,
          ...glass(false, 40),
          background: `linear-gradient(180deg, rgba(255,255,255,${0.16 + glow * 0.08}), rgba(255,255,255,0.06))`,
          border: `2px solid ${glow > 0.1 ? COL.amber : "rgba(255,255,255,0.2)"}`,
          boxShadow: `0 ${18 - down * 14}px ${40 - down * 24}px rgba(0,0,0,0.5), 0 0 ${glow * 70}px ${COL.amber}88`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: c.fontUi,
          fontWeight: 800,
          fontSize: 74,
          color: glow > 0.1 ? AMBER_TEXT : "#fff",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const slotAt = wordFrame(words, params.slotOn, 9) - 3;
  const shiftAt = wordFrame(words, params.shiftOn, 38) - 2;
  const tabAt = wordFrame(words, params.tabOn, 47) - 2;
  const planAt = wordFrame(words, params.planOn, 75) - 6;
  const stepsAt = wordFrame(words, "plan", 103, 5) - 8;
  const filesAt = wordFrame(words, "Not", 122) - 2;
  const lockAt = wordFrame(words, params.lockOn, 169) - 3;
  const happyAt = wordFrame(words, params.happyOn, 197) - 3;

  // keys: Shift held from its word, Tab tapped
  const shiftDown = interpolate(frame, [shiftAt, shiftAt + 3, planAt], [0, 1, 1], clamp) * (1 - prog(frame, tabAt + 8, 6));
  const tabDown = interpolate(frame, [tabAt, tabAt + 3, tabAt + 8, tabAt + 12], [0, 1, 1, 0], clamp);
  const modeOn = Math.min(pop(frame, tabAt + 2, 12, 180), 1.08);

  // the keys leave upward as the plan card rises from below
  const swap = interpolate(frame, [planAt, planAt + 16], [0, 1], { ...clamp, easing: EASE });
  const cardIn = interpolate(frame, [planAt + 2, planAt + 18], [0, 1], { ...clamp, easing: EASE });
  const cardScale = interpolate(frame, [planAt + 2, planAt + 12, planAt + 18], [0.8, 1.03, 1], clamp);

  const steps = [params.step1, params.step2, params.step3, params.step4];
  const files = [params.file1, params.file2, params.file3];
  const lockSnap = interpolate(frame, [lockAt, lockAt + 4], [1, 0], clamp);
  const lockPunch = interpolate(frame, [lockAt, lockAt + 3, lockAt + 10], [1, 1.2, 1], clamp);
  const approve = prog(frame, happyAt, 8);
  const float = Math.sin(frame / 14) * 7;

  return (
    <AbsoluteFill>
      <Background color={COL.amber} y={640}>
        <SideShot src={SHOT.workflows} side="left" y={420} />
        <SideShot src={SHOT.checkpointing} side="right" y={640} />
      </Background>
      <Camera duration={durationInFrames} punchAt={lockAt}>
        <Headline line1={params.headline} color={AMBER_TEXT} start={slotAt - 6} size={100} top={214} />

        {/* phase 1: Shift + Tab */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 440,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 46,
            opacity: 1 - swap,
            translate: `0px ${-swap * 160 + float}px`,
            scale: `${1 - swap * 0.3}`,
            transform: `perspective(1200px) rotateX(${12 - swap * 6}deg)`,
          }}
        >
          <div style={{ display: "flex", gap: 34, alignItems: "flex-end" }}>
            <Key label="⇧ Shift" width={430} down={shiftDown} glow={shiftDown} />
            <Key label="Tab ⇥" width={320} down={tabDown} glow={Math.max(tabDown, modeOn * 0.4)} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "18px 36px",
              borderRadius: 50,
              background: "rgba(245,165,36,0.18)",
              border: `2px solid ${COL.amber}`,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 42,
              color: AMBER_TEXT,
              opacity: Math.min(modeOn, 1),
              scale: `${interpolate(modeOn, [0, 1], [0.5, 1])}`,
            }}
          >
            <Pause size={34} color={AMBER_TEXT} />
            plan mode on
          </div>
        </div>

        {/* phase 2: the plan */}
        <div
          style={{
            position: "absolute",
            left: (1080 - CARD_W) / 2,
            top: CARD_TOP,
            width: CARD_W,
            height: CARD_H,
            opacity: cardIn > 0 ? 1 : 0,
            translate: `0px ${(1 - cardIn) * 480 + float * cardIn}px`,
            scale: `${cardScale}`,
            transform: `perspective(1200px) rotateX(${(1 - cardIn) * 14}deg) rotateY(${(1 - cardIn) * -10 + Math.sin(frame / 34) * 1.2}deg)`,
          }}
        >
          <TerminalCard
            height={CARD_H}
            right={
              <div
                style={{
                  padding: "8px 20px",
                  borderRadius: 30,
                  background: approve > 0.5 ? COL.green : "rgba(245,165,36,0.2)",
                  border: `2px solid ${approve > 0.5 ? COL.green : COL.amber}`,
                  color: approve > 0.5 ? "#fff" : AMBER_TEXT,
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 28,
                  boxShadow: approve > 0.5 ? `0 0 ${30 + Math.sin(frame / 5) * 12}px ${COL.green}` : "none",
                  scale: `${interpolate(frame, [happyAt, happyAt + 3, happyAt + 10], [1, 1.15, 1], clamp)}`,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {approve > 0.5 ? "✓ approve" : <><Pause size={24} color={AMBER_TEXT} />plan mode</>}
                </span>
              </div>
            }
          >
            <div style={{ position: "absolute", left: 44, top: 22, display: "flex", flexDirection: "column", gap: 4 }}>
              {steps.map((s, i) => {
                const p = prog(frame, stepsAt + i * 5, 12);
                return (
                  <div
                    key={i}
                    style={{
                      height: 68,
                      display: "flex",
                      alignItems: "center",
                      gap: 24,
                      opacity: p,
                      translate: `${(1 - p) * 40}px 0px`,
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        background: COL.amber,
                        color: "#1b1206",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: c.fontUi,
                        fontWeight: 800,
                        fontSize: 30,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ fontFamily: c.fontUi, fontWeight: 700, fontSize: 44, color: "#fff" }}>{s}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ position: "absolute", left: 30, right: 30, top: 322, height: 1.5, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ position: "absolute", left: 30, top: 348, display: "flex", gap: 16 }}>
              {files.map((f, i) => {
                const show = Math.min(pop(frame, filesAt + i * 3, 13, 180), 1.06);
                const lock = Math.min(pop(frame, lockAt - 6 + i * 2, 11, 200), 1.1);
                return (
                  <div
                    key={i}
                    style={{
                      width: 262,
                      height: 104,
                      borderRadius: 26,
                      boxSizing: "border-box",
                      background: "rgba(255,255,255,0.06)",
                      border: `2px solid ${lock > 0.5 ? "rgba(245,165,36,0.6)" : "rgba(255,255,255,0.1)"}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "0 18px",
                      position: "relative",
                      opacity: Math.min(1, show),
                      scale: `${interpolate(show, [0, 1], [0.6, 1])}`,
                    }}
                  >
                    <FileIcon size={44} color="rgba(255,255,255,0.7)" />
                    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, color: "#fff" }}>{f}</div>
                    <div
                      style={{
                        position: "absolute",
                        right: -14,
                        top: -24,
                        width: 62,
                        height: 62,
                        borderRadius: 20,
                        background: COL.amber,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 8px 20px rgba(0,0,0,0.4), 0 0 24px ${COL.amber}88`,
                        scale: `${lock * lockPunch}`,
                      }}
                    >
                      <LockIcon size={36} color="#1b1206" open={lockSnap} />
                    </div>
                  </div>
                );
              })}
            </div>
          </TerminalCard>
        </div>

        <Dock fill={[1, 1, Math.min(pop(frame, slotAt, 12, 180), 1.08)]} active={frame >= slotAt ? 2 : 1} />
      </Camera>
    </AbsoluteFill>
  );
}
