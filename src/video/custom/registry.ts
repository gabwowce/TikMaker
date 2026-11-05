import type { ComponentType } from "react";

// Scenes drawn for one video only, by name. A project places one as a
// full-frame "custom-scene" layer; everything else about the project – the
// voiceover, timing, captions, sound, the editor – stays the usual TikMaker.
// The first ones (a 3D desk for "AI agents explained") live on the branch
// experiment/3d-desk; see docs/eksperimentai/3d-planas.md.
export const customScenes: Record<string, ComponentType> = {};
