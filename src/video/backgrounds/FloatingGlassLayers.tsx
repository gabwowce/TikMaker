import { interpolate, useCurrentFrame } from "remotion";
type Panel = {
  left: number;
  top: number;
  width: number;
  height: number;
  rotate: number;
  driftX: number;
  driftY: number;
  period: number;
  phase: number;
};
const panels: Panel[] = [
  {
    left: -260,
    top: -180,
    width: 780,
    height: 900,
    rotate: -8,
    driftX: 18,
    driftY: 12,
    period: 340,
    phase: 0,
  },
  {
    left: 560,
    top: 120,
    width: 820,
    height: 1000,
    rotate: 6,
    driftX: -22,
    driftY: 16,
    period: 410,
    phase: 60,
  },
  {
    left: -320,
    top: 980,
    width: 900,
    height: 1000,
    rotate: -5,
    driftX: 14,
    driftY: -18,
    period: 380,
    phase: 130,
  },
  {
    left: 480,
    top: 1300,
    width: 760,
    height: 800,
    rotate: 9,
    driftX: -16,
    driftY: -12,
    period: 300,
    phase: 200,
  },
];
export function FloatingGlassLayers() {
  const frame = useCurrentFrame();
  return (
    <div className="absolute inset-0 bg-brand-bg overflow-hidden">
      {panels.map((panel, i) => {
        const x = interpolate(
          Math.sin((frame + panel.phase) / panel.period),
          [-1, 1],
          [-panel.driftX, panel.driftX],
        );
        const y = interpolate(
          Math.cos((frame + panel.phase) / panel.period),
          [-1, 1],
          [-panel.driftY, panel.driftY],
        );
        return (
          <div
            key={i}
            className="absolute rounded-[48px] [background:linear-gradient(160deg,_rgba(255,255,255,0.05)_0%,_rgba(255,255,255,0.015)_45%,_rgba(255,112,36,0.03)_100%)] [border:1px_solid_rgba(255,255,255,0.06)] [box-shadow:0_0_120px_rgba(0,0,0,0.35)] [backdrop-filter:blur(2px)]"
            style={{
              left: panel.left + x,
              top: panel.top + y,
              width: panel.width,
              height: panel.height,
              transform: `rotate(${panel.rotate}deg)`,
            }}
          />
        );
      })}

      <div className="absolute inset-0 [background:radial-gradient(circle_at_50%_40%,_rgba(0,0,0,0)_0%,_#171717_78%)]" />
    </div>
  );
}
