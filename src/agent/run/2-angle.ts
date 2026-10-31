import { z } from "zod";
import type { RunStatus } from "./status";

// 2 Angle — how the video is told: first a template, then the opening line
// (hook). For each: what the model sends (…FromAi), what the user sends
// (…FromUser) and what is kept in the run's file (…InRun).

// ── Template ─────────────────────────────────────────────────────────────

// The model's pick: a template for the idea, how well it fits (1–5) and why.
export const templateFromAi = z.object({
  videoTemplateId: z.string().min(1),
  score: z.number().int().min(1).max(5),
  reason: z.string().min(1),
});
// Below this score nothing in the knowledge base really fits the idea (FR-05).
export const MIN_FIT_SCORE = 3;

// "Change": the user goes on with another template.
export const changeTemplateFromUser = z.object({
  runId: z.string().min(1),
  videoTemplateId: z.string().min(1),
});

export const TEMPLATE_CHANGEABLE: RunStatus[] = ["awaiting_hook"];
// The template the run goes on with: the model's pick, or the user's own
// choice (form or "Change"), which has no score or reason.
export const templateInRun = templateFromAi
  .partial({ score: true, reason: true })
  .extend({ pickedBy: z.enum(["agent", "user"]).default("agent") });

// ── Hook ─────────────────────────────────────────────────────────────────

// One opening line the model proposes (it sends three): the text, the
// knowledge-base formula it follows (null = its own idea) and how strong it
// is (1–5).
export const hookFromAi = z.object({
  text: z.string().trim().min(1).max(150),
  formulaId: z.string().min(1).nullable(),
  score: z.number().int().min(1).max(5),
});

// The user's pick: one of the three by number, or their own text (FR-07).
export const chooseHookFromUser = z.union([
  z.object({
    runId: z.string().min(1),
    hookIndex: z.number().int().min(0).max(2),
  }),
  z.object({
    runId: z.string().min(1),
    text: z.string().trim().min(1).max(150),
  }),
]);

// The hook the video opens with: one of the three, or the user's own text.
export const hookInRun = z.object({
  text: z.string().trim().min(1).max(150),
  formulaId: z.string().min(1).nullable().optional(),
  pickedBy: z.enum(["agent", "user"]),
});

export type TemplateFromAi = z.infer<typeof templateFromAi>;
export type TemplateInRun = z.infer<typeof templateInRun>;
export type HookFromAi = z.infer<typeof hookFromAi>;
export type HookInRun = z.infer<typeof hookInRun>;
export type ChooseHookFromUser = z.infer<typeof chooseHookFromUser>;
