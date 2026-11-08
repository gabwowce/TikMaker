import type { VoiceInRun } from "../../../src/agent/run/5-voice.js";
import { generateVoice } from "../../voice.js";
import type { Job } from "../job.js";

// 5 Result: every scene's voiceover from ElevenLabs. Code, not AI – the text
// is the approved script's. Saved after each scene, so the panel can show the
// progress and a failure keeps the scenes already voiced.
export async function step5Voice(job: Job): Promise<void> {
  const scenes = job.run.script?.scenes ?? [];
  const voiced: VoiceInRun["scenes"] = [];
  for (const [index, scene] of scenes.entries()) {
    // the scenes around it, so the voice runs on as one voiceover
    const clip = await generateVoice(
      scene.voiceover,
      `${job.run.id} scene ${index + 1}`,
      {},
      voiceAround(scenes, index),
    );
    voiced.push({ sfxId: clip.id, words: clip.words });
    await job.save({ voice: { scenes: voiced } });
  }
}

// What is said just before and after scene `n` (ElevenLabs' previous_text /
// next_text).
export function voiceAround(
  scenes: { voiceover: string }[],
  n: number,
): { previous?: string; next?: string } {
  return {
    ...(scenes[n - 1] ? { previous: scenes[n - 1].voiceover } : {}),
    ...(scenes[n + 1] ? { next: scenes[n + 1].voiceover } : {}),
  };
}
