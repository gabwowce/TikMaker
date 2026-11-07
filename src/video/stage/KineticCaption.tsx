import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, ramp } from "./pop";
import { usePack } from "./pack";
import { stage } from "./tokens";

// Big kinetic text at the bottom – what is being said (like InsiderForce:
// docs/bd/kadrai/insiderforce/). The text goes in phrases of 3–7 words; every
// word pops in on the frame it is said. Key words (strong) are bold and bright,
// the others thin and a little dimmer. One part of a phrase can be "boxed" – a
// light background, dark text. A new phrase replaces the old one.

export type CaptionWord = {
  text: string;
  at: number; // the frame it is said on
  strong?: boolean;
  boxed?: boolean;
};
// `top` and `scale` – where the stage type puts the captions (stageTypes.ts);
// unset – the "top" type's place.
export type CaptionPhrase = {
  words: CaptionWord[];
  top?: number;
  scale?: number;
};

const EXIT_FRAMES = 5;
const GLIDE_FRAMES = 10;

// Between two values (unset – `fallback`, the "top" type's), `t` of the way.
function mix(
  a: number | undefined,
  b: number | undefined,
  t: number,
  fallback: number,
) {
  const from = a ?? fallback;
  return from + ((b ?? fallback) - from) * t;
}

export function KineticCaption({ phrases }: { phrases: CaptionPhrase[] }) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {phrases.map((phrase, i) => {
        const start = phrase.words[0].at;
        // A new stage type puts the captions elsewhere: the phrase glides there
        // from where the previous one stood instead of jumping.
        const before = phrases[i - 1];
        const move = ramp(frame, start - 2, GLIDE_FRAMES);
        const top = mix(
          before?.top ?? phrase.top,
          phrase.top,
          move,
          stage.captionTop,
        );
        const scale = mix(before?.scale ?? phrase.scale, phrase.scale, move, 1);
        const next = phrases[i + 1]?.words[0].at ?? Infinity;
        // Gone by the frame the next phrase's first word pops in: both stand
        // in the same place, and a phrase still fading under the new one read
        // as two lines on top of each other (test 10).
        if (frame < start - 2 || frame >= next) return null;
        // Exit: the phrase rises and fades over the EXIT_FRAMES frames before
        // the next one starts
        const out = Number.isFinite(next)
          ? ramp(frame, next - EXIT_FRAMES, EXIT_FRAMES)
          : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (1080 - stage.contentWidth) / 2,
              width: stage.contentWidth,
              top,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              columnGap: "0.24em",
              rowGap: 6,
              fontSize: stage.captionSize * c.widthFactor * scale,
              lineHeight: stage.captionLine,
              letterSpacing: "-0.025em",
              opacity: 1 - out,
              transform: `translateY(${-24 * out}px)`,
            }}
          >
            {groupBoxed(phrase.words).map((group, g) =>
              group.boxed ? (
                <BoxedGroup
                  key={g}
                  words={group.words}
                  frame={frame}
                  fps={fps}
                />
              ) : (
                group.words.map((word, w) => (
                  <Word key={`${g}-${w}`} word={word} frame={frame} fps={fps} />
                ))
              ),
            )}
          </div>
        );
      })}
    </>
  );
}

function Word({
  word,
  frame,
  fps,
  onBox,
}: {
  word: CaptionWord;
  frame: number;
  fps: number;
  onBox?: boolean;
}) {
  const c = usePack();
  const p = pop(frame, word.at, fps);
  const scale = interpolate(p, [0, 1], [0.8, 1]);
  const y = interpolate(p, [0, 1], [22, 0]);
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: word.strong ? c.fontStrong : c.fontRegular,
        color: onBox ? c.bg : word.strong ? c.text : c.textSoft,
        opacity: Math.min(1, p * 2),
        transform: `translateY(${y}px) scale(${scale})`,
        transformOrigin: "50% 80%",
      }}
    >
      {word.text}
    </span>
  );
}

// The box fills from the left when its first word is said, and the words in
// it pop in like the others.
function BoxedGroup({
  words,
  frame,
  fps,
}: {
  words: CaptionWord[];
  frame: number;
  fps: number;
}) {
  const c = usePack();
  const fill = ramp(frame, words[0].at - 2, 7);
  const punch = interpolate(pop(frame, words[0].at, fps), [0, 1], [0.94, 1]);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        columnGap: "0.24em",
        padding: "0.02em 0.28em 0.1em",
        transform: `scale(${punch})`,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          background: c.text,
          borderRadius: 10,
          transformOrigin: "left center",
          transform: `scaleX(${fill})`,
          boxShadow: "0 18px 40px rgba(0,0,0,0.5)",
        }}
      />
      {words.map((word, i) => (
        <span key={i} style={{ position: "relative" }}>
          <Word
            word={{ ...word, strong: true }}
            frame={frame}
            fps={fps}
            onBox
          />
        </span>
      ))}
    </span>
  );
}

function groupBoxed(words: CaptionWord[]) {
  const groups: { boxed: boolean; words: CaptionWord[] }[] = [];
  for (const word of words) {
    const boxed = Boolean(word.boxed);
    const last = groups[groups.length - 1];
    if (last && last.boxed === boxed && boxed) last.words.push(word);
    else groups.push({ boxed, words: [word] });
  }
  return groups;
}

// Helper: a sentence → words with times. `*word*` – a key word, `[phrase]` –
// boxed. Times follow the speaking rate from the `start` frame.
export function phrasesFrom(
  lines: string[],
  start: number,
  fps: number,
  wordsPerSecond = 3.2,
): CaptionPhrase[] {
  let index = 0;
  return lines.map((line) => {
    let boxed = false;
    const words: CaptionWord[] = [];
    for (const raw of line.split(/\s+/).filter(Boolean)) {
      let text = raw;
      if (text.startsWith("[")) {
        boxed = true;
        text = text.slice(1);
      }
      const closes = text.endsWith("]");
      if (closes) text = text.slice(0, -1);
      // *word* or *word*, (a punctuation mark after the asterisk)
      const marked = /^\*(.+)\*([,.!?;:]*)$/.exec(text);
      const strong = Boolean(marked);
      if (marked) text = marked[1] + marked[2];
      words.push({
        text,
        strong,
        boxed,
        at: start + Math.round((index / wordsPerSecond) * fps),
      });
      index++;
      if (closes) boxed = false;
    }
    return { words };
  });
}
