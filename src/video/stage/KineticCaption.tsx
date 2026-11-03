import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { pop, ramp } from "./pop";
import { usePack } from "./pack";
import { stage } from "./tokens";

// Didelis kinetinis tekstas apačioje – tai, kas sakoma (kaip InsiderForce:
// docs/bd/kadrai/insiderforce/). Tekstas eina frazėmis po 3–7 žodžius; kiekvienas
// žodis iššoka tą kadrą, kai ištariamas. Kertiniai žodžiai (strong) – stori ir
// ryškūs, kiti – ploni ir šiek tiek blankesni. Viena frazės dalis gali būti
// „dėžutėje“ (boxed) – šviesus fonas, tamsus tekstas. Nauja frazė pakeičia seną.

export type CaptionWord = {
  text: string;
  at: number; // kadras, kai ištariamas
  strong?: boolean;
  boxed?: boolean;
};
export type CaptionPhrase = { words: CaptionWord[] };

const EXIT_FRAMES = 5;

export function KineticCaption({ phrases }: { phrases: CaptionPhrase[] }) {
  const c = usePack();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {phrases.map((phrase, i) => {
        const start = phrase.words[0].at;
        const next = phrases[i + 1]?.words[0].at ?? Infinity;
        if (frame < start - 2 || frame > next + EXIT_FRAMES) return null;
        // Išėjimas: frazė pakyla ir išblunka per EXIT_FRAMES kadrų
        const out = Number.isFinite(next)
          ? ramp(frame, next - 1, EXIT_FRAMES)
          : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (1080 - stage.contentWidth) / 2,
              width: stage.contentWidth,
              top: stage.captionTop,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "baseline",
              columnGap: "0.24em",
              rowGap: 6,
              fontSize: stage.captionSize * c.widthFactor,
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

// Dėžutė užsipildo iš kairės, kai ištariamas pirmas jos žodis, o žodžiai
// joje iššoka kaip ir kiti.
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

// Pagalbinė: sakinys → žodžiai su laikais. `*žodis*` – kertinis, `[frazė]` –
// dėžutėje. Laikas – pagal kalbėjimo greitį nuo `start` kadro.
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
      // *žodis* arba *žodis*, (skyrybos ženklas po žvaigždutės)
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
