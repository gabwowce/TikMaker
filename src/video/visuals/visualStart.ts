import { createContext, useContext } from "react";
import { useCurrentFrame } from "remotion";

// The scene frame a visual layer appears on (its entrance delay). Visuals that
// animate themselves (a line drawing on) count from here, so they start when
// the layer shows up, not when the scene starts.
export const VisualStartContext = createContext(0);

// Frames since this visual's layer appeared (negative before that).
export function useVisualFrame(): number {
  return useCurrentFrame() - useContext(VisualStartContext);
}
