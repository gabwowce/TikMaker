import { Button, Loader } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { ChatMessage, ChatTarget } from "../../agent/run/7-chat";
import type { AgentRun } from "../../agent/run/run";
import { useDecide } from "../../api/agent";
import { loadCustomSfx } from "../../api/library";
import { useProjectStore } from "../state/projectStore";
import { ReviewView } from "./ReviewView";

// 7 The conversation, under the step cards, oldest first: the user's messages
// (with what was attached and how far the agent is), the agent's answers, and
// its proposals with the "Do it" / "No" buttons – the only way a proposal is
// accepted. Work the agent finishes is applied to the project here, scene by
// scene, so changes made by hand to other scenes stay.
export function ChatMessages({ run }: { run: AgentRun }) {
  const applyScene = useProjectStore((s) => s.applyAgentSceneEdit);
  const applyAll = useProjectStore((s) => s.applyAgentBlocks);
  const apply = (targets: ChatTarget[]) => applyTargets(run, targets);

  // Applies what the targets changed: one scene at a time; the whole video's
  // motion rebuilds every scene. A scene with new words has a new voice clip
  // the editor must learn about first.
  async function applyTargets(run: AgentRun, targets: ChatTarget[]) {
    if (targets.some((target) => target.kind === "words"))
      await loadCustomSfx();
    if (
      targets.some(
        (target) => target.kind === "motion" && target.sceneIndex === undefined,
      )
    )
      return applyAll(run);
    for (const scene of changedScenes(targets)) applyScene(run, scene);
  }

  // Work the panel saw being done is applied once when it is done. Work that
  // finished while the editor was closed is offered with a button instead –
  // applying it unasked could overwrite a scene changed by hand since.
  const watching = useRef(new Set<string>());
  useEffect(() => {
    for (const message of run.messages ?? []) {
      if (message.status === "waiting" || message.status === "working")
        watching.current.add(message.id);
      else if (message.status === "done" && watching.current.has(message.id)) {
        watching.current.delete(message.id);
        void applyTargets(run, message.targets ?? []);
      } else watching.current.delete(message.id);
    }
    // applyTargets reads only the store's actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const messages = run.messages ?? [];
  if (!messages.length) return null;
  return (
    <div className="flex flex-col gap-3">
      {messages.map((message) =>
        message.from === "user" ? (
          <UserMessage key={message.id} message={message} onApply={apply} />
        ) : (
          <AgentMessage
            key={message.id}
            run={run}
            message={message}
            onApply={apply}
          />
        ),
      )}
    </div>
  );
}

// The scenes the project needs rebuilt after these targets.
function changedScenes(targets: ChatTarget[]): number[] {
  return [
    ...new Set(
      targets.flatMap((target) =>
        target.kind !== "hook" &&
        target.kind !== "script" &&
        target.sceneIndex !== undefined
          ? [target.sceneIndex]
          : [],
      ),
    ),
  ];
}

// A target in a few words, for a proposal.
function describe(target: ChatTarget): string {
  const scene =
    target.sceneIndex !== undefined ? ` · scene ${target.sceneIndex + 1}` : "";
  const what = {
    hook: "New hooks",
    script: "Script",
    pictures: "Pictures",
    motion: target.sceneIndex === undefined ? "Motion · whole video" : "Motion",
    words: "Words + voice",
    review: "Review the frames",
  }[target.kind];
  return `${what}${scene}${target.instruction ? ` – ${target.instruction}` : ""}`;
}

function WorkStatus({
  message,
  onApply,
}: {
  message: ChatMessage;
  onApply: (targets: ChatTarget[]) => void;
}) {
  if (message.status === "waiting" || message.status === "working")
    return (
      <span className="flex items-center gap-2 text-[11px] text-editor-muted">
        <Loader size={10} />
        {message.status === "waiting"
          ? "Waiting for the agent…"
          : "The agent is on it…"}
      </span>
    );
  if (message.status === "error")
    return <span className="text-[11px] text-red-400">{message.error}</span>;
  const scenes = changedScenes(message.targets ?? []);
  if (message.status === "done" && scenes.length)
    return (
      <button
        type="button"
        className="cursor-pointer self-start border-0 bg-transparent p-0 text-[11px] text-editor-accent underline"
        onClick={() => onApply(message.targets ?? [])}
      >
        apply {scenes.map((n) => `scene ${n + 1}`).join(", ")} again
      </button>
    );
  return null;
}

function UserMessage({
  message,
  onApply,
}: {
  message: ChatMessage;
  onApply: (targets: ChatTarget[]) => void;
}) {
  return (
    <div className="ml-6 flex flex-col gap-1 rounded-2xl rounded-br-none bg-editor-panel-raised px-3 py-2">
      {message.attachments?.length ? (
        <div className="flex flex-wrap gap-1">
          {message.attachments.map((attachment, i) => (
            <span
              key={i}
              className="rounded-full border border-solid border-editor-border px-2 text-[11px] text-editor-muted"
            >
              📎 {attachment.label}
            </span>
          ))}
        </div>
      ) : null}
      <span className="text-sm text-editor-text">{message.text}</span>
      <WorkStatus message={message} onApply={onApply} />
    </div>
  );
}

function AgentMessage({
  run,
  message,
  onApply,
}: {
  run: AgentRun;
  message: ChatMessage;
  onApply: (targets: ChatTarget[]) => void;
}) {
  const decide = useDecide();
  const proposal = message.proposal;
  return (
    <div className="flex flex-col gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3 text-xs text-editor-text">
      {message.review ? (
        <ReviewView review={message.review} />
      ) : (
        <span className="whitespace-pre-line">{message.text}</span>
      )}
      {proposal ? (
        <>
          <ul className="m-0 flex flex-col gap-1 pl-4 text-editor-muted">
            {proposal.targets.map((target, i) => (
              <li key={i}>{describe(target)}</li>
            ))}
          </ul>
          {proposal.decision ? (
            <span className="text-[11px] text-editor-muted">
              {proposal.decision === "yes" ? "✓ Accepted" : "Declined"}
            </span>
          ) : (
            <div className="flex gap-2">
              <Button
                size="xs"
                loading={decide.isPending}
                onClick={() =>
                  decide.mutate({
                    runId: run.id,
                    messageId: message.id,
                    accept: true,
                  })
                }
              >
                Do it
              </Button>
              <Button
                size="xs"
                variant="default"
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({
                    runId: run.id,
                    messageId: message.id,
                    accept: false,
                  })
                }
              >
                No
              </Button>
            </div>
          )}
          <WorkStatus message={message} onApply={onApply} />
        </>
      ) : null}
    </div>
  );
}
