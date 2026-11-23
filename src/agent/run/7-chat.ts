import { z } from "zod";
import type { RunStatus } from "./status";

// 7 The conversation (docs/pokalbis-planas.md, docs/pokalbis-kodas.md): the
// user writes to the agent while it waits (MESSAGE_STATUSES). The agent
// works out what a message changes (its targets) – from what was selected in
// the editor and from the words – does it, and answers. A change that reaches
// several parts of the video is proposed first; only the "Do it" button on the
// proposal (or a card's own button) ever confirms anything.

// One thing a message changes, and what to do with it.
//   hook      the three hooks, written again (while a hook is being picked,
//             or before the script is approved – then the script goes too)
//   script    the script, written again (before it is approved)
//   pictures  one scene's blocks (after the build)
//   motion    one scene's motion, or the whole video's (after the build)
//   words     one scene's voiceover: new words, a new voice, new pictures on
//             them (after the build)
//   review    the agent renders frames of the built video, looks at them and
//             proposes what to fix (after the build; changes nothing itself)
export const chatTargetKind = z.enum([
  "hook",
  "script",
  "pictures",
  "motion",
  "words",
  "review",
]);
export const chatTarget = z.object({
  kind: chatTargetKind,
  // the scene it is about (its number in the script, from 0)
  sceneIndex: z.number().int().min(0).optional(),
  // a layer of that scene, when one was selected
  objectId: z.string().optional(),
  // what to do, in the agent's words – the user's message split per target
  instruction: z.string().optional(),
});

// What was selected in the editor when the message was sent.
export const chatAttachment = z.object({
  sceneIndex: z.number().int().min(0),
  objectId: z.string().optional(),
  label: z.string().min(1), // as the chip showed it: "Scene 3", "Layer: chat"
});

// A question the agent asks when it does not know something (stage 3).
export const agentQuestion = z.object({
  id: z.string(),
  question: z.string().min(1),
  why: z.string().min(1), // what depends on the answer
  options: z.array(z.string()).max(4).optional(),
  answer: z.string().optional(),
  skipped: z.boolean().optional(), // "decide yourself"
  remember: z.boolean().optional(), // keep it in the channel's knowledge
});

// What the agent proposes before a change that reaches several parts.
export const chatProposal = z.object({
  targets: z.array(chatTarget).min(1),
  // the user's answer, by the buttons only
  decision: z.enum(["yes", "no"]).optional(),
});

// The status of work: a user's message, or an accepted proposal.
export const workStatus = z.enum(["waiting", "working", "done", "error"]);

// The review of the frames (server/agent/prompts/reviewFrames.ts): per scene,
// what the viewer sees, whether it works, and – when it does not – one change
// for the step that can make it.
export const reviewChangeKind = z.enum(["pictures", "words", "motion"]);
export const sceneReviewFromAi = z.object({
  sceneIndex: z.number().int().min(0),
  // what a viewer with the sound off takes from the frame, in one sentence
  sees: z.string().min(1),
  verdict: z.enum(["good", "fix"]),
  problems: z.array(z.string().min(1)).max(3),
  change: z
    .object({ kind: reviewChangeKind, instruction: z.string().min(1) })
    .optional(),
});
export const reviewFromAi = z.object({
  scenes: z.array(sceneReviewFromAi),
});

// A review as the panel shows it (ChatMessages → ReviewView): the round of
// the self-review (unset – asked for in the chat), every scene's verdict, and
// what the agent did next.
export const reviewInMessage = z.object({
  round: z.number().int().min(1).optional(),
  scenes: z.array(sceneReviewFromAi),
  // fixing – the agent fixes the scenes now; stopped – no better than the
  // round before; last – the rounds ran out; proposed – the fixes wait for
  // "Do it"; done – nothing to fix
  next: z.enum(["fixing", "stopped", "last", "proposed", "done"]),
});

// One message of the conversation, the user's or the agent's.
export const chatMessage = z.object({
  id: z.string(),
  at: z.number(),
  from: z.enum(["user", "agent"]),
  text: z.string(),
  attachments: z.array(chatAttachment).optional(),
  // what the work changed (set by the agent when it starts the work)
  targets: z.array(chatTarget).optional(),
  proposal: chatProposal.optional(),
  questions: z.array(agentQuestion).optional(),
  // the step that asked them (a step asks once; asked again it decides)
  askedBy: z.string().optional(),
  // the review of the frames this message reports (the text says it too)
  review: reviewInMessage.optional(),
  // a user's message, or an agent's accepted proposal:
  // waiting → working → done (or error)
  status: workStatus.optional(),
  error: z.string().optional(),
});

// When the user may write: only while the agent waits. While it works the
// message box is locked (the editor) and a message is refused (the server).
export const MESSAGE_STATUSES: RunStatus[] = [
  "awaiting_hook",
  "awaiting_approval",
  "awaiting_answers",
  "done",
];

// What the editor sends: a message…
export const sendMessageFromUser = z.object({
  runId: z.string().min(1),
  text: z.string().trim().min(2).max(1000),
  attachments: z.array(chatAttachment).max(5).optional(),
});
// …the answers to the agent's questions (the questions card)…
export const answerFromUser = z.object({
  runId: z.string().min(1),
  messageId: z.string().min(1),
  answers: z
    .array(
      z.object({
        id: z.string().min(1),
        answer: z.string().trim().max(300).optional(),
        // "decide yourself"
        skipped: z.boolean().optional(),
        // keep it in the channel's knowledge for every later video
        remember: z.boolean().optional(),
      }),
    )
    .min(1),
});
// …and the answer to a proposal (the "Do it" / "No" buttons).
export const decideFromUser = z.object({
  runId: z.string().min(1),
  messageId: z.string().min(1),
  accept: z.boolean(),
});

// The message router's answer (server/agent/prompts/routeMessage.ts): what to
// say back, what the message changes, and whether to ask before doing it.
export const routeFromAi = z.object({
  reply: z.string().trim().min(1).max(500),
  targets: z.array(chatTarget).max(6),
  confirm: z.boolean(),
});

export type ChatTargetKind = z.infer<typeof chatTargetKind>;
export type SceneReviewFromAi = z.infer<typeof sceneReviewFromAi>;
export type ReviewFromAi = z.infer<typeof reviewFromAi>;
export type ReviewInMessage = z.infer<typeof reviewInMessage>;
export type ChatTarget = z.infer<typeof chatTarget>;
export type ChatAttachment = z.infer<typeof chatAttachment>;
export type AgentQuestion = z.infer<typeof agentQuestion>;
export type ChatProposal = z.infer<typeof chatProposal>;
export type ChatMessage = z.infer<typeof chatMessage>;
export type SendMessageFromUser = z.infer<typeof sendMessageFromUser>;
export type DecideFromUser = z.infer<typeof decideFromUser>;
export type AnswerFromUser = z.infer<typeof answerFromUser>;
export type RouteFromAi = z.infer<typeof routeFromAi>;
