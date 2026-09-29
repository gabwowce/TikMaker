import type { CaptionWord } from "../schema/project";

// Leaf module (types only): the API server imports it to turn ElevenLabs'
// alignment into words, and must not drag the render graph along.

// ElevenLabs' /with-timestamps alignment: one entry per CHARACTER.
export type CharacterAlignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export function alignmentToWords(alignment: CharacterAlignment): CaptionWord[] {
  const words: CaptionWord[] = [];
  let current: CaptionWord | null = null;
  alignment.characters.forEach((char, i) => {
    if (/\s/.test(char)) {
      if (current) words.push(current);
      current = null;
      return;
    }
    const start = alignment.character_start_times_seconds[i] ?? 0;
    const end = alignment.character_end_times_seconds[i] ?? start;
    if (current) {
      current.text += char;
      current.end = end;
    } else {
      current = { text: char, start, end };
    }
  });
  if (current) words.push(current);
  return words;
}
