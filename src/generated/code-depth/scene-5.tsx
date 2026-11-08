import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { Backdrop, Camera, CL, Check, Dock, DOCK_LABELS, FileIcon, glass, Headline, HUE, LockIcon, TiltCard, ramp, usePop } from "./shared";

export const description =
  "Slot 3 fills with Plan mode; big Shift and Tab keys press down, then a numbered plan card unfolds while three file tiles beside it lock with padlocks";

export const schema = z.object({
  label: field.text("Slot 3 label", "Plan mode"),
  title1: field.text("Headline 2", "Plan *first*"),
  title2: field.text("Headline 3", "*0* files touched"),
  title3: field.text("Headline 4", "You *approve*"),
  planTitle: field.text("Plan card title", "Plan"),
  steps: field.number("Plan steps", 4, { min: 2, max: 5 }),
  button: field.text("Button", "Approve"),
  planOn: field.word("Plan card arrives on", "shows"),
  lockOn: field.word("Files lock on", "single"),
  approveOn: field.word("Button lights on", "happy"),
});
type Params = z.infer<typeof schema>;

function Key({ label, width, press, at }: { label: string; width: number; press: number; at: number }) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const e = ramp(frame, at, 14);
  const d = press * 18;
  return (
    <div style={{ position: "relative", width, height: 190, opacity: e, transform: `translateY(${(1 - e) * 200}px)` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 22, height: 168, borderRadius: 36, background: "rgba(0,0,0,0.55)" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: d,
          height: 168,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: c.fontStrong,
          fontSize: 64,
          color: "#fff",
          ...glass(width, {
            borderRadius: 36,
            background: press > 0.3 ? `${HUE.violet}aa` : "linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))",
            boxShadow: press > 0.3 ? `0 0 60px ${HUE.violet}` : `0 ${22 - d}px 0 rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.5)`,
          }),
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function Scene5({ words, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();
  const pop = usePop();
  const thirdAt = wordFrame(words, "Third", 0);
  const modeAt = wordFrame(words, "mode", 19);
  const shiftAt = wordFrame(words, "Shift", 38);
  const tabAt = wordFrame(words, "Tab", 47);
  const planAt = wordFrame(words, params.planOn, 75);
  const stepsAt = wordFrame(words, "plan", 103, 6);
  const notAt = wordFrame(words, "Not", 122);
  const lockAt = wordFrame(words, params.lockOn, 141);
  const okAt = wordFrame(words, params.approveOn, 197);

  // keys press while both are held, then fly away when the plan arrives
  const shiftPress = interpolate(frame, [shiftAt - 2, shiftAt + 2, planAt - 10, planAt - 4], [0, 1, 1, 0], CL);
  const tabPress = interpolate(frame, [tabAt - 2, tabAt + 2, tabAt + 10, tabAt + 14], [0, 1, 1, 0], CL);
  const keysOut = ramp(frame, planAt - 6, 14);
  const fileIn = (i: number) => pop(frame, notAt + i * 3);
  const okP = pop(frame, okAt - 2);

  const labels = [DOCK_LABELS[0], DOCK_LABELS[1], params.label];
  return (
    <AbsoluteFill>
      <Backdrop hue={HUE.violet} from={HUE.magenta} />
      <Camera enter="push" punches={[tabAt, lockAt]}>
        {/* the keys */}
        {keysOut < 1 ? (
          <div
            style={{
              position: "absolute",
              left: 90,
              right: 90,
              top: 640,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 40,
              perspective: 1200,
              opacity: 1 - keysOut,
              transform: `translateY(${-260 * keysOut}px) scale(${1 - 0.4 * keysOut})`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 40, transform: `rotateX(22deg) rotateY(${Math.sin(frame / 30) * 6}deg)` }}>
              <Key label="⇧ Shift" width={400} press={shiftPress} at={thirdAt + 2} />
              <div style={{ fontFamily: c.fontStrong, fontSize: 80, color: "rgba(255,255,255,0.7)" }}>+</div>
              <Key label="Tab ⇥" width={290} press={tabPress} at={thirdAt + 6} />
            </div>
          </div>
        ) : null}
        {/* the plan card */}
        {frame >= planAt - 2 ? (
          <TiltCard at={planAt - 2} left={90} top={492} width={620} height={578} ry={14} rx={8} flat={ramp(frame, okAt, 16) * 0.8}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "38px 44px 18px" }}>
              <div style={{ width: 20, height: 56, borderRadius: 10, background: HUE.violet, boxShadow: `0 0 24px ${HUE.violet}` }} />
              <div style={{ fontFamily: c.fontStrong, fontSize: 64, color: "#fff" }}>{params.planTitle}</div>
            </div>
            <div style={{ padding: "0 44px", display: "flex", flexDirection: "column", gap: 14 }}>
              {new Array(params.steps).fill(0).map((_, i) => {
                const a = stepsAt - 4 + i * 4;
                const p = ramp(frame, a, 10);
                const np = pop(frame, a + 6);
                const w = [0.85, 0.62, 0.74, 0.5, 0.68][i % 5];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, opacity: p, transform: `translateX(${-40 * (1 - p)}px)` }}>
                    <div
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: 31,
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,255,255,0.9)",
                        color: "#0B0B10",
                        fontFamily: c.fontStrong,
                        fontSize: 34,
                        transform: `scale(${0.6 + 0.4 * np})`,
                      }}
                    >
                      {i + 1}
                    </div>
                    <div style={{ height: 22, width: 400 * w, borderRadius: 11, background: "rgba(255,255,255,0.35)" }} />
                  </div>
                );
              })}
            </div>
            <div
              style={{
                position: "absolute",
                left: 44,
                right: 44,
                bottom: 40,
                height: 96,
                borderRadius: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                fontFamily: c.fontStrong,
                fontSize: 44,
                color: "#fff",
                background: okP > 0.05 ? c.accent : "rgba(255,255,255,0.1)",
                border: "1.5px solid rgba(255,255,255,0.2)",
                boxShadow: okP > 0.05 ? `0 0 50px ${c.accent}99` : "none",
                transform: `scale(${1 + 0.06 * Math.sin(Math.min(1, okP) * Math.PI)})`,
              }}
            >
              {okP > 0.05 ? <Check size={44} draw={Math.min(1, okP)} /> : null}
              {params.button}
            </div>
          </TiltCard>
        ) : null}
        {/* the files beside it, locked */}
        {[0, 1, 2].map((i) => {
          const p = fileIn(i);
          const lp = pop(frame, lockAt + i * 3);
          const fy = Math.sin((frame + i * 20) / 16) * 7;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 760,
                top: 520 + i * 182,
                width: 210,
                height: 160,
                opacity: Math.min(1, p * 1.5),
                transform: `translateY(${fy}px) scale(${0.5 + 0.5 * p}) rotate(${(i - 1) * 4}deg)`,
                ...glass(210, { display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 30 }),
              }}
            >
              <FileIcon size={92} color="rgba(255,255,255,0.75)" />
              <div
                style={{
                  position: "absolute",
                  right: -16,
                  bottom: -16,
                  width: 84,
                  height: 84,
                  borderRadius: 42,
                  background: HUE.violet,
                  boxShadow: `0 0 30px ${HUE.violet}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `scale(${lp})`,
                }}
              >
                <LockIcon size={48} />
              </div>
            </div>
          );
        })}
      </Camera>
      <Dock hue={HUE.violet} filled={2} active={2} moveFrom={1} fillAt={modeAt} labels={labels} />
      <Headline
        lines={[
          { text: `*${params.label}*`, at: wordFrame(words, "plan", 9) },
          { text: params.title1, at: planAt },
          { text: params.title2, at: notAt },
          { text: params.title3, at: okAt },
        ]}
      />
    </AbsoluteFill>
  );
}
