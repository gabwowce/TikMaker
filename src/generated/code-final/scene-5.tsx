import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import {
  CARD,
  clamp,
  COMMANDS,
  EASE_BOUNCE,
  FileIcon,
  Headline,
  popScale,
  prog,
  SlotList,
  Sticker,
  Terminal,
} from "./shared";

export const description =
  "Slot 3 fills with Plan mode; the Shift and Tab keys press down, a numbered plan unfolds in the terminal and the files beside it stay locked with padlocks";

export const schema = z.object({
  pill: field.text("Strip", "COMMAND 03"),
  headline: field.text("Headline (*word* – key word)", "*Plan* before edits"),
  slotName: field.text("Slot name", "Plan mode"),
  step1: field.text("Plan step 1", "Read src/auth/session.ts"),
  step2: field.text("Plan step 2", "Add a refresh-token check"),
  step3: field.text("Plan step 3", "Update tests/auth.test.ts"),
  step4: field.text("Plan step 4", "Run npm test"),
  sticker: field.text("Sticker", "0 FILES TOUCHED"),
  slotOn: field.word("Slot fills on", "plan"),
  shiftOn: field.word("Shift pressed on", "Shift"),
  tabOn: field.word("Tab pressed on", "Tab"),
  touchedOn: field.word("Sticker on", "touched"),
  happyOn: field.word("'Yes' lights on", "happy"),
});
type Params = z.infer<typeof schema>;

const RECT = { x: 90, y: 632, w: 900, h: 432 };
const LOCKED = ["session.ts", "Navbar.tsx", "auth.test.ts"];

