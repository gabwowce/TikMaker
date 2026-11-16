import { z } from "zod";
import { transitionPresetSchema } from "../../schema/capabilities";

// 5 Pictures – the pictures as code (docs/tikmaker-kryptis.md, "Kaip veiks").
// Claude Code writes every scene's picture as a Remotion component
// (src/generated/<project>/scene-N.tsx) by the skills, checks that it compiles
// and renders, and answers what it made. The editor turns the scenes into
// code scenes (projectFromCode); the agent never writes the project itself.

// Where the scene's captions go: "top" – the picture on top, the captions
// below (most scenes); "full" – a full-screen picture (a recording), the
// captions over its lower part.
export const codeStage = z.enum(["top", "full"]);

// The sound effects a scene asks for: which kind, on which spoken word. The
// project puts them on the timeline as clips from the library
// (src/agent/soundCues.ts) – the creator edits them like any other clip.
export const soundKind = z.enum([
  "whoosh",
  "slide",
  "pop",
  "enter",
  "ping",
  "tick",
  "count",
  "success",
  "fix",
  "break",
  "type",
  "message",
  "reveal",
  "check",
]);
export const soundCue = z.object({
  onWord: z.string().trim().min(1),
  sound: soundKind,
});

// What Claude Code says about each scene it wrote.
export const codeSceneFromAi = z.object({
  sceneIndex: z.number().int().min(0),
  // what the viewer sees, in one sentence
  description: z.string().trim().min(5).max(300),
  stage: codeStage.optional(),
  // 0–2 sound effects on the scene's key moments
  sounds: z.array(soundCue).max(3).optional(),
  // how this scene comes in from the one before (the video draws both during
  // the change); unset – a cut
  transition: transitionPresetSchema.optional(),
});

export const codeFromAi = z.object({
  scenes: z.array(codeSceneFromAi),
  // words of the voiceover the captions draw bold
  keywords: z.array(z.string().trim().min(1)).max(24),
  // what it wanted but the kit or the library lacks (a logo, a photo…)
  wishes: z.array(z.string().trim().min(3)).max(10),
});

// One scene in the run's file.
export const codeSceneInRun = z.object({
  // under src/generated/: "<project>/scene-N.tsx"
  file: z.string(),
  description: z.string(),
  stage: codeStage.optional(),
  sounds: z.array(soundCue).optional(),
  transition: transitionPresetSchema.optional(),
  // how many times the scene's code was written (1 – the first); the older
  // versions are kept (server/agent/codeVersions.ts)
  version: z.number().int().min(1).default(1),
  // the code did not compile or render: the scene shows a plain fallback
  error: z.string().optional(),
  // every version written before this one: what it showed and what the
  // change to the next one asked for (Undo goes back one)
  history: z
    .array(
      z.object({
        version: z.number().int().min(1),
        description: z.string(),
        // the change asked for that replaced it (a message, the review)
        changedBy: z.string().optional(),
      }),
    )
    .optional(),
});

export const codeInRun = z.object({
  scenes: z.array(codeSceneInRun),
  keywords: z.array(z.string()),
  wishes: z.array(z.string()),
  // what the checks still found (compile errors, missing files)
  problems: z.array(z.string()),
});

export type SoundKind = z.infer<typeof soundKind>;
export type SoundCue = z.infer<typeof soundCue>;
export type CodeStage = z.infer<typeof codeStage>;
export type CodeSceneFromAi = z.infer<typeof codeSceneFromAi>;
export type CodeFromAi = z.infer<typeof codeFromAi>;
export type CodeSceneInRun = z.infer<typeof codeSceneInRun>;
export type CodeInRun = z.infer<typeof codeInRun>;

// The folder a run's scenes are written in (under src/generated/): the
// project's id, made safe for a folder and an import path.
export function codeFolder(projectId: string): string {
  return projectId.replace(/[^\w-]/g, "-");
}
export function codeFile(projectId: string, n: number): string {
  return `${codeFolder(projectId)}/scene-${n + 1}.tsx`;
}
