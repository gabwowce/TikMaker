import { interpolate, useCurrentFrame } from "remotion";
export function OrangeGlow() {
  const frame = useCurrentFrame();
  const drift = interpolate(Math.sin(frame / 90), [-1, 1], [-40, 40]);
  return (
    <div className="absolute inset-0 bg-[#171717] overflow-hidden">
      <div
        className="absolute top-[30%] w-[900px] h-[900px] ml-[-450px] mt-[-450px] rounded-[50%] [background:radial-gradient(circle,_rgba(255,_112,_36,_0.15)_0%,_rgba(255,112,36,0)_70%)]"
        style={{
          left: `calc(50% + ${drift}px)`,
        }}
      />
    </div>
  );
}