function Key({ label, w, down, show }: { label: string; w: number; down: number; show: number }) {
  const c = useBrand();
  return (
    <div
      style={{
        width: w,
        height: 100,
        borderRadius: 22,
        background: down > 0.5 ? c.accent : "#1E1E25",
        color: down > 0.5 ? c.bg : c.text,
        border: "1px solid rgba(255,255,255,0.16)",
        boxShadow: `0 ${12 - down * 9}px 0 ${down > 0.5 ? "#9A3F10" : "#0A0A0D"}, 0 24px 40px rgba(0,0,0,0.5)`,
        translate: `0px ${down * 9}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: c.fontStrong,
        fontSize: 48,
        paddingTop: 6,
        boxSizing: "border-box",
        opacity: show,
        scale: `${interpolate(show, [0, 1], [0.7, 1])}`,
      }}
    >
      {label}
    </div>
  );
}

function Padlock({ size, locked }: { size: number; locked: number }) {
  const c = useBrand();
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 40 48">
      <path
        d={`M11 ${22 - locked * 0} V14 A9 9 0 0 1 29 14 V${22 - (1 - locked) * 8}`}
        fill="none"
        stroke={c.text}
        strokeWidth={5}
        strokeLinecap="round"
        style={{ translate: `0px ${(1 - locked) * -6}px` }}
      />
      <rect x={4} y={21} width={32} height={25} rx={6} fill={c.accent} />
      <circle cx={20} cy={32} r={3.5} fill={c.bg} />
    </svg>
  );
}

export default function Scene5({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const slotAt = wordFrame(words, params.slotOn, 9) - 3;
  const pressAt = wordFrame(words, "Press", 28) - 3;
  const shiftAt = wordFrame(words, params.shiftOn, 38) - 2;
  const tabAt = wordFrame(words, params.tabOn, 47) - 2;
  const planAt = wordFrame(words, "plan", 103, 4) - 3; // the second "plan"
  const touchedAt = wordFrame(words, params.touchedOn, 169) - 3;
  const untilAt = wordFrame(words, "until", 178) - 3;
  const happyAt = wordFrame(words, params.happyOn, 197) - 2;
  const releaseAt = tabAt + 10;

  const shiftDown = prog(frame, shiftAt, 3) * (1 - prog(frame, releaseAt, 4));
  const tabDown = prog(frame, tabAt, 3) * (1 - prog(frame, releaseAt, 4));
  const keysIn = prog(frame, pressAt, 10, EASE_BOUNCE) * (1 - prog(frame, touchedAt - 5, 6));
  const modeOn = prog(frame, tabAt, 8);

  // the terminal of scene 4 makes room for the keys
  const m = prog(frame, 0, 16);
  const rect = {
    x: CARD.x,
    y: CARD.y + (RECT.y - CARD.y) * m,
    w: CARD.w,
    h: CARD.h + (RECT.h - CARD.h) * m,
  };
  const steps = [params.step1, params.step2, params.step3, params.step4];
  const shake = frame > touchedAt && frame < touchedAt + 14 ? Math.sin(frame * 2.4) * 8 : 0;
  const ask = prog(frame, untilAt, 8);
  const yes = prog(frame, happyAt, 6);
  const float = Math.sin(frame / 22) * 6;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);

  return (
    <AbsoluteFill>
      <Headline pill={params.pill} text={params.headline} />

      <SlotList
        from="compact"
        to="compact"
        t={0}
        fill={[1, 1, prog(frame, slotAt, 10)]}
        names={[COMMANDS[0].name, COMMANDS[1].name, params.slotName]}
        active={2}
      />

      <div style={{ position: "absolute", inset: 0, translate: `0px ${float}px`, scale: `${push}` }}>
        {/* the keys */}
        <div
          style={{
            position: "absolute",
            left: 90,
            width: 900,
            top: 510,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 28,
          }}
        >
          <Key label="⇧ Shift" w={330} down={shiftDown} show={keysIn} />
          <div style={{ fontFamily: c.fontStrong, fontSize: 56, color: c.textSoft, opacity: keysIn }}>+</div>
          <Key label="Tab ⇥" w={250} down={tabDown} show={keysIn} />
        </div>

        <Terminal rect={rect} right={
          <div
            style={{
              fontFamily: MONO,
              fontSize: 24,
              fontWeight: 700,
              color: c.bg,
              background: c.accent,
              borderRadius: 8,
              padding: "4px 12px",
              opacity: modeOn,
              scale: `${popScale(frame, tabAt, 0.6)}`,
              whiteSpace: "nowrap",
            }}
          >
            ● plan mode on
          </div>
        }>
          <div style={{ position: "absolute", inset: 0, display: "flex" }}>
            {/* the plan */}
            <div style={{ flex: 1, padding: "22px 30px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 28,
                  color: c.textSoft,
                  height: 44,
                  opacity: prog(frame, tabAt + 8, 8),
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: c.accent }}>●</span>{" "}
                {frame < planAt - 4
                  ? `Thinking${".".repeat(1 + (Math.floor(frame / 8) % 3))}`
                  : "Here is my plan:"}
              </div>
              {steps.map((s, i) => {
                const p = prog(frame, planAt + i * 6, 9);
                return (
                  <div
                    key={i}
                    style={{
                      height: 48,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      fontFamily: MONO,
                      fontSize: 28,
                      color: c.text,
                      whiteSpace: "nowrap",
                      opacity: p,
                      translate: `${(1 - p) * -30}px 0px`,
                    }}
                  >
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "rgba(255,112,36,0.18)",
                        color: c.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    {s}
                  </div>
                );
              })}
              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontFamily: MONO,
                  fontSize: 28,
                  color: c.text,
                  opacity: ask,
                  translate: `0px ${(1 - ask) * 16}px`,
                  whiteSpace: "nowrap",
                }}
              >
                Approve plan?
                <span
                  style={{
                    padding: "6px 18px",
                    borderRadius: 10,
                    background: yes > 0.5 ? c.accent : "rgba(255,255,255,0.1)",
                    color: yes > 0.5 ? c.bg : c.text,
                    fontWeight: 700,
                    scale: `${1 + yes * 0.06 * Math.abs(Math.sin(frame / 7))}`,
                  }}
                >
                  Yes
                </span>
                <span style={{ padding: "6px 18px", borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>
                  No
                </span>
              </div>
            </div>
            {/* the files, locked */}
            <div
              style={{
                width: 280,
                borderLeft: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 14,
                padding: "0 18px",
              }}
            >
              {LOCKED.map((n, i) => {
                const lock = prog(frame, tabAt + 4 + i * 4, 8, EASE_BOUNCE);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      height: 90,
                      translate: `${shake * (i % 2 ? -1 : 1)}px 0px`,
                    }}
                  >
                    <div style={{ position: "relative" }}>
                      <FileIcon size={64} />
                      <div style={{ position: "absolute", right: -16, bottom: -8, scale: `${lock}` }}>
                        <Padlock size={34} locked={lock} />
                      </div>
                    </div>
                    <div
                      style={{
                        marginLeft: 10,
                        fontFamily: MONO,
                        fontSize: 21,
                        color: c.textSoft,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {n}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Terminal>
      </div>

      <Sticker text={params.sticker} at={touchedAt} rotate={-6} size={52} style={{ left: 250, top: 522 }} />
    </AbsoluteFill>
  );
}
