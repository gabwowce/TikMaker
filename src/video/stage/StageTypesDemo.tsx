import { AbsoluteFill, Sequence } from "remotion";
import type { BlockFromAi } from "../../agent/run/4-blocks";
import type { StylePack } from "../../agent/stylePack";
import { ensureFontsLoaded } from "../typography/fonts";
import { KineticCaption, phrasesFrom } from "./KineticCaption";
import { PackProvider, usePack } from "./pack";
import { StageBlock, StageZone } from "./StageBlock";
import { Backdrop } from "./Backdrop";
import { STAGE_LAYOUTS, type StageType } from "./stageTypes";

// The five stage types one after another, 4 s each, with sample blocks and
// kinetic captions placed the way each type places them. In the Studio – the
// "StageTypes" composition; `pack` – the style pack.
const SEGMENT = 120;

const samples: { type: StageType; blocks: BlockFromAi[]; line: string }[] = [
  {
    type: "top",
    blocks: [{ onWord: "", kind: "logos", ids: ["claude", "github", "figma"] }],
    line: "*Top:* the picture above, the words *below*",
  },
  {
    type: "bottom",
    blocks: [
      {
        onWord: "",
        kind: "list",
        items: ["Pick a tool", "Check the result", "Move on"],
      },
    ],
    line: "*Bottom:* the words on *top* this time",
  },
  {
    type: "statement",
    blocks: [],
    line: "*Statement:* one big [*phrase*] and nothing else",
  },
  {
    type: "full",
    blocks: [{ onWord: "", kind: "screen", text: "Your recording here" }],
    line: "*Full:* the picture fills the *frame*",
  },
  {
    type: "split",
    blocks: [
      { onWord: "", kind: "terminal", lines: ["npm run build", "Done in 2s"] },
      {
        onWord: "",
        kind: "code",
        file: "build.ts",
        lines: ["export const build = {", "+ fast: true,", "};"],
      },
    ],
    line: "*Split:* two pictures, *before* and *after*",
  },
];

export const STAGE_TYPES_FRAMES = samples.length * SEGMENT;

export function StageTypes({ pack }: { pack?: StylePack }) {
  return (
    <PackProvider pack={pack}>
      <Types />
    </PackProvider>
  );
}

function Types() {
  const c = usePack();
  ensureFontsLoaded();
  return (
    <AbsoluteFill style={{ background: c.bg, overflow: "hidden" }}>
      <Backdrop />
      {samples.map((sample, i) => {
        const layout = STAGE_LAYOUTS[sample.type];
        return (
          <Sequence
            key={sample.type}
            from={i * SEGMENT}
            durationInFrames={SEGMENT}
          >
            {sample.type === "full" ? (
              <StageBlock block={sample.blocks[0]} at={6} full />
            ) : null}
            {layout.visuals.map((place, v) =>
              sample.blocks[v] && sample.type !== "full" ? (
                <StageZone key={v} place={place}>
                  <StageBlock block={sample.blocks[v]} at={6 + v * 10} />
                </StageZone>
              ) : null,
            )}
            <KineticCaption
              phrases={phrasesFrom([sample.line], 4, 30).map((phrase) => ({
                ...phrase,
                ...layout.caption,
              }))}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
