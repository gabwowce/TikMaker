import { z } from "zod";
import { askingFromAi } from "./asking";
import type { RunStatus } from "./status";

// 2 Angle — how the video is told: first a template, then the opening line
// (hook). For each: what the model sends (…FromAi), what the user sends
// (…FromUser) and what is kept in the run's file (…InRun).

// ── Value ────────────────────────────────────────────────────────────────

// Before anything is written: is this idea worth a video on this channel
// (workspace.direction / offTopic)? A weak or off-channel idea makes the
// agent ask the creator for what would carry it – a real project, a result,
// their own test – instead of writing an empty video. The check also writes
// the idea again as the video will tell it (`idea`): that text, not the
// creator's form, is what every later step works from (videoIdea).
export const valueVerdict = z.enum(["strong", "weak", "off_channel"]);

export const valueFromAi = z.object({
  ...askingFromAi,
  verdict: valueVerdict,
  // One or two sentences for the creator, in plain English.
  reason: z.string().trim().min(1).max(300),
  // The idea as the video will tell it: the creator's idea, sharpened – what
  // makes a scroller stop, what the viewer walks away with, the creator's
  // answers worked in. Same topic; nothing made up.
  idea: z.string().trim().min(20).max(2000),
});

// In the run's file. `idea` is unset in runs made before the check wrote it
// (they had wow / takeaway instead, now ignored): videoIdea then falls back
// to the creator's own idea.
export const valueInRun = valueFromAi
  .omit({ questions: true, assumptions: true })
  .extend({ idea: valueFromAi.shape.idea.optional() });

// The idea every step after the value check works from: the checked one, or
// the creator's own when there is none (older runs, a check not run yet).
export function videoIdea(run: {
  input: { idea: string };
  value?: { idea?: string };
}): string {
  return run.value?.idea ?? run.input.idea;
}

// ── Template ─────────────────────────────────────────────────────────────

// The model's pick: a template for the idea, how well it fits (1–5) and why.
// It never asks the creator: the questions belong to the value check before it.
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

export type ValueFromAi = z.infer<typeof valueFromAi>;
export type ValueInRun = z.infer<typeof valueInRun>;
export type TemplateFromAi = z.infer<typeof templateFromAi>;
export type TemplateInRun = z.infer<typeof templateInRun>;
export type HookFromAi = z.infer<typeof hookFromAi>;
export type HookInRun = z.infer<typeof hookInRun>;
export type ChooseHookFromUser = z.infer<typeof chooseHookFromUser>;
