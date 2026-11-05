import { Loader } from "@mantine/core";
import type { AgentRun } from "../../agent/run/run";

// 5 Result in the conversation: the voiceover, scene by scene while it is
// being made (the voice step saves after every scene), then how many scenes
// got one. Only when the form asked for a voiceover.
export function VoiceCard({ run }: { run: AgentRun }) {
  if (!run.input.generateVoice) return null;
  const total = run.script?.scenes.length ?? 0;
  const done = run.voice?.scenes.length ?? 0;
  if (run.status === "generating_voice") {
    return (
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3 text-xs">
        <Loader size={12} />
        Voicing scene {Math.min(done + 1, total)} of {total}…
      </div>
    );
  }
  if (!done) return null;
  return (
    <div className="rounded-2xl rounded-bl-none border border-solid border-editor-border p-3 text-xs text-editor-muted">
      <span className="text-green-400">✓</span> Voiceover · {done} of {total}{" "}
      scenes
    </div>
  );
}
