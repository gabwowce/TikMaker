import { ActionIcon, Button, Textarea } from "@mantine/core";
import { useMemo, useState } from "react";
import type { ChatAttachment } from "../../agent/run/7-chat";
import type { AgentRun } from "../../agent/run/run";
import { talking, useSendMessage } from "../../api/agent";
import { useProjectStore } from "../state/projectStore";
import { parseSelection } from "../timeline/selectionId";

// 7 The conversation: the message box at the bottom of the agent panel, as in
// Claude Code. What is selected in the editor – a scene of the agent's, or a
// layer in it – shows above it as a chip and goes with the message, so the
// agent knows what it is about; a chip can be taken off (×). "Send" only
// sends: confirming anything stays on the cards' own buttons.
export function ChatInput({ run }: { run: AgentRun }) {
  const send = useSendMessage();
  const [text, setText] = useState("");
  // chips the user took off, until the selection changes
  const [dismissed, setDismissed] = useState<string[]>([]);
  const attachments = useSelectedAttachments(run).filter(
    (attachment) => !dismissed.includes(attachment.label),
  );

  // A message can be written at any time: while the agent works it waits in
  // a queue and is taken up when the agent stops, one at a time, oldest
  // first. Only a stopped run takes none.
  const open = run.status !== "error" && run.status !== "cancelled";
  const busy = !open || send.isPending;
  const hint = !open
    ? "This run has stopped – start a new one"
    : talking(run)
      ? "Write more – it waits in line after your last message"
      : run.status === "awaiting_hook"
        ? "Want different hooks? Say how"
        : run.status === "awaiting_approval"
          ? "What to change in the script, or the hook?"
          : run.status === "done"
            ? "What to change? Select a scene or a layer to point at it"
            : run.status === "awaiting_answers"
              ? "Answer the agent's questions above – or type your answer here"
              : run.status === "paused"
              ? "Paused at the usage limit – write now, it takes it up after Continue"
              : run.status === "reviewing"
              ? "The agent is checking its frames – write now, it takes it up after"
              : "Write now – the agent takes it up when it stops";

  return (
    <div className="flex flex-col gap-2 border-0 border-t border-solid border-editor-border p-3">
      {attachments.length ? (
        <div className="flex flex-wrap gap-1">
          {attachments.map((attachment) => (
            <span
              key={attachment.label}
              className="flex items-center gap-1 rounded-full border border-solid border-editor-border pl-2 text-[11px] text-editor-text"
            >
              📎 {attachment.label}
              <ActionIcon
                size="xs"
                variant="subtle"
                aria-label={`Remove ${attachment.label}`}
                onClick={() => setDismissed([...dismissed, attachment.label])}
              >
                ×
              </ActionIcon>
            </span>
          ))}
        </div>
      ) : null}
      <Textarea
        placeholder={hint}
        autosize
        minRows={1}
        maxRows={6}
        maxLength={1000}
        value={text}
        disabled={busy}
        onChange={(event) => setText(event.currentTarget.value)}
      />
      <div className="flex items-center justify-between gap-2">
        {send.error ? (
          <span className="text-[11px] text-red-400">{send.error.message}</span>
        ) : run.status === "done" ? (
          // the same message anyone could type: the router sends it to the
          // review, which renders frames and proposes what to fix
          <Button
            size="xs"
            variant="subtle"
            disabled={busy}
            onClick={() =>
              send.mutate({
                runId: run.id,
                text: "Review the frames of the video and tell me what to fix",
              })
            }
          >
            Review frames
          </Button>
        ) : (
          <span />
        )}
        <Button
          size="xs"
          variant="default"
          disabled={busy || text.trim().length < 2}
          loading={send.isPending}
          onClick={() =>
            send.mutate(
              {
                runId: run.id,
                text: text.trim(),
                ...(attachments.length ? { attachments } : {}),
              },
              {
                onSuccess: () => {
                  setText("");
                  setDismissed([]);
                },
              },
            )
          }
        >
          Send
        </Button>
      </div>
    </div>
  );
}

// What is selected in the editor, as attachments: the agent's scene that is
// open ("Scene 3"), and the layer selected in it ("Layer: chat"). Scenes not
// made by this run are not attached – the agent knows nothing about them.
function useSelectedAttachments(run: AgentRun): ChatAttachment[] {
  const project = useProjectStore((s) => s.project);
  const selectedSceneId = useProjectStore((s) => s.selectedSceneId);
  const selectedObjectId = useProjectStore((s) => s.selectedObjectId);
  return useMemo(() => {
    const prefix = `scene-${run.id}-`;
    const { sceneId, objectId } = selectedObjectId
      ? parseSelection(selectedObjectId)
      : { sceneId: null, objectId: "" };
    const id = sceneId ?? selectedSceneId;
    if (!id?.startsWith(prefix)) return [];
    const sceneIndex = Number(id.slice(prefix.length)) - 1;
    if (!Number.isInteger(sceneIndex) || sceneIndex < 0) return [];
    const scene = project.scenes.find((s) => s.id === id);
    const out: ChatAttachment[] = [
      { sceneIndex, label: `Scene ${sceneIndex + 1}` },
    ];
    // a visual layer: "visual-<layer id>"
    if (objectId.startsWith("visual-")) {
      const layerId = objectId.slice("visual-".length);
      const layer = scene?.content.visuals?.find((v) => v.id === layerId);
      if (layer) {
        out.push({
          sceneIndex,
          objectId: layerId,
          label: `Layer: ${layer.visual.type}`,
        });
      }
    }
    return out;
  }, [run.id, project, selectedSceneId, selectedObjectId]);
}
