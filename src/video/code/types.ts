import type { ComponentType } from "react";
import type { z } from "zod";

// What a code scene is (docs/tikmaker-kryptis.md, "Kaip veiks"): the agent
// writes the scene's picture as a React component in
// src/generated/<project>/scene-N.tsx. The editor's Player and the Remotion
// render load it, the voice and the captions stay the project's.

// One spoken word of the scene, in frames from the scene's own start.
export type SceneWord = { text: string; frame: number; endFrame: number };

// What every code scene gets. It draws ONLY the picture: the backdrop is
// already there, and the captions are drawn over it in the scene's caption
// band (src/video/brand: CAPTION_TOP…CAPTION_BOTTOM for stage "top").
export type CodeSceneProps<P = Record<string, unknown>> = {
  index: number; // the scene's number in the video, from 0
  durationInFrames: number;
  voiceover: string;
  words: SceneWord[];
  // The editable fields (the module's `schema`) with the values from the
  // project – the schema's defaults where the creator changed nothing.
  params: P;
};

// What a scene file exports: the component (default) and, optionally, the
// fields that may be changed without touching the code (a Zod object whose
// every field has a default) and a one-line description of the picture.
export type CodeSceneModule = {
  default: ComponentType<CodeSceneProps<any>>;
  schema?: z.ZodObject<z.ZodRawShape>;
  description?: string;
};
