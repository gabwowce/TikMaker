import { z } from "zod";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { field, MONO, useBrand, wordFrame } from "../../video/brand/kit";
import type { CodeSceneProps } from "../../video/code/types";
import { CARD, clamp, Headline, popScale, prog, Prompt, Sticker, Terminal } from "./shared";

export const description =
  "In the terminal 'improve this codebase' is typed and the project's file tree lights up folder after folder while a token counter races up";

export const schema = z.object({
  pill: field.text("Strip", "MISTAKE 02"),
  headline: field.text("Headline (*word* – key word)", "*Whole*-repo reads"),
  prompt: field.text("The vague prompt", "improve this codebase"),
  tokens: field.number("Tokens read by the end", 212480, { min: 0 }),
  sticker: field.text("Sticker", "1,284 files read"),
  treeOn: field.word("File tree appears on", "read"),
  promptOn: field.word("Prompt typed on", "Improve"),
  scanOn: field.word("Scan starts on", "makes"),
  stickerOn: field.word("Sticker on", "everything"),
});
type Params = z.infer<typeof schema>;

// The repo: [depth, name, tokens it costs to read].
const TREE: [number, string, string][] = [
  [0, "src/", "18.4k"],
  [1, "components/", "42.1k"],
  [2, "Navbar.tsx", "3.2k"],
  [2, "Pricing.tsx", "6.8k"],
  [1, "pages/", "31.7k"],
  [1, "lib/", "24.9k"],
  [0, "tests/", "27.3k"],
  [0, "public/", "9.6k"],
  [0, "node_modules/", "38.2k"],
  [0, "docs/", "6.1k"],
  [0, "package-lock.json", "4.4k"],
  [0, "README.md", "1.2k"],
];
const ROW_H = 31;

export default function Scene3({ words, durationInFrames, params }: CodeSceneProps<Params>) {
  const frame = useCurrentFrame();
  const c = useBrand();

  const treeAt = wordFrame(words, params.treeOn, 32) - 3;
  const promptAt = wordFrame(words, params.promptOn, 76) - 6;
  const scanAt = wordFrame(words, params.scanOn, 111) - 3;
  const stickerAt = wordFrame(words, params.stickerOn, 133) - 3;

  // From scene 2's recording frame into the terminal.
  const enter = popScale(frame, 0, 0.97);
  const push = interpolate(frame, [0, durationInFrames], [1, 1.03], clamp);
  const float = Math.sin(frame / 22) * 6;

  const scanEnd = Math.max(scanAt + 20, durationInFrames - 8);
  const step = (scanEnd - scanAt) / TREE.length;
  const tokens = interpolate(frame, [scanAt, scanEnd], [0, params.tokens], {
    ...clamp,
    easing: (t) => t * t * 0.4 + t * 0.6,
  });
  const rowIn = prog(frame, scanAt - 4, 10);

  return (
    <AbsoluteFill>
      <Headline pill={params.pill} text={params.headline} />

      <div style={{ position: "absolute", inset: 0, scale: `${push}`, translate: `0px ${float}px` }}>
        <Terminal
          style={{ scale: `${enter}`, opacity: prog(frame, 0, 8) }}
          right={
            <div
              style={{
                fontFamily: MONO,
                fontSize: 24,
                color: frame > scanAt ? c.accent : c.textSoft,
                opacity: 1 - prog(frame, stickerAt, 4),
              }}
            >
              {frame > scanAt ? "● reading…" : "● idle"}
            </div>
          }
        >
          <div
            style={{
              height: 86,
              display: "flex",
              alignItems: "center",
              padding: "0 34px",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Prompt text={params.prompt} typedFrom={promptAt} cps={1.3} cursor={frame < scanAt} />
          </div>
          <div style={{ position: "absolute", left: 40, right: 40, top: 100 }}>
            {TREE.map(([depth, name, cost], i) => {
              const appear = prog(frame, treeAt + i * 2, 8);
              const litAt = scanAt + i * step;
              const lit = prog(frame, litAt, 5);
              const folder = name.endsWith("/");
              return (
                <div
                  key={i}
                  style={{
                    height: ROW_H,
                    display: "flex",
                    alignItems: "center",
                    fontFamily: MONO,
                    fontSize: 26,
                    whiteSpace: "nowrap",
                    opacity: appear * (0.45 + lit * 0.55),
                    translate: `${(1 - appear) * -16}px 0px`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: -14,
                      right: -14,
                      height: ROW_H - 3,
                      borderRadius: 8,
                      background: `rgba(255,112,36,${lit * (1 - prog(frame, litAt + 6, 14)) * 0.35 + lit * 0.06})`,
                    }}
                  />
                  <span style={{ width: depth * 36 }} />
                  <span style={{ width: 34, color: lit > 0.5 ? c.accent : c.textSoft }}>
                    {lit > 0.5 ? "✓" : folder ? "▸" : "·"}
                  </span>
                  <span style={{ color: folder ? c.text : c.textSoft, position: "relative" }}>{name}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      position: "relative",
                      color: c.accent,
                      fontWeight: 700,
                      opacity: lit,
                    }}
                  >
                    +{cost}
                  </span>
                </div>
              );
            })}
          </div>
        </Terminal>

        {/* the token counter racing up */}
        <div
          style={{
            position: "absolute",
            left: CARD.x,
            width: CARD.w,
            top: CARD.y + CARD.h + 20,
            height: 96,
            display: "flex",
            alignItems: "center",
            gap: 24,
            opacity: rowIn,
            translate: `0px ${(1 - rowIn) * 16}px`,
          }}
        >
          <div style={{ fontFamily: c.fontSemi, fontSize: 34, color: c.textSoft }}>tokens read</div>
          <div
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 72,
              color: c.accent,
              scale: `${1 + 0.03 * Math.abs(Math.sin(frame / 2)) * (frame < scanEnd ? 1 : 0)}`,
            }}
          >
            {Math.round(tokens).toLocaleString("en-US")}
          </div>
        </div>
      </div>

      <Sticker
        text={params.sticker}
        at={stickerAt}
        rotate={7}
        size={54}
        style={{ right: 60, top: CARD.y - 8 }}
      />
    </AbsoluteFill>
  );
}
