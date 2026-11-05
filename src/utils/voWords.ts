import type { CaptionWord } from "../schema/project";
import { VO_WORDS_PER_SECOND } from "./pacing";

// The words of a voiceover the way the code matches them: lower case, no
// punctuation. One place for it, so the check of the agent's blocks and the
// frames they are drawn on always agree on which word is which.
export function spokenWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}']+/u)
    .filter(Boolean);
}

// Where `word` is said in the voiceover, at or after word number `from`;
// -1 when it is not said there.
export function wordIndex(voiceover: string, word: string, from = 0): number {
  const target = spokenWords(word)[0];
  return target ? spokenWords(voiceover).indexOf(target, from) : -1;
}

// When each spoken word starts (seconds), from a real voiceover's word timings
// – counted the way spokenWords counts, so "five-hour" is two words that both
// start when the voice says it.
export function spokenStarts(words: CaptionWord[]): number[] {
  return words.flatMap((word) => spokenWords(word.text).map(() => word.start));
}

// The frame word number `index` is said on, at the voiceover's pace.
export function wordFrame(index: number, fps: number): number {
  return Math.round((index / VO_WORDS_PER_SECOND) * fps);
}
