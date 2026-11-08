import { z } from "zod";
import { visualStyleId } from "../visualStyles";

// 1 Idea — what the user fills in before pressing Start (FR-03).
export const ideaFromUser = z.object({
  idea: z.string().trim().min(20).max(2000),
  workspaceId: z.string().min(1),
  targetSeconds: z.number().int().min(15).max(90).default(40),
  motionOnly: z.boolean().default(false),
  // Someone appears on camera; off = a faceless video, so the agent never
  // proposes a talking head (docs/bd/sprendimai.md).
  withFace: z.boolean().default(false),
  generateVoice: z.boolean().default(false),
  // How the pictures look (src/agent/visualStyles.ts); runs made before the
  // choice existed are "clear".
  visualStyle: visualStyleId.default("clear"),
  // A template chosen in the form; unset = the agent picks one (FR-03, FR-04).
  videoTemplateId: z.string().min(1).optional(),
  // The user's own opening line; unset = the agent proposes three (FR-07).
  hook: z.string().trim().min(1).max(150).optional(),
});

// The Start button: which project, and the form.
export const startFromUser = z.object({
  projectId: z.string().min(1),
  input: ideaFromUser,
});

export type IdeaFromUser = z.infer<typeof ideaFromUser>;
