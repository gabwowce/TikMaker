import { z } from "zod";

// The agent asks when it does not know (docs/pokalbis-planas.md, 3.2). The
// steps that decide what the video says – the template, the script, the
// blocks – may answer with questions instead of guessing a fact, and with the
// assumptions they made where they did not ask. A leaf module (no other run
// file), so every step's schema can take these fields.

// One question as the model writes it; the run adds an id and the answer
// (agentQuestion, 7-chat.ts).
export const questionFromAi = z.object({
  question: z.string().trim().min(5).max(200),
  // what depends on the answer
  why: z.string().trim().min(5).max(200),
  // 2–4 short answers to pick from, when the answer can be one of a few
  options: z.array(z.string().trim().min(1).max(60)).max(4).optional(),
});

// The fields a step's answer may carry.
export const askingFromAi = {
  // only when the answer would change the video and nothing given says it
  questions: z.array(questionFromAi).max(3).optional(),
  // what the step decided by itself where it could have asked
  assumptions: z.array(z.string().trim().min(5).max(200)).max(3).optional(),
};

// The steps that may ask (their names in the run's log).
export const askingSteps = [
  "checkValue",
  "pickTemplate",
  "writeScript",
] as const;
export type AskingStep = (typeof askingSteps)[number];
export type QuestionFromAi = z.infer<typeof questionFromAi>;
export type Asking = {
  questions?: QuestionFromAi[];
  assumptions?: string[];
};
