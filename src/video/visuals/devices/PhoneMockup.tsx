import { type ReactNode } from "react";
type PhoneMockupProps = {
  children: ReactNode;
  scale?: number;
};
export function PhoneMockup({ children, scale = 1 }: PhoneMockupProps) {
  return (
    <div
      className="[aspect-ratio:9_/_19.5] rounded-[48px] p-3.5 bg-[#0b0b0b] [box-shadow:0_40px_80px_rgba(0,0,0,0.5)] [border:1px_solid_rgba(255,255,255,0.10)]"
      style={{
        width: 420 * scale,
      }}
    >
      <div className="relative w-full h-full rounded-[34px] overflow-hidden bg-brand-bg">
        {children}
      </div>
    </div>
  );
}
