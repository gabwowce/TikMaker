import {
  Button,
  Checkbox,
  NativeSelect,
  NumberInput,
  Textarea,
} from "@mantine/core";
import { useState } from "react";
import { agentRunInputSchema } from "../../agent/agentRun";
import { useStartRun, useTemplates } from "../../api/agent";
// The first thing the agent needs: what the video is about. Everything else
// has a default (agentRunInputSchema), so the form stays one box and a button.
export function IdeaForm({ projectId }: { projectId: string }) {
  const [idea, setIdea] = useState("");
  const [targetSeconds, setTargetSeconds] = useState(40);
  const [withFace, setWithFace] = useState(false);
  const [generateVoice, setGenerateVoice] = useState(false);
  // "" = let the AI pick (FR-04); a template id = use that one, no AI call.
  const [videoTemplateId, setVideoTemplateId] = useState("");
  const { data: templates = [] } = useTemplates();
  const chosen = templates.find((t) => t.id === videoTemplateId);
  const start = useStartRun(() => setIdea(""));
  // The same schema the server checks, so the button is never enabled for
  // something the server would refuse.
  const input = agentRunInputSchema.safeParse({
    idea,
    workspaceId: "dev",
    targetSeconds,
    withFace,
    generateVoice,
    videoTemplateId: videoTemplateId || undefined,
  });

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        label="Video idea"
        description="One problem the video solves, 20–500 characters"
        placeholder="How to undo the last git commit in a few seconds"
        autosize
        minRows={3}
        value={idea}
        onChange={(event) => setIdea(event.currentTarget.value)}
      />
      <NumberInput
        label="Length, seconds"
        min={15}
        max={90}
        value={targetSeconds}
        onChange={(value) => setTargetSeconds(Number(value) || 40)}
      />
      <NativeSelect
        label="Template"
        description={
          chosen?.oneLine ?? "The AI picks the one that fits the idea"
        }
        value={videoTemplateId}
        onChange={(event) => setVideoTemplateId(event.currentTarget.value)}
        data={[
          { value: "", label: "✦ Let the AI pick" },
          ...templates.map((t) => ({ value: t.id, label: t.name })),
        ]}
      />
      <Checkbox
        label="With face"
        description="Someone appears on camera; off = a faceless video"
        checked={withFace}
        onChange={(event) => setWithFace(event.currentTarget.checked)}
        classNames={{
          description: "text-[10px]",
        }}
      />
      <Checkbox
        label="Generate the voiceover"
        checked={generateVoice}
        onChange={(event) => setGenerateVoice(event.currentTarget.checked)}
        classNames={{
          description: "text-[10px]",
        }}
      />
      <Button
        disabled={!input.success}
        loading={start.isPending}
        onClick={() =>
          input.success && start.mutate({ projectId, input: input.data })
        }
      >
        ✦ Start
      </Button>
      {start.error ? (
        <p className="m-0 text-xs text-red-400">{start.error.message}</p>
      ) : null}
    </div>
  );
}
