import type { AgentRun } from "../../agent/run/run";
import { WorkingLine } from "./WorkingLine";

// 4 Voice in the conversation: the voiceover, scene by scene while it is
// being made (the voice step saves after every scene), then how many scenes
// got one. Only when the form asked for a voiceover.
export function VoiceCard({ run }: { run: AgentRun }) {
  if (!run.input.generateVoice) return null;
  const total = run.script?.scenes.length ?? 0;
  const done = run.voice?.scenes.length ?? 0;
  if (run.status === "generating_voice") {
    return (
      <WorkingLine run={run}>
        Voicing scene {Math.min(done + 1, total)} of {total}…
      </WorkingLine>
    );
  }
  if (!done) return null;
  // ElevenLabs is not a language model: it counts characters, not tokens.
  const characters = (run.script?.scenes ?? [])
    .slice(0, done)
    .reduce((sum, scene) => sum + scene.voiceover.length, 0);
  const seconds = (run.voice?.scenes ?? []).reduce(
    (sum, scene) => sum + (scene.words[scene.words.length - 1]?.end ?? 0),
    0,
  );
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl rounded-bl-none border border-solid border-editor-border p-3 text-xs text-editor-muted">
      <span>
        <span className="text-green-400">✓</span> Voiceover · {done} of {total}{" "}
        scenes
      </span>
      <span className="pl-4 text-[11px]">
        {characters} characters · {seconds.toFixed(1)} s of voice
      </span>
    </div>
  );
}
