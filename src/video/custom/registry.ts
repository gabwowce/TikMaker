import type { ComponentType } from "react";
import { Anatomy } from "./ai-agent-explained/Anatomy";
import { deskScenes } from "./ai-agent-explained/desk";

// Scenes drawn for one video only, by name. A project places one as a
// full-frame "custom-scene" layer; everything else about the project – the
// voiceover, timing, captions, sound, the editor – stays the usual TikMaker.
export const customScenes: Record<string, ComponentType> = {
  ...deskScenes,
  "ai-agent-explained/anatomy": Anatomy,
};
