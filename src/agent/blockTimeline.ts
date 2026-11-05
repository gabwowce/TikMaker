import { wordIndex } from "../utils/voWords";

// When and where every block of a scene is on screen – one place for it, so
// the project the editor builds (projectFromBlocks) and the check of the
// agent's motion (checkMotion) always agree on the same frames.

export type BlockSlot = {
  word: number; // which spoken word it appears on (-1: not said)
  start: number; // frame it appears on
  leaves: number; // frame the next block in its place arrives (or the end)
  zone: number; // which of the stage type's places it is in
};

// `frameOf` turns a spoken word's number into a frame (real word timings,
// or the voiceover's pace). "split" has two places: blocks take turns
// between them, so a block leaves when the block two after it arrives.
export function blockTimeline(
  voiceover: string,
  onWords: string[],
  places: number,
  end: number,
  frameOf: (word: number) => number,
): BlockSlot[] {
  let from = 0;
  const found = onWords.map((onWord) => {
    const word = wordIndex(voiceover, onWord, from);
    if (word !== -1) from = word + 1;
    return { word, start: word === -1 ? 0 : frameOf(word) };
  });
  const turns = Math.max(1, places);
  return found.map((slot, i) => ({
    ...slot,
    leaves: found[i + turns]?.start ?? end,
    zone: i % turns,
  }));
}
