import { AbsoluteFill, Sequence } from "remotion";
import { catalogBlocks } from "./catalogBlocks";
import type { StylePack } from "../../agent/stylePack";
import { ensureFontsLoaded } from "../typography/fonts";
import { Backdrop } from "./Backdrop";
import { KineticCaption, phrasesFrom } from "./KineticCaption";
import { PackProvider, usePack } from "./pack";
import { StageBlock } from "./StageBlock";

// The blocks catalogue: every top-zone block and shape in a row, 3 s each,
// with its name at the bottom – drawn through StageBlock, exactly as the
// agent's blocks are. The agent picks from these (docs/motion-planas.md). In
// the Studio – the "StageCatalog" composition; `pack` – the style pack.
const SEGMENT = 90;

// Parts appear 16 frames apart, as if on words.
const parts = (n: number) => Array.from({ length: n }, (_, i) => 6 + i * 16);

const blocks = catalogBlocks;

export const STAGE_CATALOG_FRAMES = blocks.length * SEGMENT;

export function StageCatalog({ pack }: { pack?: StylePack }) {
  return (
    <PackProvider pack={pack}>
      <Catalog />
    </PackProvider>
  );
}

function Catalog() {
  const c = usePack();
  ensureFontsLoaded();
  return (
    <AbsoluteFill style={{ background: c.bg, overflow: "hidden" }}>
      <Backdrop />
      {blocks.map((block, i) => (
        <Sequence key={i} from={i * SEGMENT} durationInFrames={SEGMENT}>
          <StageBlock
            block={{ onWord: "", ...block.block }}
            at={4}
            partAts={parts(4)}
          />
          <KineticCaption phrases={phrasesFrom([block.name], 4, 30)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
