import { Button, Checkbox, TextInput } from "@mantine/core";
import { useState } from "react";
import type { ChatMessage } from "../../agent/run/7-chat";
import type { AgentRun } from "../../agent/run/run";
import { useAnswer } from "../../api/agent";

// 3 The agent asks (docs/pokalbis-planas.md, 3.2): its questions inside its
// message. Every question: why it asks, the options as buttons, a field for
// an answer of your own, and "remember" – keep the answer in the channel's
// knowledge for every later video. "Decide yourself" sends the questions back
// unanswered and the agent goes on with what it assumes. Once answered, the
// card shows the answers.
type Draft = { answer: string; remember: boolean };

export function QuestionsCard({
  run,
  message,
}: {
  run: AgentRun;
  message: ChatMessage;
}) {
  const answer = useAnswer();
  const questions = message.questions ?? [];
  const open =
    run.status === "awaiting_answers" &&
    questions.some((q) => !q.answer && !q.skipped);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const draft = (id: string): Draft =>
    drafts[id] ?? { answer: "", remember: false };
  const set = (id: string, change: Partial<Draft>) =>
    setDrafts({ ...drafts, [id]: { ...draft(id), ...change } });

  if (!open)
    return (
      <ul className="m-0 flex flex-col gap-1 pl-4">
        {questions.map((q) => (
          <li key={q.id}>
            {q.question}{" "}
            <span className="text-editor-muted">
              →{" "}
              {q.answer ? (
                <span className="text-editor-text">{q.answer}</span>
              ) : (
                "the agent decides"
              )}
              {q.remember ? " · remembered" : ""}
            </span>
          </li>
        ))}
      </ul>
    );

  const send = (skip: boolean) =>
    answer.mutate({
      runId: run.id,
      messageId: message.id,
      answers: questions.map((q) => ({
        id: q.id,
        ...(skip || !draft(q.id).answer.trim()
          ? { skipped: true }
          : { answer: draft(q.id).answer.trim(), remember: draft(q.id).remember }),
      })),
    });

  return (
    <div className="flex flex-col gap-3">
      {questions.map((q) => (
        <div key={q.id} className="flex flex-col gap-1.5">
          <span className="font-semibold">{q.question}</span>
          <span className="text-[11px] text-editor-muted">{q.why}</span>
          {q.options?.length ? (
            <div className="flex flex-wrap gap-1">
              {q.options.map((option) => (
                <Button
                  key={option}
                  size="compact-xs"
                  variant={draft(q.id).answer === option ? "filled" : "default"}
                  onClick={() => set(q.id, { answer: option })}
                >
                  {option}
                </Button>
              ))}
            </div>
          ) : null}
          <TextInput
            size="xs"
            placeholder={q.options?.length ? "…or your own answer" : "Your answer"}
            value={draft(q.id).answer}
            onChange={(event) => set(q.id, { answer: event.currentTarget.value })}
          />
          <Checkbox
            size="xs"
            label="Remember for every video of this channel"
            checked={draft(q.id).remember}
            onChange={(event) =>
              set(q.id, { remember: event.currentTarget.checked })
            }
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button size="xs" loading={answer.isPending} onClick={() => send(false)}>
          Answer
        </Button>
        <Button
          size="xs"
          variant="default"
          disabled={answer.isPending}
          onClick={() => send(true)}
        >
          Decide yourself
        </Button>
        {answer.error ? (
          <span className="text-red-400">{answer.error.message}</span>
        ) : null}
      </div>
    </div>
  );
}
