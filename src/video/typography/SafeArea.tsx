import type { CSSProperties } from "react";
import { safeArea } from "./tokens";
export const safeAreaPadding: CSSProperties = {
  paddingLeft: safeArea.left,
  paddingRight: safeArea.right,
  paddingTop: safeArea.top,
  paddingBottom: safeArea.bottom,
};
type SafeAreaProps = {
  debug?: boolean;
};
export function SafeArea({ debug }: SafeAreaProps) {
  if (!debug) return null;
  return (
    <div className="absolute inset-0 top-[220px] left-[130px] right-[130px] bottom-[500px] [border:2px_dashed_rgba(255,112,36,0.6)] pointer-events-none" />
  );
}
