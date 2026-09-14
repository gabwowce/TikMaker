import { type ReactNode } from "react";
import {
  DEFAULT_SCREEN_ASPECT,
  screenFrameSize,
  type ScreenAspect,
} from "./screenFrameSize";

type ScreenFrameProps = {
  children: ReactNode;
  aspect?: ScreenAspect;
  scale?: number;
};
export function ScreenFrame({
  children,
  aspect = DEFAULT_SCREEN_ASPECT,
  scale = 1,
}: ScreenFrameProps) {
  const { width, height } = screenFrameSize(aspect);
  return (
    <div
      className="rounded-[24px] overflow-hidden bg-[#171717] [box-shadow:0_40px_80px_rgba(0,0,0,0.45)] [border:1px_solid_rgba(255,255,255,0.10)] relative"
      style={{
        width: width * scale,
        height: height * scale,
      }}
    >
      {children}
    </div>
  );
}
