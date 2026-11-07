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
  // Whether the script needs facts from outside the idea (prices, numbers,
  // news, how another company's tool works) looked up online first. False
  // when the idea – or the channel's own product – gives everything: the
  // search is the run's most expensive call (~18k tokens in test 10).
  needsFacts: z.boolean(),
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
  // a template chosen in the form says nothing about facts: they are looked
  // up, as before
  .partial({ score: true, reason: true, needsFacts: true })
  .extend({ pickedBy: z.enum(["agent", "user"]).default("agent") });

// ── Hook ─────────────────────────────────────────────────────────────────

// One opening line the model proposes (it sends three): the text, the
// knowledge-base formula it follows (null = its own idea) and how strong it
// is (1–5).
// The creative angle a hook takes – the three hooks for an idea take three
// different ones, and knowing which one was picked lets us see later which
// kind works best.
export const hookAngle = z.enum([
  "curiosity",
  "outcome",
  "surprise",
  "problem",
  "demonstration",
]);

export const hookFromAi = z.object({
  text: z.string().trim().min(1).max(150),
  // What the viewer SEES in the first two seconds, under the line – a picture,
  // never the words alone (in 88 analysed videos the first frame is almost
  // always a person, the product working, the result or a striking image).
  // Unset only in runs made before it existed.
  firstFrame: z.string().trim().min(10).max(200).optional(),
  // Unset only in runs made before it existed.
  angle: hookAngle.optional(),
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
  // The picked hook's first frame; the user's own line has none – the script
  // then decides what it shows.
  firstFrame: z.string().trim().min(1).max(200).optional(),
  formulaId: z.string().min(1).nullable().optional(),
  pickedBy: z.enum(["agent", "user"]),
});

export type TemplateFromAi = z.infer<typeof templateFromAi>;
export type TemplateInRun = z.infer<typeof templateInRun>;
export type HookFromAi = z.infer<typeof hookFromAi>;
export type HookInRun = z.infer<typeof hookInRun>;
export type ChooseHookFromUser = z.infer<typeof chooseHookFromUser>;
